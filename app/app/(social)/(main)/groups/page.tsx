import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { getMyGroups } from '@/lib/db/social-group-actions';
import { getGroupsFeedPosts } from '@/lib/db/social-queries';
import { GroupsClient } from './groups-client';

export const revalidate = 0;

export default async function GroupsPage() {
  const user = await getUser();

  const myGroups = user ? await getMyGroups(user.id) : [];
  const feedPosts = user ? await getGroupsFeedPosts(user.id, user.id, 1, 15) : [];

  return (
    <GroupsClient 
      user={user} 
      initialGroups={myGroups} 
      initialFeedPosts={feedPosts}
    />
  );
}
