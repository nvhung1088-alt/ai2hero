import { getActiveTeamCookie } from '@/lib/team-cookie';
import { getConnectionsByTeam } from '@/lib/db/connect-hub-queries';
import { redirect } from 'next/navigation';
import ConnectionsClient from './connections-client';
import { ErrorBoundary } from '@/components/error-boundary';

export const revalidate = 0;

export default async function ConnectionsPage() {
  const teamId = await getActiveTeamCookie();
  if (!teamId) {
    redirect('/dashboard');
  }

  const connections = await getConnectionsByTeam(teamId);
  return (
    <ErrorBoundary>
      <ConnectionsClient initialConnections={connections} teamId={teamId} />
    </ErrorBoundary>
  );
}
