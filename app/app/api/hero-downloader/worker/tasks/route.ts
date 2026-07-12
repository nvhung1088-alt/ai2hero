import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { downloaderProjects, downloaderVideos, downloaderSettings, downloaderCookies } from '@/lib/db/schema';
import { eq, and, isNull, lt, asc, desc, inArray, notInArray, or, notLike, isNotNull } from 'drizzle-orm';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

const authSecret = process.env.AUTH_SECRET;
const key = new TextEncoder().encode(authSecret);

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      const { payload: verified } = await jwtVerify(token, key);
      payload = verified;
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const teamId = payload.teamId as number;

    const urlObj = new URL(request.url);
    const activeStr = urlObj.searchParams.get('active') || '';
    const activeIds = activeStr ? activeStr.split(',').map(Number).filter(Boolean) : [];

    // Reset stuck downloading videos
    const stuckVideos = await db
      .select({ id: downloaderVideos.id })
      .from(downloaderVideos)
      .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
      .where(
        and(
          eq(downloaderProjects.teamId, teamId),
          eq(downloaderVideos.status, 'downloading'),
          activeIds.length > 0 ? notInArray(downloaderVideos.id, activeIds) : undefined
        )
      );

    if (stuckVideos.length > 0) {
      const stuckIds = stuckVideos.map(v => v.id);
      await db
        .update(downloaderVideos)
        .set({ status: 'pending', progress: 0, updatedAt: new Date() })
        .where(inArray(downloaderVideos.id, stuckIds));
      console.log(`[API Downloader Worker Tasks] Reset ${stuckIds.length} stuck downloading tasks to pending:`, stuckIds);
    }

    // Fetch settings
    const [settings] = await db.select().from(downloaderSettings).where(eq(downloaderSettings.teamId, teamId)).limit(1);
    const maxConcurrentDownloads = settings?.maxConcurrentDownloads || 3;
    const maxScanVideos = settings?.maxConcurrentScans || 5;

