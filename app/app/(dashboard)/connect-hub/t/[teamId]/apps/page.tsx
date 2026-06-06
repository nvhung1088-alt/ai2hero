import { getConnectionsByTeam } from '@/lib/db/connect-hub-queries';
import { ALL_CONNECTORS } from '@/lib/connect-hub/connectors/registry';
import { redirect } from 'next/navigation';
import ConnectHubAppsClient from '../../../apps/apps-client';
import { ErrorBoundary } from '@/components/error-boundary';

export const revalidate = 0;

export default async function ConnectHubDynamicAppsPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);

  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  // Lấy các kết nối hiện tại để hiển thị trạng thái "Đã kết nối" cho card tương ứng
  const currentConnections = await getConnectionsByTeam(teamId);
  const connectedSlugs = Array.from(new Set(currentConnections.map((c) => c.appSlug)));

  return (
    <ErrorBoundary>
      <ConnectHubAppsClient
        teamId={teamId}
        allConnectors={ALL_CONNECTORS}
        connectedSlugs={connectedSlugs}
      />
    </ErrorBoundary>
  );
}
