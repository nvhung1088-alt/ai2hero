import { getUser, getTeamForUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { driveFolderMappings, connectHubConnections } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import DriveDashboardClient from './dashboard-client';

export default async function DriveDashboardPage({
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

  // Fetch all folder mappings for team
  const mappings = await db
    .select()
    .from(driveFolderMappings)
    .orderBy(desc(driveFolderMappings.createdAt));

  // Fetch all Google Drive Connections from Connect Hub
  const googleDriveConnections = await db
    .select()
    .from(connectHubConnections)
    .where(eq(connectHubConnections.teamId, teamId));

  const driveConns = googleDriveConnections.filter(
    (c) => c.appSlug === 'google-drive'
  );

  return (
    <DriveDashboardClient
      user={user}
      team={team}
      initialMappings={mappings}
      googleDriveConnections={driveConns}
    />
  );
}
