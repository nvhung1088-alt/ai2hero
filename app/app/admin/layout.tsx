import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { AdminShell } from './admin-shell';

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (user.role !== 'super_admin') {
    redirect('/dashboard/store');
  }

  return (
    <AdminShell user={{ name: user.name, email: user.email }}>
      {children}
    </AdminShell>
  );
}
