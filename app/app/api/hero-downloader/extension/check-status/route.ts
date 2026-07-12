import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { downloaderVideos, downloaderProjects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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

    const { searchParams } = new URL(req.url);
    const videoIdStr = searchParams.get('videoId');

    if (!videoIdStr) {
      return NextResponse.json({ success: false, error: 'videoId is required' }, { status: 400, headers: corsHeaders });
    }

    const videoId = parseInt(videoIdStr, 10);
    if (isNaN(videoId)) {
      return NextResponse.json({ success: false, error: 'Invalid videoId' }, { status: 400, headers: corsHeaders });
    }

    const [video] = await db
      .select({
        status: downloaderVideos.status,
        projectId: downloaderVideos.projectId,
      })
      .from(downloaderVideos)
      .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
      .where(
        and(
          eq(downloaderVideos.id, videoId),
          eq(downloaderProjects.teamId, auth.teamId)
        )
      )
      .limit(1);

    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, status: video.status }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Check-status API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}
