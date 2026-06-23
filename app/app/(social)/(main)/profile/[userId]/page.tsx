import { notFound, redirect } from 'next/navigation';
import { getUser, getTeamsForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { 
  getSocialProfile, 
  getFriendsCount, 
  getMutualFriendsCount, 
  getUserFeedPosts,
  getTopFriends,
  getLatestPhotos,
  getMutualFriendsAvatars
} from '@/lib/db/social-queries';
import { getShopByUserId, getMarketplaceProducts } from '@/lib/db/marketplace-queries';
import { ProfileHeader } from '../profile-header';
import { ProfileTabs } from '../profile-tabs';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

interface ProfilePageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const resolvedParams = await params;
  const targetUserId = parseInt(resolvedParams.userId, 10);
  if (isNaN(targetUserId)) {
    notFound();
  }

  // 1. Lấy thông tin user hiện tại đang đăng nhập
  const currentUser = await getUser();
  const viewerId = currentUser ? currentUser.id : 0;

  // 2. Lấy thông tin user chủ của profile
  const targetUserRecord = await db.query.users.findFirst({
    where: eq(users.id, targetUserId),
    columns: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      role: true,
      createdAt: true
    }
  });

  if (!targetUserRecord) {
    notFound();
  }

  // 3. Lấy profile mạng xã hội, bạn bè và bài viết
  const profile = await getSocialProfile(targetUserId);
  if (!profile) {
    notFound();
  }

  const friendsCount = await getFriendsCount(targetUserId);
  const mutualFriendsCount = await getMutualFriendsCount(viewerId, targetUserId);
  const initialPosts = await getUserFeedPosts(targetUserId, viewerId, 1, 15);
  const teams = currentUser ? await getTeamsForUser(currentUser.id) : [];
  
  const topFriends = await getTopFriends(targetUserId, 9);
  const latestPhotos = await getLatestPhotos(targetUserId, 9);
  const mutualFriendsAvatars = await getMutualFriendsAvatars(viewerId, targetUserId, 5);

  const isOwnProfile = viewerId !== 0 && viewerId === targetUserId;

  // Lấy thông tin shop (nếu có) và sản phẩm của shop
  const targetUserTeams = await getTeamsForUser(targetUserId);
  const targetTeamId = targetUserTeams[0]?.id || 1;
  const shop = await getShopByUserId(targetTeamId, targetUserId);
  const shopProducts = shop ? await getMarketplaceProducts(targetTeamId, { shopId: shop.id, limit: 20 }) : [];

  return (
    <div className="w-full space-y-6 text-white px-4 md:px-6 pt-6 pb-20">


      <div className="space-y-6">
        {/* Header (Avatar, Cover, Name, Bio, Edit/Friend action) */}
        <ProfileHeader
          currentUser={currentUser}
          targetUser={{ ...targetUserRecord, profile }}
          isOwnProfile={isOwnProfile}
          friendsCount={friendsCount}
          mutualFriendsCount={mutualFriendsCount}
          mutualFriendsAvatars={mutualFriendsAvatars}
        />

        {/* Tabs: Posts, About, Friends */}
        <ProfileTabs
          currentUser={currentUser}
          targetUser={targetUserRecord}
          profile={profile}
          initialPosts={initialPosts}
          isOwnProfile={isOwnProfile}
          topFriends={topFriends}
          latestPhotos={latestPhotos}
          initialShop={shop || null}
          initialShopProducts={shopProducts}
        />
      </div>
    </div>
  );
}