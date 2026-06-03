import { getActiveTeamCookie } from '@/lib/team-cookie';
import { getConnectionsByTeam } from '@/lib/db/connect-hub-queries';
import { ALL_CONNECTORS } from '@/lib/connect-hub/connectors/registry';
import { redirect } from 'next/navigation';
import ConnectHubAppsClient from './apps-client';
import { ErrorBoundary } from '@/components/error-boundary';

export const revalidate = 0;

export default async function ConnectHubAppsPage() {
  const teamId = await getActiveTeamCookie();

  if (!teamId) {
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
