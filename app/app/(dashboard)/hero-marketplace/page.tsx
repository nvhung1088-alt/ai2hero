import { redirect } from 'next/navigation';
import { getTeamForUser } from '@/lib/db/queries';

export default async function HeroMarketplaceRedirect() {
  const team = await getTeamForUser();
  if (!team) redirect('/dashboard');
  
  const activatedApps = Array.isArray(team.activatedApps) ? team.activatedApps : [];
  if (!activatedApps.includes('hero-marketplace')) {
    redirect('/dashboard');
  }

  redirect(`/hero-marketplace/t/${team.id}/dashboard`);
}
