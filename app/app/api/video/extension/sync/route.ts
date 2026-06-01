import { NextRequest, NextResponse } from 'next/server';
import { verifyExtensionToken } from '@/lib/db/extension-actions';
import { db } from '@/lib/db/drizzle';
import { videoAssets } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

const MAX_SYNC_BATCH_SIZE = 50;

const videoSyncItemSchema = z.object({
  title: z.string().trim().max(255).optional().default('Video khong ten'),
  url: z.string().trim().url().max(4000),
  size: z.string().trim().max(50).optional().nullable(),
  mimeType: z.string().trim().max(100).optional().nullable(),
  thumbnailUrl: z.string().trim().url().max(4000).optional().nullable(),
});

const videoSyncSchema = z.object({
  videos: z.array(videoSyncItemSchema).min(1).max(MAX_SYNC_BATCH_SIZE),
});

function extractBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Thiếu Bearer Token' }, { status: 401, headers: CORS_HEADERS });
    }

    const auth = await verifyExtensionToken(token);
    if (!auth.success || !auth.teamId) {
      return NextResponse.json({ success: false, error: auth.error || 'Token không hợp lệ' }, { status: 401, headers: CORS_HEADERS });
    }

    const videos = await db
      .select()
      .from(videoAssets)
      .where(eq(videoAssets.teamId, auth.teamId))
      .orderBy(videoAssets.createdAt);

    return NextResponse.json({ success: true, videos, count: videos.length }, { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    console.error('[herovideo/sync GET] Error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi hệ thống' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Thiếu Bearer Token' }, { status: 401, headers: CORS_HEADERS });
    }

    const auth = await verifyExtensionToken(token);
    if (!auth.success || !auth.teamId || !auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || 'Token không hợp lệ' }, { status: 401, headers: CORS_HEADERS });
    }

    const body = await request.json();
    const parsed = videoSyncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Payload video khong hop le' },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    const { videos } = parsed.data;

    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ success: false, error: 'Danh sách video trống' }, { status: 400, headers: CORS_HEADERS });
    }

    let synced = 0;
    const seenUrls = new Set<string>();

    for (const video of videos) {
      const { title, url, size, mimeType, thumbnailUrl } = video;
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const safeTitle = title || 'Video khong ten';

      // Check if video URL already exists for this team
      const [existing] = await db
        .select({ id: videoAssets.id })
        .from(videoAssets)
        .where(
          and(
            eq(videoAssets.teamId, auth.teamId),
            eq(videoAssets.url, url)
          )
        )
        .limit(1);

      if (existing) {
        // Update if already exists
        await db
          .update(videoAssets)
          .set({ title: safeTitle, size, mimeType, thumbnailUrl, updatedAt: new Date() })
          .where(eq(videoAssets.id, existing.id));
      } else {
        // Insert new video
        await db.insert(videoAssets).values({
          teamId: auth.teamId,
          userId: auth.userId,
          title: safeTitle,
          url,
          size,
          mimeType,
          thumbnailUrl,
          status: 'active',
        });
      }
      synced++;
    }

    return NextResponse.json({ success: true, synced, message: `Đã đồng bộ ${synced} video` }, { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    console.error('[herovideo/sync POST] Error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi hệ thống' }, { status: 500, headers: CORS_HEADERS });
  }
}
