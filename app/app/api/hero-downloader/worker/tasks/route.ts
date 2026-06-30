import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { downloaderProjects, downloaderVideos, downloaderSettings, downloaderCookies } from '@/lib/db/schema';
import { eq, and, isNull, lt, asc, desc, inArray, notInArray } from 'drizzle-orm';
import { jwtVerify } from 'jose';

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

    // Lấy công việc Scan (Dự án có status='active' và (lastScanAt is null or > 1 giờ trước))
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
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
      .filter(p => !p.lastScanAt || new Date(p.lastScanAt) < oneHourAgo)
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

    // Fetch force_pending videos (bypass concurrency limits)
    const forcePendingVideos = await db
      .select({
        id: downloaderVideos.id,
        projectId: downloaderVideos.projectId,
        videoUrl: downloaderVideos.videoUrl,
        title: downloaderVideos.title,
        status: downloaderVideos.status,
      })
      .from(downloaderVideos)
      .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
      .where(
        and(
          eq(downloaderProjects.teamId, teamId),
          eq(downloaderVideos.status, 'force_pending')
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
      })
      .from(downloaderVideos)
      .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
      .where(
        and(
          eq(downloaderProjects.teamId, teamId),
          eq(downloaderVideos.status, 'pending')
        )
      )
      .orderBy(asc(downloaderVideos.createdAt))
      .limit(maxConcurrentDownloads * 2);

    const pendingVideos = [...forcePendingVideos, ...normalPendingVideos];

    // Fetch paused videos (no limit needed as we only need to signal cancels to the worker)
    const pausedVideos = await db
      .select({
        id: downloaderVideos.id,
        projectId: downloaderVideos.projectId,
        videoUrl: downloaderVideos.videoUrl,
        title: downloaderVideos.title,
        status: downloaderVideos.status,
      })
      .from(downloaderVideos)
      .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
      .where(
        and(
          eq(downloaderProjects.teamId, teamId),
          eq(downloaderVideos.status, 'paused')
        )
      );

    const downloadTasks = [...pendingVideos, ...pausedVideos];

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