function getScanIntervalMs(intervalStr: string): number {
  if (!intervalStr) return 60 * 60 * 1000; // default 1 hour
  const s = intervalStr.toLowerCase();
  if (s.includes('1 giờ')) return 1 * 60 * 60 * 1000;
  if (s.includes('6 giờ')) return 6 * 60 * 60 * 1000;
  if (s.includes('12 giờ')) return 12 * 60 * 60 * 1000;
  if (s.includes('24 giờ') || s.includes('1 ngày')) return 24 * 60 * 60 * 1000;
  if (s.includes('2 ngày')) return 2 * 24 * 60 * 60 * 1000;
  if (s.includes('7 ngày')) return 7 * 24 * 60 * 60 * 1000;
  if (s.includes('không quét')) return 999 * 365 * 24 * 60 * 60 * 1000; // effectively never
  return 60 * 60 * 1000;
}

    // Lấy công việc Scan (Dự án có status='active')
    const scanTasksQuery = await db
      .select()
      .from(downloaderProjects)
      .where(
        and(
          eq(downloaderProjects.teamId, teamId),
          eq(downloaderProjects.status, 'active')
        )
      )
      .limit(10); // Lấy 10 dự án ra xem

    // Lọc thủ công project cần quét và gán maxScanVideos
    const pendingScansList = scanTasksQuery
      .filter(p => {
        // Douyin projects MUST be scanned by the Chrome Extension.
        if (p.platform === 'douyin') {
          return false;
        }

        const settings = p.settings as any || {};
        const scanInterval = settings.scanInterval || 'Mỗi 1 giờ';
        const intervalMs = getScanIntervalMs(scanInterval);

        const lastScan = p.lastScanAt ? new Date(p.lastScanAt).getTime() : 0;
        const needsScan = (Date.now() - lastScan) >= intervalMs;
        return needsScan;
      })
      .map(p => ({ 
        ...p, 
        maxScanVideos: (p.settings as any)?.maxScanVideos || maxScanVideos,
        recentUrls: [] as string[]
      }));

    // Lấy 100 URL gần nhất của mỗi dự án để Worker tự động dừng (break-on-existing)
    for (let i = 0; i < pendingScansList.length; i++) {
      const recent = await db.select({ videoUrl: downloaderVideos.videoUrl })
        .from(downloaderVideos)
        .where(eq(downloaderVideos.projectId, pendingScansList[i].id))
        .orderBy(desc(downloaderVideos.createdAt))
        .limit(100);
      pendingScansList[i].recentUrls = recent.map(r => r.videoUrl);
    }

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    // Fetch force_pending videos (bypass concurrency limits)
    const forcePendingVideos = await db
      .select({
        id: downloaderVideos.id,
        projectId: downloaderVideos.projectId,
        videoUrl: downloaderVideos.videoUrl,
        title: downloaderVideos.title,
        status: downloaderVideos.status,
        author: downloaderVideos.author,
        platform: downloaderProjects.platform,
        directMp4Url: downloaderVideos.directMp4Url,
        thumbnailUrl: downloaderVideos.thumbnailUrl,
      })
      .from(downloaderVideos)
      .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
      .where(
        and(
          eq(downloaderProjects.teamId, teamId),
          eq(downloaderVideos.status, 'force_pending'),
          or(
            notLike(downloaderVideos.videoUrl, '%douyin.com%'),
            isNotNull(downloaderVideos.directMp4Url),
            lt(downloaderVideos.updatedAt, twoMinutesAgo)
          )
        )
      )
      .orderBy(asc(downloaderVideos.createdAt));

    // Fetch normal pending videos
    const normalPendingVideos = await db
      .select({
        id: downloaderVideos.id,
        projectId: downloaderVideos.projectId,
        videoUrl: downloaderVideos.videoUrl,
        title: downloaderVideos.title,
        status: downloaderVideos.status,
        author: downloaderVideos.author,
        platform: downloaderProjects.platform,
        directMp4Url: downloaderVideos.directMp4Url,
        thumbnailUrl: downloaderVideos.thumbnailUrl,
      })
      .from(downloaderVideos)
      .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
      .where(
        and(
          eq(downloaderProjects.teamId, teamId),
          eq(downloaderVideos.status, 'pending'),
          or(
            notLike(downloaderVideos.videoUrl, '%douyin.com%'),
            isNotNull(downloaderVideos.directMp4Url),
            lt(downloaderVideos.updatedAt, twoMinutesAgo)
          )
        )
      )
      .orderBy(asc(downloaderVideos.createdAt))
      .limit(maxConcurrentDownloads * 2);

    // Fetch paused videos (no limit needed as we only need to signal cancels to the worker)
    const pausedVideos = await db
      .select({
        id: downloaderVideos.id,
        projectId: downloaderVideos.projectId,
        videoUrl: downloaderVideos.videoUrl,
        title: downloaderVideos.title,
        status: downloaderVideos.status,
        author: downloaderVideos.author,
        platform: downloaderProjects.platform,
        directMp4Url: downloaderVideos.directMp4Url,
        thumbnailUrl: downloaderVideos.thumbnailUrl,
      })
      .from(downloaderVideos)
      .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
      .where(
        and(
          eq(downloaderProjects.teamId, teamId),
          eq(downloaderVideos.status, 'paused')
        )
      );

    const rawTasks = [...forcePendingVideos, ...normalPendingVideos, ...pausedVideos];
    
    // Filter rawTasks for Douyin: only send to worker if it's paused (to cancel) or already resolved
    const filteredTasks = rawTasks.filter(v => {
      const isDouyin = v.platform === 'douyin' || v.videoUrl?.includes('douyin.com');
      if (isDouyin) {
        if (v.status === 'paused') return true;
        const hasResolvedUrl = !!v.directMp4Url || v.videoUrl?.includes('zjcdn.com') || v.videoUrl?.includes('video_mp4');
        return hasResolvedUrl;
      }
      return true;
    });

    const downloadTasks = filteredTasks.map(v => {
      let finalUrl = v.videoUrl;
      const isDouyin = v.platform === 'douyin' || v.videoUrl?.includes('douyin.com');
      if (!isDouyin && v.author && v.author.startsWith('http')) {
        finalUrl = v.author;
      }
      return {
        id: v.id,
        projectId: v.projectId,
        videoUrl: finalUrl,
        directMp4Url: v.directMp4Url,
        title: v.title,
        status: v.status,
        thumbnailUrl: v.thumbnailUrl,
      };
    });

    // Fetch all active cookies for the team to pass to worker
    const cookies = await db
      .select({ id: downloaderCookies.id, name: downloaderCookies.name, cookieData: downloaderCookies.cookieData })
      .from(downloaderCookies)
      .where(
        and(
          eq(downloaderCookies.teamId, teamId),
          eq(downloaderCookies.status, 'alive')
        )
      );

    // Ghép tất cả các file cookie lại với nhau để hỗ trợ đa nền tảng (Youtube + Bilibili + Tiktok...)
    const combinedCookieData = cookies.map(c => c.cookieData).join('\n\n');

    return NextResponse.json({
      success: true,
      scanTasks: pendingScansList,
      downloadTasks,
      maxConcurrentDownloads,
      cookieData: combinedCookieData || null,
    });
  } catch (error: any) {
    console.error('[API Downloader Worker Tasks] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
