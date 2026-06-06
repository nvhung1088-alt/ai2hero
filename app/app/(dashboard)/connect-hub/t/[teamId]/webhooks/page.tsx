import { listWebhooksAction } from '@/lib/db/connect-hub-actions';
import { db } from '@/lib/db/drizzle';
import { connectHubConnections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import WebhooksClient from './webhooks-client';
import { redirect } from 'next/navigation';

export default async function WebhooksPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const parsedTeamId = parseInt(teamId, 10);

  if (isNaN(parsedTeamId)) {
    redirect('/connect-hub');
  }

  // Lấy danh sách Webhooks của team
  const webhooksRes = await listWebhooksAction(parsedTeamId);
  const webhooks = webhooksRes.success ? (webhooksRes.data || []) : [];

  // Lấy các connection hiện có của team
  const connections = await db
    .select({
      id: connectHubConnections.id,
      appName: connectHubConnections.appName,
      appSlug: connectHubConnections.appSlug,
      connectionName: connectHubConnections.connectionName,
    })
    .from(connectHubConnections)
    .where(eq(connectHubConnections.teamId, parsedTeamId));

  return (
    <div className="flex-1 space-y-6">
      <WebhooksClient
        teamId={parsedTeamId}
        initialWebhooks={webhooks as any[]}
        connections={connections}
      />
    </div>
  );
}
