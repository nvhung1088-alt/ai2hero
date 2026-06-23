import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { teamMembers, teams, connectHubConnections } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { ALL_CONNECTORS } from '@/lib/connect-hub/connectors/registry';
import DashboardClient from './dashboard-client';

export const revalidate = 0;

export default async function HeroDubDashboardPage({
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

  // Fetch connected AI apps
  const activeConnections = await db
    .select({ appSlug: connectHubConnections.appSlug })
    .from(connectHubConnections)
    .where(
      and(
        eq(connectHubConnections.teamId, teamId),
        eq(connectHubConnections.status, 'connected')
      )
    );
    
  const activeSlugs = activeConnections.map(c => c.appSlug);
  
  const connectedAiApps = ALL_CONNECTORS
    .filter(c => activeSlugs.includes(c.slug) && c.category === 'ai' && c.aiModels && c.aiModels.length > 0)
    .map(c => ({
      slug: c.slug,
      name: c.name,
      models: c.aiModels || []
    }));

  return (
    <DashboardClient
      teamId={teamId}
      userId={user.id}
      teamName={team.name}
      connectedAiApps={connectedAiApps}
    />
  );
}
