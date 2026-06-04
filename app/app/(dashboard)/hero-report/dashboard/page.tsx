import { getActiveTeamCookie } from '@/lib/team-cookie';
import { redirect } from 'next/navigation';
import { 
  getReportSchedulesAction, 
  getInputConnectionsAction, 
  getOutputConnectionsAction, 
  getReportRunsAction 
} from '@/lib/db/hero-report-actions';
import ReportClient from './report-client';

export const revalidate = 0;

export default async function HeroReportPage() {
  const teamId = await getActiveTeamCookie();

  if (!teamId) {
    redirect('/dashboard');
  }

  // Fetch all necessary data concurrently
  const [schedulesRes, inputsRes, outputsRes, runsRes] = await Promise.all([
    getReportSchedulesAction(teamId),
    getInputConnectionsAction(teamId),
    getOutputConnectionsAction(teamId),
    getReportRunsAction(teamId, undefined, 50)
  ]);

  const schedules = schedulesRes.success ? (schedulesRes.data || []) : [];
  const inputConnections = inputsRes.success ? (inputsRes.data || []) : [];
  const outputConnections = outputsRes.success ? (outputsRes.data || []) : [];
  const runs = runsRes.success ? (runsRes.data || []) : [];

  return (
    <ReportClient
      teamId={teamId}
      initialSchedules={schedules}
      inputConnections={inputConnections}
      outputConnections={outputConnections}
      initialRuns={runs}
    />
  );
}
