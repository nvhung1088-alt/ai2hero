import { redirect } from 'next/navigation';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getMarketplaceProducts } from '@/lib/db/marketplace-queries';
import { MarketplaceClient } from './marketplace-client';

export const metadata = {
  title: 'Marketplace | AI2Hero',
};

export default async function MarketplacePage() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();
  if (!team) {
    redirect('/dashboard');
  }

  const products = await getMarketplaceProducts(team.id, { limit: 50 });

  return <MarketplaceClient currentUser={user} initialProducts={products} />;
}
