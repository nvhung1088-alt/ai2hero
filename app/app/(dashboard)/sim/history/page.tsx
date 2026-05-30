import { getCurrentTeamId } from '@/lib/sim-helpers';
import { getSimCheckLogs } from '@/lib/db/sim-queries';
import HistoryClient from './history-client';

export const revalidate = 0;

export default async function SimHistoryPage() {
  const teamId = await getCurrentTeamId();
  const logs = await getSimCheckLogs(teamId);

  return (
    <HistoryClient
      initialLogs={logs}
    />
  );
}
