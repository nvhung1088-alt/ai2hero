import { redirect } from 'next/navigation';
import { getTeamForUser } from '@/lib/db/queries';

export default async function SimAlertsRedirect() {
  const team = await getTeamForUser();
  if (!team) redirect('/dashboard');
  redirect(`/sim/t/${team.id}/alerts`);
}
