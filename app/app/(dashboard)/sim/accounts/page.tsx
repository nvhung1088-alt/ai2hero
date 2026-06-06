import { redirect } from 'next/navigation';
import { getTeamForUser } from '@/lib/db/queries';

export default async function SimAccountsRedirect() {
  const team = await getTeamForUser();
  if (!team) redirect('/dashboard');
  redirect(`/sim/t/${team.id}/accounts`);
}
