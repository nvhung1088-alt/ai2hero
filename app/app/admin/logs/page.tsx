import { getAdminLogs } from '@/lib/db/admin-queries';
import LogsClient from './logs-client';

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage() {
  const logs = await getAdminLogs(200);

  return (
    <LogsClient
      initialLogs={logs}
    />
  );
}

