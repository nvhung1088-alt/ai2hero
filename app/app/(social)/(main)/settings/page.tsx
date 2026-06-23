import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { socialProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SettingsClient } from './settings-client';
import { getTeamForUser } from '@/lib/db/queries';

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await db.query.socialProfiles.findFirst({
    where: eq(socialProfiles.userId, user.id)
  });

  if (!profile) {
    redirect('/profile');
  }

  const teamData = await getTeamForUser();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <SettingsClient user={user} profile={profile} defaultTeamId={teamData?.id} />
    </div>
  );
}
