import { getUser, getTeamForUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { getDriveScanConfigs } from '@/lib/db/hero-drive-actions';
import { getConnectHubConnections } from '@/lib/db/connect-hub-actions';
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

  const team = await getTeamForUser(user.id);
  if (!team || team.id !== teamId) {
    redirect('/dashboard');
  }

  const configsRes = await getDriveScanConfigs(teamId);
  const configs = configsRes.success ? configsRes.data || [] : [];

  const connectionsRes = await getConnectHubConnections(teamId);
  const connections = connectionsRes.success
    ? (connectionsRes.data || []).filter((c: any) => c.connectorSlug === 'google-drive')
    : [];

  return (
    <DriveDashboardClient
      user={user}
      team={team}
      initialConfigs={configs}
      googleDriveConnections={connections}
    />
  );
}
