import { redirect } from 'next/navigation';
import { getTeamForUser } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default async function RedirectPage() {
  const team = await getTeamForUser();
  if (!team) redirect('/dashboard');
  redirect(`/hero-report/t/${team.id}/dashboard`);
}
