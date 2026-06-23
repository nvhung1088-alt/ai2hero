import { AdminShell } from '../admin-shell';
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { SocialReportsClient } from './social-reports-client';
import { getAdminSocialReportsAction } from '@/lib/db/admin-social-actions';

export default async function SocialReportsPage() {
  const user = await getUser();
  if (!user || user.role !== 'owner') {
    redirect('/login');
  }

  const { data: pendingReports } = await getAdminSocialReportsAction('pending');
  const { data: resolvedReports } = await getAdminSocialReportsAction('resolved');
  const { data: dismissedReports } = await getAdminSocialReportsAction('dismissed');

  return (
    <AdminShell user={{ name: user.name, email: user.email }}>
      <SocialReportsClient 
        pending={pendingReports || []} 
        resolved={resolvedReports || []} 
        dismissed={dismissedReports || []} 
      />
    </AdminShell>
  );
}
