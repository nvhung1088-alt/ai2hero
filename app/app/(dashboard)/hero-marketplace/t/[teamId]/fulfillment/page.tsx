import { getTeamForUser } from '@/lib/db/queries';
import { getAdminOrdersAction } from '@/lib/db/marketplace-actions';
import { redirect } from 'next/navigation';
import FulfillmentClient from './fulfillment-client';

export default async function FulfillmentPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const team = await getTeamForUser();
  const { teamId } = await params;

  if (!team || team.id.toString() !== teamId) {
    redirect('/dashboard');
  }

  // Load orders that need fulfillment
  const ordersResult = await getAdminOrdersAction();
  const orders = ordersResult.data || [];

  return <FulfillmentClient teamId={teamId} initialOrders={orders} />;
}
