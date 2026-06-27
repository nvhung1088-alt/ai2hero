import { NextResponse } from 'next/server';
import { 
  verifyCoccocWorkerToken, 
  pollCoccocPendingTaskAction, 
  updateCoccocTaskAction 
} from '@/lib/db/hero-coccoc-actions';

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

// 1. GET: Poll pending task
export async function GET(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 401 });
  }

  const auth = await verifyCoccocWorkerToken(token);
  if (!auth.success || !auth.workerId || !auth.teamId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await pollCoccocPendingTaskAction(auth.workerId, auth.teamId);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, task: result.task });
  } catch (error: any) {
    console.error('[API Coccoc Tasks] Poll error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 2. PATCH: Update task progress/status
export async function PATCH(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 401 });
  }

  const auth = await verifyCoccocWorkerToken(token);
  if (!auth.success || !auth.workerId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { taskId, status, downloadedPath, fileSize, duration, quality, error, logs } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const result = await updateCoccocTaskAction(taskId, {
      status,
      downloadedPath,
      fileSize,
      duration,
      quality,
      error,
      logs,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, task: result.task });
  } catch (error: any) {
    console.error('[API Coccoc Tasks] Update error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
