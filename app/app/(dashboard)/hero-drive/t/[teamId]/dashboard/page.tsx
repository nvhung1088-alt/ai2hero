import { getUser, getTeamForUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { getDriveScanConfigs } from '@/lib/db/hero-drive-actions';
import { getConnectionsByTeam } from '@/lib/db/connect-hub-queries';
import DriveDashboardClient from './dashboard-client';

export default async function HeroDriveDashboardPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr);

  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();
  if (!team || team.id !== teamId) {
    redirect('/dashboard');
  }

  const configsRes = await getDriveScanConfigs(teamId);
  const configs = configsRes.success ? configsRes.data || [] : [];

  const rawConnections = await getConnectionsByTeam(teamId);
  const connections = (rawConnections || []).filter(
    (c: any) => c.connectorSlug === 'google-drive' || c.appSlug === 'google-drive'
  );

  return (
    <DriveDashboardClient
      user={user}
      team={team}
      initialConfigs={configs}
      googleDriveConnections={connections}
    />
  );
}
