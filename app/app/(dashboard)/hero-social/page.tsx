import { redirect } from 'next/navigation';
import { getTeamForUser } from '@/lib/db/queries';

export default async function RedirectPage() {
  const team = await getTeamForUser();
  if (!team) redirect('/dashboard');
  redirect(`/hero-social/t/${team.id}/dashboard`);
}
