import { getCurrentTeamId } from '@/lib/sim-helpers';
import { getSimEmployees, getSimPlatforms } from '@/lib/db/sim-queries';
import { getSystemSetting } from './actions';
import SettingsClient from './settings-client';
import { db } from '@/lib/db/drizzle';
import { teamMembers, users } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

export const revalidate = 0;

export default async function SettingsPage() {
  const teamId = await getCurrentTeamId();
  
  // Fetch data concurrently from DB
  const [employees, platforms, savedSettings, dbMembers] = await Promise.all([
    getSimEmployees(teamId),
    getSimPlatforms(teamId),
    getSystemSetting(`sim_settings_team_${teamId}`, true),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId))
  ]);

  // Lấy vai trò thực tế của user trong Workspace hiện tại
  const user = await getUser();
  let userRole = 'member';
  if (user) {
    const member = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)))
      .limit(1);
    if (member.length > 0) {
      userRole = member[0].role;
    }
  }

  return (
    <SettingsClient 
      initialEmployees={employees} 
      initialPlatforms={platforms} 
      savedSettings={savedSettings} 
      teamId={teamId}
      teamMembers={dbMembers}
      userRole={userRole}
    />
  );
}
