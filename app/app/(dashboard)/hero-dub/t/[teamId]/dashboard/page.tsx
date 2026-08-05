import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { teamMembers, teams, connectHubConnections } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { ALL_CONNECTORS } from '@/lib/connect-hub/connectors/registry';
import DashboardClient from './dashboard-client';

export const revalidate = 0;

import { getDubTasksAction, getDubProjectsAction } from '@/lib/db/hero-dub-actions';
import { getDubScanConfigsAction } from '@/lib/db/hero-dub-scan-actions';

export default async function HeroDubDashboardPage({
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

  // IDOR Protection
  const membership = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, teamId)),
  });

  if (!membership) {
    redirect('/dashboard');
  }

  const teamList = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  const team = teamList[0];

  if (!team) {
    redirect('/dashboard');
  }

  // Pre-fetch initial data Server-Side for Instant 0s Load
  const [tasksRes, projectsRes, scanConfigsRes] = await Promise.all([
    getDubTasksAction(teamId, { limit: 20, offset: 0 }),
    getDubProjectsAction(teamId),
    getDubScanConfigsAction(teamId),
  ]);

  const initialTasks = tasksRes.success && tasksRes.tasks ? tasksRes.tasks : [];
  const initialTotalCount = tasksRes.success ? (tasksRes.totalCount || 0) : 0;
  const initialTaskStats = tasksRes.success && tasksRes.taskStats ? tasksRes.taskStats : { total: 0, processing: 0, pending: 0, completed: 0, failed: 0 };
  const initialProjects = projectsRes.success && projectsRes.projects ? projectsRes.projects : [];
  const initialScanConfigs = scanConfigsRes.success && scanConfigsRes.configs ? scanConfigsRes.configs : [];

  // Fetch connected AI apps
  const activeConnections = await db
    .select({ appSlug: connectHubConnections.appSlug })
    .from(connectHubConnections)
    .where(
      and(
        eq(connectHubConnections.teamId, teamId),
        eq(connectHubConnections.status, 'connected')
      )
    );
    
  const activeSlugs = activeConnections.map(c => c.appSlug);
  
  const connectedAiApps = ALL_CONNECTORS
    .filter(c => activeSlugs.includes(c.slug) && c.category === 'ai' && c.aiCapability?.includes('text') && c.aiModels && c.aiModels.length > 0)
    .map(c => ({
      slug: c.slug,
      name: c.name,
      models: c.aiModels?.filter(m => m.type === 'text') || []
    }));

  const connectedAiTtsApps = ALL_CONNECTORS
    .filter(c => activeSlugs.includes(c.slug) && c.category === 'ai' && c.aiCapability?.includes('tts'))
    .map(c => {
      let voices: string[] = [];
      const ttsAction = (c.actions || []).find(a => a.slug === 'text_to_speech' || a.group === 'tts');
      if (ttsAction && ttsAction.inputSchema) {
        const voiceInput = ttsAction.inputSchema.find(i => i.name === 'voice');
        if (voiceInput && voiceInput.options) {
          voices = voiceInput.options;
        }
      }
      return {
        slug: c.slug,
        name: c.name,
        voices
      };
    });

  const connectedAiImageApps = ALL_CONNECTORS
    .filter(c => activeSlugs.includes(c.slug) && c.category === 'ai' && c.aiCapability?.includes('image') && c.aiModels && c.aiModels.length > 0)
    .map(c => ({
      slug: c.slug,
      name: c.name,
      models: c.aiModels?.filter(m => m.type === 'image') || []
    }));

  return (
    <DashboardClient
      teamId={teamId}
      userId={user.id}
      teamName={team.name}
      connectedAiApps={connectedAiApps}
      connectedAiTtsApps={connectedAiTtsApps}
      connectedAiImageApps={connectedAiImageApps}
      initialTasks={initialTasks}
      initialTotalCount={initialTotalCount}
      initialTaskStats={initialTaskStats}
      initialProjects={initialProjects}
      initialScanConfigs={initialScanConfigs}
    />
  );
}
