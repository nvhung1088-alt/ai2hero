import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { downloaderVideos, downloaderProjects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyExtensionToken } from '@/lib/db/extension-actions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Thiếu Bearer Token' }, { status: 401, headers: corsHeaders });
    }

    const auth = await verifyExtensionToken(token);
    if (!auth.success || !auth.teamId) {
      return NextResponse.json({ success: false, error: auth.error || 'Token không hợp lệ' }, { status: 401, headers: corsHeaders });
    }

    const data = await req.json();
    const { videoId, directMp4Url, title, coverUrl } = data;
    
    if (!videoId || !directMp4Url) {
      return NextResponse.json({ success: false, error: 'Missing videoId or directMp4Url' }, { status: 400, headers: corsHeaders });
    }

    // Verify video belongs to the team
    const [video] = await db
      .select({ id: downloaderVideos.id })
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
      return NextResponse.json({ success: false, error: 'Video not found or access denied' }, { status: 404, headers: corsHeaders });
    }

    // Update
    await db
      .update(downloaderVideos)
      .set({
        videoUrl: directMp4Url,
        title: title || undefined,
        thumbnailUrl: coverUrl || undefined,
        updatedAt: new Date(),
      })
      .where(eq(downloaderVideos.id, videoId));

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Update-video API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}
