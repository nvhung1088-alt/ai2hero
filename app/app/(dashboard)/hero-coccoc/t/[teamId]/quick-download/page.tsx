import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { coccocTasks } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import QuickDownloadClient from './quick-download-client';

export const revalidate = 0;

export default async function HeroCoccocQuickDownloadPage({
  params
}: {
  params: Promise<any>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);

  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  // Lấy các task tải nhanh gần đây (priority = 1)
  const recentQuickTasks = await db
    .select()
    .from(coccocTasks)
    .where(and(eq(coccocTasks.teamId, teamId), eq(coccocTasks.priority, 1)))
    .orderBy(desc(coccocTasks.createdAt))
    .limit(10);

  return (
    <QuickDownloadClient
      teamId={teamId}
      userId={user.id}
      recentTasks={recentQuickTasks}
    />
  );
}
