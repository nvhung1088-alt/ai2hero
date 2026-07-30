import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { teamMembers, teams } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import ProjectsClient from './projects-client';

export const revalidate = 0;

export default async function HeroDubProjectsPage({
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

  // IDOR Protection
  const membership = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, teamId)),
  });

  if (!membership) {
    redirect('/dashboard');
  }

  const teamList = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  const team = teamList[0];

  if (!team) {
    redirect('/dashboard');
  }

  return (
    <ProjectsClient
      teamId={teamId}
    />
  );
}
