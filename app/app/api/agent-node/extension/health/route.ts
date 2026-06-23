import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { agentNodeTasks } from '@/lib/db/schema';
import { verifyExtensionToken } from '@/lib/db/extension-actions';
import { and, eq, sql } from 'drizzle-orm';

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

export async function GET(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 401 });
  }

  const auth = await verifyExtensionToken(token);
  if (!auth.success || !auth.teamId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const [countRecord] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(agentNodeTasks)
      .where(
        and(
          eq(agentNodeTasks.teamId, auth.teamId),
          eq(agentNodeTasks.status, 'pending')
        )
      );

    return NextResponse.json({
      status: 'ok',
      teamId: auth.teamId,
      userId: auth.userId,
      pendingTasks: countRecord?.count || 0,
    });
  } catch (error: any) {
    console.error('[API Health] Error checking health:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
