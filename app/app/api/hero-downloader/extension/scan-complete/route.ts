import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { downloaderProjects, downloaderVideos } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verifyExtensionToken } from '@/lib/db/extension-actions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const { projectId } = data;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400, headers: corsHeaders });
    }

    const parsedProjectId = typeof projectId === 'string' ? parseInt(projectId, 10) : projectId;

    const [project] = await db
      .select()
      .from(downloaderProjects)
      .where(
        and(
          eq(downloaderProjects.id, parsedProjectId),
          eq(downloaderProjects.teamId, auth.teamId)
        )
      )
      .limit(1);

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found or unauthorized' }, { status: 404, headers: corsHeaders });
    }

    // Update project lastScanAt
    await db
      .update(downloaderProjects)
      .set({
        lastScanAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(downloaderProjects.id, project.id));

    // Recalculate totalVideos
    const videoCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(downloaderVideos)
      .where(eq(downloaderVideos.projectId, project.id));

    await db
      .update(downloaderProjects)
      .set({ totalVideos: videoCount[0]?.count || 0 })
      .where(eq(downloaderProjects.id, project.id));

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Scan-complete API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}
