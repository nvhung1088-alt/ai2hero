import { redirect } from 'next/navigation';
import { getUser, getTeamsForUser, getSystemSetting, DEFAULT_BILLING_PLANS } from '@/lib/db/queries';
import { StoreClient } from './store-client';

export default async function StorePage() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const teams = await getTeamsForUser(user.id);
  const systemPlans = await getSystemSetting('BILLING_PLANS');
  
  // Defensive fallback: If database config is empty or invalid, fallback to local DEFAULT_BILLING_PLANS
  const billingPlans = Array.isArray(systemPlans) && systemPlans.length > 0
    ? systemPlans
    : DEFAULT_BILLING_PLANS;

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

