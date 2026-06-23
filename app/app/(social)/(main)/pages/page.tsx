import { getUser } from '@/lib/db/queries';
import { PagesClient } from './pages-client';
import { getMyPages, getFollowedPages, discoverPages } from '@/lib/db/social-page-actions';

export const revalidate = 0;

export default async function PagesDashboard() {
  const user = await getUser();
  const userId = user?.id || 0;

  const myPages = userId ? await getMyPages(userId) : [];
  const followedPages = userId ? await getFollowedPages(userId) : [];
  const suggestedPages = await discoverPages(userId);

  return (
    <PagesClient 
      user={user} 
      myPages={myPages}
      followedPages={followedPages}
      suggestedPages={suggestedPages}
    />
  );
}
