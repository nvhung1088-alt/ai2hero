import { redirect } from 'next/navigation';
import { getUser, getTeamForUser, getInvitationsForTeam } from '@/lib/db/queries';
import { MembersClient } from './members-client';

export default async function MembersPage() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();
  if (!team) {
    redirect('/dashboard');
  }

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
