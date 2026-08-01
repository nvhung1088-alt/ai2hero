import { getUser, getTeamForUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { getConnectionsByTeam } from '@/lib/db/connect-hub-queries';
import DriveSettingsClient from './drive-settings-client';

export default async function HeroDriveSettingsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr);

  const user = await getUser();
  if (!user) redirect('/sign-in');

  const team = await getTeamForUser();
  if (!team || team.id !== teamId) redirect('/dashboard');

  const rawConnections = await getConnectionsByTeam(teamId);
  const googleDriveConnections = (rawConnections || []).filter(
    (c: any) => c.connectorSlug === 'google-drive' || c.appSlug === 'google-drive'
  );

  return (
    <DriveSettingsClient
      teamId={teamId}
      googleDriveConnections={googleDriveConnections}
    />
  );
}
