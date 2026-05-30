import { getCurrentTeamId } from '@/lib/sim-helpers';
import { getSimRiskEvents } from '@/lib/db/sim-queries';
import AlertsClient from './alerts-client';

export const revalidate = 0;

export default async function SimAlertsPage() {
  const teamId = await getCurrentTeamId();
  const allEvents = await getSimRiskEvents(teamId);

  return (
    <AlertsClient
      teamId={teamId}
      initialEvents={allEvents}
    />
  );
}
