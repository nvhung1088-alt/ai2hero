import { getActiveTeamCookie } from '@/lib/team-cookie';
import { getUsageLogs } from '@/lib/db/connect-hub-queries';
import { redirect } from 'next/navigation';
import ConnectHubLogsClient from './logs-client';
import { ErrorBoundary } from '@/components/error-boundary';

export const revalidate = 0;

export default async function ConnectHubLogsPage() {
  const teamId = await getActiveTeamCookie();

  if (!teamId) {
    redirect('/dashboard');
  }

  // Load nhật ký sử dụng API của Team (tối đa 200 dòng trong logs viewer)
  const logs = await getUsageLogs(teamId, 200);

  return (
    <ErrorBoundary>
      <ConnectHubLogsClient
        teamId={teamId}
        logs={logs}
      />
    </ErrorBoundary>
  );
}
