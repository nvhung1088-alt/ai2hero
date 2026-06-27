import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { coccocProfiles, coccocWorkers, coccocTasks, coccocProjects } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import DashboardClient from './dashboard-client';

export const revalidate = 0;

export default async function HeroCoccocDashboardPage({
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

  // 1. Fetch profiles
  const profilesList = await db
    .select()
    .from(coccocProfiles)
    .where(eq(coccocProfiles.teamId, teamId))
    .orderBy(desc(coccocProfiles.createdAt));

  // 2. Fetch active worker
  const [worker] = await db
    .select()
    .from(coccocWorkers)
    .where(and(eq(coccocWorkers.teamId, teamId), eq(coccocWorkers.status, 'online')))
    .limit(1);

  // 3. Fetch task counts for KPI
  const allProjects = await db
    .select({ id: coccocProjects.id })
    .from(coccocProjects)
    .where(eq(coccocProjects.teamId, teamId));

  const allTasks = await db
    .select({ status: coccocTasks.status })
    .from(coccocTasks)
    .where(eq(coccocTasks.teamId, teamId));

  // 4. Fetch 5 recent tasks
  const recentTasks = await db
    .select()
    .from(coccocTasks)
    .where(eq(coccocTasks.teamId, teamId))
    .orderBy(desc(coccocTasks.createdAt))
    .limit(5);

  return (
    <DashboardClient
      teamId={teamId}
      userId={user.id}
      profiles={profilesList}
      worker={worker || null}
      projectCount={allProjects.length}
      tasks={allTasks}
      recentTasks={recentTasks}
    />
  );
}
