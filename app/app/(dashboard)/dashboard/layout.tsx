import { redirect } from 'next/navigation';
import { getUser, getTeamsForUser } from '@/lib/db/queries';
import { SidebarClient } from './sidebar-client';

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const teams = await getTeamsForUser(user.id);

  return (
    <SidebarClient teams={teams}>
      {children}
    </SidebarClient>
  );
}
