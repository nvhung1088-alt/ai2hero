import { redirect } from 'next/navigation';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getAdminProductsAction } from '@/lib/db/marketplace-actions';
import { ProductsClient } from './products-client';

export const metadata = {
  title: 'Quản lý Sản phẩm & Kho | AI2Hero',
};

export default async function AdminProductsPage({
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

  const productsResult = await getAdminProductsAction();
  const products = productsResult.success ? (productsResult.data || []) : [];

  return <ProductsClient currentUser={user} team={team} initialProducts={products} />;
}
