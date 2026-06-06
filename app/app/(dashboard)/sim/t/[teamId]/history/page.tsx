import { getSimCheckLogs } from '@/lib/db/sim-queries';
import HistoryClient from '../../../history/history-client';

export const revalidate = 0;

export default async function SimHistoryPage({ params }: { params: Promise<any> }) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);
  
  const logs = await getSimCheckLogs(teamId);

  return (
    <HistoryClient
      initialLogs={logs}
    />
  );
}
