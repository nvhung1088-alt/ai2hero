import { redirect } from 'next/navigation';
import { getUser, getTeamsForUser } from '@/lib/db/queries';
import { getActiveTeamCookie } from '@/lib/team-cookie';
import {
  getTeamFeedPostsAction,
  getSocialConnectionsAction,
  getSchedulesAction
} from '@/lib/db/social-scheduler-actions';
import { SchedulerClient } from './scheduler-client';

export const revalidate = 0;

export default async function SchedulerPage() {
  const user = await getUser();
  if (!user) {
    redirect('/');
  }

  const teams = await getTeamsForUser(user.id);
  let activeTeamId = await getActiveTeamCookie();
  if (!activeTeamId && teams.length > 0) {
    activeTeamId = teams[0].id;
  }

  const teamId = activeTeamId || 0;

  // Load initial data
  const posts = teamId ? await getTeamFeedPostsAction(teamId) : [];
  const connections = teamId ? await getSocialConnectionsAction(teamId) : [];
  const schedules = teamId ? await getSchedulesAction(teamId) : [];

  // Serialization to avoid Date conversion warnings in RSC
  const safeUser = JSON.parse(JSON.stringify(user));
  const safePosts = JSON.parse(JSON.stringify(posts));
  const safeConnections = JSON.parse(JSON.stringify(connections));
  const safeSchedules = JSON.parse(JSON.stringify(schedules));

  return (
    <SchedulerClient
      user={safeUser}
      initialPosts={safePosts}
      connections={safeConnections}
      initialSchedules={safeSchedules}
      activeTeamId={teamId}
    />
  );
}
