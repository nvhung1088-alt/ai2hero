import { redirect } from 'next/navigation';
import { getUser, getTeamWithMembers, getInvitationsForTeam } from '@/lib/db/queries';
import { MembersClient } from '../../../members/members-client'; // Re-use component cũ
import { db } from '@/lib/db/drizzle';
import { teamMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export default async function DynamicMembersPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);
  if (isNaN(teamId)) redirect('/dashboard');

  const user = await getUser();
  if (!user) redirect('/sign-in');

  // IDOR Protection: Verify user belongs to this team
  const membership = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, teamId)),
  });
  if (!membership) redirect('/dashboard');

  const team = await getTeamWithMembers(teamId);
  if (!team) redirect('/dashboard');

  const invitations = await getInvitationsForTeam(team.id);

  return (
    <MembersClient
      currentUser={user}
      initialMembers={team.teamMembers || []}
      initialInvitations={invitations || []}
      team={team}
    />
  );
}
