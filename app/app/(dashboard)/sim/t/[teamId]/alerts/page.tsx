import { getSimRiskEvents } from '@/lib/db/sim-queries';
import AlertsClient from '../../../alerts/alerts-client';

export const revalidate = 0;

export default async function SimAlertsPage({ params }: { params: Promise<any> }) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);
  
  const allEvents = await getSimRiskEvents(teamId);

  return (
    <AlertsClient
      teamId={teamId}
      initialEvents={allEvents}
    />
  );
}
