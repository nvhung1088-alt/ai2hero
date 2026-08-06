import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { connectHubConnections, connectHubBridgeJobs } from '@/lib/db/schema';
import { and, eq, asc } from 'drizzle-orm';
import { decryptField } from '@/lib/sim-crypto';
import { getCachedTrafficConfig } from '@/app/admin/actions';

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

/**
 * Tìm Connection của browser-ai-bridge theo token
 */
async function findConnectionByToken(token: string) {
  const connections = await db
    .select()
    .from(connectHubConnections)
    .where(and(eq(connectHubConnections.appSlug, 'browser-ai-bridge'), eq(connectHubConnections.status, 'connected')));

  for (const conn of connections) {
    try {
      const decrypted = decryptField(conn.encryptedCredentials);
      if (decrypted) {
        const creds = JSON.parse(decrypted);
        if (creds.bridgeToken === token) {
          return conn;
        }
      }
    } catch (e) {
      // Ignore parse error
    }
  }
  return null;
}

/**
 * GET: Extension Poll lấy Job đang chờ (pending)
 */
export async function GET(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Bridge token is required in Authorization header' }, { status: 401 });
  }

  const connection = await findConnectionByToken(token);
  if (!connection) {
    return NextResponse.json({ error: 'Invalid or unauthorized Bridge Token' }, { status: 401 });
  }

  try {
    const trafficConfig = await getCachedTrafficConfig();

    // 1. Tìm job pending cũ nhất của connection này
    const [pendingJob] = await db
      .select()
      .from(connectHubBridgeJobs)
      .where(and(eq(connectHubBridgeJobs.connectionId, connection.id), eq(connectHubBridgeJobs.status, 'pending')))
      .orderBy(asc(connectHubBridgeJobs.createdAt))
      .limit(1);

    if (!pendingJob) {
      return NextResponse.json({
        success: true,
        job: null,
        pollingMode: trafficConfig.mode,
        pollIntervalMs: trafficConfig.pollIntervalMs,
        idleTimeoutMinutes: trafficConfig.idleTimeoutMinutes,
        maxBackoffMinutes: trafficConfig.maxBackoffMinutes,
      });
    }

    // 2. Đổi trạng thái sang processing
    await db
      .update(connectHubBridgeJobs)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(connectHubBridgeJobs.id, pendingJob.id));

    return NextResponse.json({
      success: true,
      job: {
        id: pendingJob.id,
        targetAi: pendingJob.targetAi,
        prompt: pendingJob.prompt,
        attachments: pendingJob.attachments,
        createdAt: pendingJob.createdAt,
      },
      pollingMode: trafficConfig.mode,
      pollIntervalMs: trafficConfig.pollIntervalMs,
    });
  } catch (error: any) {
    console.error('[Bridge API GET Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}

/**
 * POST: Extension nộp kết quả (submit)
 */
export async function POST(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Bridge token is required in Authorization header' }, { status: 401 });
  }

  const connection = await findConnectionByToken(token);
  if (!connection) {
    return NextResponse.json({ error: 'Invalid or unauthorized Bridge Token' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { jobId, result, error } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    // 1. Kiểm tra job có tồn tại và thuộc connection này không
    const [existingJob] = await db
      .select()
      .from(connectHubBridgeJobs)
      .where(and(eq(connectHubBridgeJobs.id, jobId), eq(connectHubBridgeJobs.connectionId, connection.id)))
      .limit(1);

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 2. Cập nhật kết quả
    const newStatus = error ? 'failed' : 'done';
    await db
      .update(connectHubBridgeJobs)
      .set({
        result: result || null,
        error: error || null,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(connectHubBridgeJobs.id, jobId));

    return NextResponse.json({ success: true, message: `Job #${jobId} status updated to ${newStatus}` });
  } catch (error: any) {
    console.error('[Bridge API POST Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
