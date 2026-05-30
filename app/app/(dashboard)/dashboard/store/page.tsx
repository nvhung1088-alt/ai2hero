import { redirect } from 'next/navigation';
import { getUser, getTeamsForUser, getSystemSetting } from '@/lib/db/queries';
import { StoreClient } from './store-client';

export default async function StorePage() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const teams = await getTeamsForUser(user.id);
  const billingPlans = (await getSystemSetting('BILLING_PLANS')) as any[];

  if (teams.length === 0) {
    redirect('/dashboard');
  }

  return (
    <StoreClient 
      user={user} 
      teams={teams} 
      billingPlans={billingPlans} 
    />
  );
}
