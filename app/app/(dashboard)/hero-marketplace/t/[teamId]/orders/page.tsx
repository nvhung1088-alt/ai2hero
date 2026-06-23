import { redirect } from 'next/navigation';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getAdminOrdersAction } from '@/lib/db/marketplace-actions';
import { OrdersClient } from './orders-client';

export const metadata = {
  title: 'Quản lý Đơn hàng | AI2Hero',
};

export default async function AdminOrdersPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();
  const { teamId } = await params;
  if (!team || team.id.toString() !== teamId) {
    redirect('/dashboard');
  }

  const ordersResult = await getAdminOrdersAction();
  const orders = ordersResult.success ? (ordersResult.data || []) : [];

  return <OrdersClient currentUser={user} team={team} initialOrders={orders} />;
}
