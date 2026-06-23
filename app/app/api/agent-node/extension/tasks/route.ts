import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { agentNodeTasks } from '@/lib/db/schema';
import { verifyExtensionToken } from '@/lib/db/extension-actions';
import { and, eq, desc } from 'drizzle-orm';

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
    const tasks = await db
      .select({
        id: agentNodeTasks.id,
        url: agentNodeTasks.url,
        type: agentNodeTasks.type,
        priority: agentNodeTasks.priority,
        createdAt: agentNodeTasks.createdAt,
      })
      .from(agentNodeTasks)
      .where(
        and(
          eq(agentNodeTasks.teamId, auth.teamId),
          eq(agentNodeTasks.status, 'pending')
        )
      )
      .orderBy(desc(agentNodeTasks.priority), desc(agentNodeTasks.createdAt))
      .limit(5);

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    console.error('[API Tasks] Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
