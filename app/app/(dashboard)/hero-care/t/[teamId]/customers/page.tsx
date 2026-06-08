import { getCustomersAction } from '@/lib/db/hero-care-actions';
import CustomersClient from './customers-client';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function CustomersPage({
  params
}: {
  params: Promise<any>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);

  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  // Tải danh sách khách hàng ban đầu từ Server Action
  const customersRes = await getCustomersAction(teamId, 100);
  const customers = customersRes.success && customersRes.data ? customersRes.data : [];

  return (
    <div className="w-full">
      <CustomersClient
        teamId={teamId}
        initialCustomers={customers as any[]}
      />
    </div>
  );
}
