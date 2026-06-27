import { NextResponse } from 'next/server';
import { verifyCoccocWorkerToken, createTasksFromWorkerAction } from '@/lib/db/hero-coccoc-actions';

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 401 });
  }

  const auth = await verifyCoccocWorkerToken(token);
  if (!auth.success || !auth.teamId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, videoUrls } = body;

    if (!projectId || !videoUrls || !Array.isArray(videoUrls)) {
      return NextResponse.json({ error: 'projectId and videoUrls (array) are required' }, { status: 400 });
    }

    const result = await createTasksFromWorkerAction(auth.teamId, projectId, videoUrls);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, createdCount: result.createdCount });
  } catch (error: any) {
    console.error('[API Coccoc Tasks Create] Error creating tasks from worker:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
