import { NextResponse } from 'next/server';
import {
  verifyDubWorkerToken,
  acquireResourceLockAction,
  releaseResourceLockAction,
} from '@/lib/db/hero-dub-actions';

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

  const auth = await verifyDubWorkerToken(token);
  if (!auth.success || !auth.workerId || !auth.teamId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, taskId, resourceKey } = body;

    if (!taskId || !resourceKey) {
      return NextResponse.json({ error: 'taskId and resourceKey are required' }, { status: 400 });
    }

    if (action === 'acquire') {
      const res = await acquireResourceLockAction(auth.teamId, auth.workerId, taskId, resourceKey);
      return NextResponse.json(res);
    } else if (action === 'release') {
      const res = await releaseResourceLockAction(auth.teamId, auth.workerId, taskId, resourceKey);
      return NextResponse.json(res);
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be acquire or release' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[API Resource Lock] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
