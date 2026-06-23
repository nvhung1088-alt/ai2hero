import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { discoverGroups } from '@/lib/db/social-group-actions';
import { DiscoverGroupsClient } from './discover-client';

export const revalidate = 0;

export default async function DiscoverGroupsPage() {
  const user = await getUser();

  const initialGroups = user ? await discoverGroups(user.id) : await discoverGroups(0);

  return <DiscoverGroupsClient user={user} initialGroups={initialGroups} />;
}
