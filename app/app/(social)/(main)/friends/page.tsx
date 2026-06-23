import { getUser } from '@/lib/db/queries';
import { getFriends, getFriendRequests } from '@/lib/db/social-queries';
import { getSuggestionsAction } from '@/lib/db/social-friend-actions';
import { FriendsClient } from './friends-client';

export const revalidate = 0;

export default async function FriendsPage() {
  const user = await getUser();
  if (!user) {
    return (
      <FriendsClient
        user={null}
        initialFriends={[]}
        initialPendingRequests={[]}
        initialSuggestions={[]}
      />
    );
  }

  // Fetch all friend relations data
  const friendsData = await getFriends(user.id);
  const pendingRequestsData = await getFriendRequests(user.id);
  const suggestionsRes = await getSuggestionsAction();
  const suggestionsData = suggestionsRes.data || [];

  // Map database structures to fit the client component properties strictly
  const friends = friendsData.map(f => ({
    id: f.id,
    name: f.name || 'Người dùng Hero',
    email: f.email,
    avatarUrl: f.avatarUrl,
    friendshipId: f.id, // client only tracks ID, safe placeholder
    bio: f.bio || '',
    location: ''
  }));

  const pendingRequests = pendingRequestsData.map(r => ({
    friendshipId: r.id, // DB query maps socialFriends.id to id
    requesterId: r.requesterId,
    name: r.name || 'Người dùng Hero',
    avatarUrl: r.avatarUrl,
    bio: '',
    createdAt: r.createdAt
  }));

  const suggestions = suggestionsData.map((s: any) => ({
    id: s.id,
    name: s.name || 'Người dùng Hero',
    avatarUrl: s.avatarUrl,
    bio: s.bio || ''
  }));

  return (
    <FriendsClient
      user={user}
      initialFriends={friends}
      initialPendingRequests={pendingRequests}
      initialSuggestions={suggestions}
    />
  );
}
