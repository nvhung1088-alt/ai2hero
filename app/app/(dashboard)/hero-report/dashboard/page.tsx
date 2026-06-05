import { getActiveTeamCookie } from '@/lib/team-cookie';
import { redirect } from 'next/navigation';
import { 
  getReportSchedulesAction, 
  getInputConnectionsAction, 
  getOutputConnectionsAction, 
  getReportRunsAction,
  getAiConnectionsAction
} from '@/lib/db/hero-report-actions';
import { getConnectorBySlug } from '@/lib/connect-hub/connectors/registry';
import ReportClient from './report-client';

export const revalidate = 0;

export default async function HeroReportPage() {
  const teamId = await getActiveTeamCookie();

  if (!teamId) {
    redirect('/dashboard');
  }

  // Fetch all necessary data concurrently
  const [schedulesRes, inputsRes, outputsRes, runsRes, aiRes] = await Promise.all([
    getReportSchedulesAction(teamId),
    getInputConnectionsAction(teamId),
    getOutputConnectionsAction(teamId),
    getReportRunsAction(teamId, undefined, 50),
    getAiConnectionsAction(teamId)
  ]);

  const schedules = schedulesRes.success ? (schedulesRes.data || []) : [];
  const inputConnections = inputsRes.success ? (inputsRes.data || []) : [];
  const outputConnections = outputsRes.success ? (outputsRes.data || []) : [];
  const runs = runsRes.success ? (runsRes.data || []) : [];
  const aiConnections = aiRes.success ? (aiRes.data || []) : [];

  // Build capabilities map for input connections
  const capabilitiesMap: Record<string, any> = {};
  for (const conn of inputConnections) {
    const def = getConnectorBySlug(conn.appSlug);
    if (def) {
      capabilitiesMap[conn.appSlug] = def.actions
        .filter(a => a.group === 'Báo cáo & Thống kê')
        .map(a => ({
          slug: a.slug,
          name: a.name,
          description: a.description
        }));
    }
  }

  // Build AI Models map
  const aiModelsMap: Record<string, { label: string; value: string }[]> = {};
  for (const conn of aiConnections) {
    const def = getConnectorBySlug(conn.appSlug);
    if (def) {
      const chatAction = def.actions.find(a => a.slug === 'chat_completion');
      if (chatAction && chatAction.inputSchema) {
        const modelField = chatAction.inputSchema.find((f: any) => f.name === 'model');
        if (modelField && modelField.options) {
          aiModelsMap[conn.appSlug] = modelField.options.map((opt: string) => {
            // Helper to get a nice label for known models
            let label = opt;
            if (opt.includes('sonnet')) label = 'Claude 3.5 Sonnet (Khuyên dùng)';
            else if (opt.includes('opus')) label = 'Claude 3 Opus (Siêu tư duy)';
            else if (opt.includes('haiku')) label = 'Claude 3 Haiku (Tốc độ cực nhanh)';
            else if (opt.includes('gpt-5.4')) label = 'GPT-4o / GPT-4 Turbo (Thông minh)';
            else if (opt.includes('glm')) label = 'GPT-3.5 / GLM (Siêu tiết kiệm)';
            return { label, value: opt };
          });
        }
      }
    }
  }

  return (
    <ReportClient
      teamId={teamId}
      initialSchedules={schedules}
      inputConnections={inputConnections}
      outputConnections={outputConnections}
      aiConnections={aiConnections}
      capabilitiesMap={capabilitiesMap}
      aiModelsMap={aiModelsMap}
      initialRuns={runs}
    />
  );
}
