import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { teamMembers } from '@/lib/db/schema';
import { createScrapeTaskAction } from '@/lib/db/agent-node-actions';
import { and, eq } from 'drizzle-orm';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url, type, priority, teamId } = body;

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    // 1. Kiểm tra xem user có thuộc teamId này không
    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)))
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: 'You do not have access to this workspace' }, { status: 403 });
    }

    // 2. Tạo task cào
    const taskRes = await createScrapeTaskAction({
      teamId,
      userId: user.id,
      url,
      type: type || 'article',
      priority: priority || 3,
    });

    if (taskRes.error) {
      return NextResponse.json({ error: taskRes.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, taskId: taskRes.taskId });
  } catch (error: any) {
    console.error('[API Scrape] Error creating task:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
