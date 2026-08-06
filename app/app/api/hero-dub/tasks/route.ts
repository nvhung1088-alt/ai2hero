import { NextResponse } from 'next/server';
import {
  verifyDubWorkerToken,
  pollPendingTaskAction,
  updateTaskProgressAction,
  completeTaskAction,
} from '@/lib/db/hero-dub-actions';

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

import { getCachedTrafficConfig } from '@/app/admin/actions';

// 1. GET: Poll pending task
export async function GET(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 401 });
  }

  const auth = await verifyDubWorkerToken(token);
  if (!auth.success || !auth.workerId || !auth.teamId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  const pollingConfig = await getCachedTrafficConfig();

  try {
    const result = await pollPendingTaskAction(auth.workerId, auth.teamId);
    if (result.error) {
      return NextResponse.json({
        error: result.error,
        pollingMode: pollingConfig.mode,
        pollIntervalMs: pollingConfig.pollIntervalMs,
        idleTimeoutMinutes: pollingConfig.idleTimeoutMinutes,
        maxBackoffMinutes: pollingConfig.maxBackoffMinutes,
      }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      task: result.task,
      pollingMode: pollingConfig.mode,
      pollIntervalMs: pollingConfig.pollIntervalMs,
      idleTimeoutMinutes: pollingConfig.idleTimeoutMinutes,
      maxBackoffMinutes: pollingConfig.maxBackoffMinutes,
    });
  } catch (error: any) {
    console.error('[API Tasks] Poll error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 2. PATCH: Update progress / Complete / Fail task
export async function PATCH(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 401 });
  }

  const auth = await verifyDubWorkerToken(token);
  if (!auth.success || !auth.workerId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      taskId,
      status,
      progress,
      error,
      sourceTitle,
      resultVideoUrl,
      resultSrtUrl,
      preview,
      actualCost,
      durationSec,
    } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    if (status === 'completed') {
      if (!resultVideoUrl || !resultSrtUrl) {
        return NextResponse.json({ error: 'resultVideoUrl and resultSrtUrl are required for completed status' }, { status: 400 });
      }
      const result = await completeTaskAction(taskId, auth.workerId, {
        resultVideoUrl,
        resultSrtUrl,
        preview,
        actualCost,
      });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    } else {
      const result = await updateTaskProgressAction(taskId, auth.workerId, {
        status,
        progress: progress || 0,
        error,
        sourceTitle,
        durationSec,
      });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Tasks] Update progress error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}

// 3. POST: Worker Heartbeat (to update lastSeenAt & set status to online)
export async function POST(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 401 });
  }

  const auth = await verifyDubWorkerToken(token);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
