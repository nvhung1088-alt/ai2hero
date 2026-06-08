import { db } from '@/lib/db/drizzle';
import { connectHubConnections } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { 
  getInboxesAction, 
  getGuardrailsAction, 
  getEventsAction 
} from '@/lib/db/hero-care-actions';
import SettingsClient from './settings-client';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';

export const revalidate = 0;

export default async function HeroCareSettingsPage({
  params
}: {
  params: Promise<any>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);

  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  // Load song song inboxes, guardrails và events để hiển thị tab tức thì
  const [inboxesRes, guardrailsRes, eventsRes, connections] = await Promise.all([
    getInboxesAction(teamId),
    getGuardrailsAction(teamId),
    getEventsAction(teamId, { limit: 50 }),
    db
      .select()
      .from(connectHubConnections)
      .where(eq(connectHubConnections.teamId, teamId))
      .orderBy(desc(connectHubConnections.createdAt))
  ]);

  const inboxes = inboxesRes.success ? (inboxesRes.data || []) : [];
  const guardrails = guardrailsRes.success ? (guardrailsRes.data || []) : [];
  const events = eventsRes.success ? (eventsRes.data || []) : [];

  return (
    <SettingsClient
      teamId={teamId}
      initialInboxes={inboxes}
      connections={connections}
      initialGuardrails={guardrails as any[]}
      initialEvents={events as any[]}
    />
  );
}
