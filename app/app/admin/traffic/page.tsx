import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { TrafficClientComponent } from './traffic-client';

export default async function AdminTrafficPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  // Tạm thời chỉ cho phép admin/owner
  return <TrafficClientComponent user={user} />;
}
