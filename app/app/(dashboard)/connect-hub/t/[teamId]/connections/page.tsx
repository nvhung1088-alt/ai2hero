import { getConnectionsByTeam } from '@/lib/db/connect-hub-queries';
import { redirect } from 'next/navigation';
import ConnectionsClient from '../../../connections/connections-client';
import { ErrorBoundary } from '@/components/error-boundary';

export const revalidate = 0;

export default async function ConnectHubDynamicConnectionsPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);
  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  const connections = await getConnectionsByTeam(teamId);
  return (
    <ErrorBoundary>
      <ConnectionsClient initialConnections={connections} teamId={teamId} />
    </ErrorBoundary>
  );
}
