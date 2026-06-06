import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { teamMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import SettingsPage from '../../../settings/page'; // Re-use component cũ

import { CookieSync } from '@/components/cookie-sync';

export default async function DynamicSettingsPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);
  if (isNaN(teamId)) redirect('/dashboard');

  const user = await getUser();
  if (!user) redirect('/sign-in');

  // IDOR Protection
  const membership = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, teamId)),
  });
  if (!membership) redirect('/dashboard');

  return (
    <>
      <CookieSync teamId={teamId} />
      <SettingsPage />
    </>
  );
}
