import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { downloaderProjects, downloaderVideos } from '@/lib/db/schema';
import { eq, and, isNull, lt, or, like, notLike, desc } from 'drizzle-orm';
import { verifyExtensionToken } from '@/lib/db/extension-actions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function extractBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

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

import { getCachedTrafficConfig } from '@/app/admin/actions';

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Thiếu Bearer Token' }, { status: 401, headers: corsHeaders });
    }

    const auth = await verifyExtensionToken(token);
    if (!auth.success || !auth.teamId) {
      return NextResponse.json({ success: false, error: auth.error || 'Token không hợp lệ' }, { status: 401, headers: corsHeaders });
    }

    const pollingConfig = await getCachedTrafficConfig();

    // Lấy tất cả dự án active của Douyin & Bilibili
    const allProjects = await db
      .select({
        id: downloaderProjects.id,
        name: downloaderProjects.name,
        sourceUrl: downloaderProjects.sourceUrl,
        settings: downloaderProjects.settings,
        lastScanAt: downloaderProjects.lastScanAt,
      })
      .from(downloaderProjects)
      .where(
        and(
          eq(downloaderProjects.teamId, auth.teamId),
          eq(downloaderProjects.status, 'active'),
          or(
            eq(downloaderProjects.platform, 'douyin'),
            eq(downloaderProjects.platform, 'bilibili'),
            like(downloaderProjects.sourceUrl, '%bilibili.com%'),
            like(downloaderProjects.sourceUrl, '%douyin.com%')
          )
        )
      );

    // Lọc thủ công dựa trên chu kỳ quét động
    const projectsNeedingScan = allProjects.filter(p => {
      const settings = p.settings as any || {};
      const scanInterval = settings.scanInterval || 'Mỗi 1 giờ';
      const intervalMs = getScanIntervalMs(scanInterval);

      const lastScan = p.lastScanAt ? new Date(p.lastScanAt).getTime() : 0;
      return (Date.now() - lastScan) >= intervalMs;
    });

    // Giới hạn tối đa 3 dự án quét cùng lúc
    const selectedProjects = projectsNeedingScan.slice(0, 3);

    const formattedProjects = [];
    const extractId = (url: string) => {
      let match = url.match(/\/video\/(\d+)/);
      if (match) return match[1];
      match = url.match(/modal_id=(\d+)/);
      if (match) return match[1];
      return null;
    };

    for (const p of selectedProjects) {
      const settings = p.settings as any || {};
      const maxScanVideos = settings.maxScanVideos ?? 5;
      
      // Lấy danh sách nguồn quét phụ
      const sources = settings.sources || [];
      const sourceUrls = sources.map((s: any) => s.value).filter(Boolean);
      if (sourceUrls.length === 0 && p.sourceUrl) {
        sourceUrls.push(p.sourceUrl);
      }
      
      const recent = await db
        .select({ videoUrl: downloaderVideos.videoUrl })
        .from(downloaderVideos)
        .where(eq(downloaderVideos.projectId, p.id))
        .orderBy(desc(downloaderVideos.createdAt))
        .limit(200);
        
      const recentIds = recent.map(r => extractId(r.videoUrl)).filter(Boolean);

      formattedProjects.push({
        id: p.id,
        name: p.name,
        sourceUrls,
        maxScanVideos,
        recentUrls: recent.map(r => r.videoUrl),
        recentIds: p.lastScanAt === null ? [] : recentIds,
      });
    }

    // Lấy tối đa 5 video Douyin đơn lẻ đang chờ bóc tách link MP4 gốc
    const pendingVideos = await db
      .select({
        id: downloaderVideos.id,
        videoUrl: downloaderVideos.videoUrl,
      })
      .from(downloaderVideos)
      .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
      .where(
        and(
          eq(downloaderProjects.teamId, auth.teamId),
          or(
            eq(downloaderVideos.status, 'pending'),
            eq(downloaderVideos.status, 'force_pending')
          ),
          like(downloaderVideos.videoUrl, '%douyin.com%'),
          notLike(downloaderVideos.videoUrl, '%douyinvod.com%')
        )
      )
      .limit(5);

    return NextResponse.json({ 
      success: true, 
      projects: formattedProjects,
      pendingVideos,
      pollingMode: pollingConfig.mode,
      pollIntervalMs: pollingConfig.pollIntervalMs,
      idleTimeoutMinutes: pollingConfig.idleTimeoutMinutes,
      maxBackoffMinutes: pollingConfig.maxBackoffMinutes,
    }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Pending-scan API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}
