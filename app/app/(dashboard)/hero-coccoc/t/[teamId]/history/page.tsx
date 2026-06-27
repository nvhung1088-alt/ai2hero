import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { coccocProjects } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import HistoryClient from './history-client';

export const revalidate = 0;

export default async function HeroCoccocHistoryPage({
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

  // Lấy các project để hiển thị trong dropdown filter
  const projectsList = await db
    .select({ id: coccocProjects.id, name: coccocProjects.name })
    .from(coccocProjects)
    .where(eq(coccocProjects.teamId, teamId))
    .orderBy(desc(coccocProjects.createdAt));

  return (
    <HistoryClient
      teamId={teamId}
      projects={projectsList}
    />
  );
}
