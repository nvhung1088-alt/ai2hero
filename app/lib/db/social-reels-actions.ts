'use server';

import { db } from './drizzle';
import { feedPosts, postMedia, users } from './schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { getUser } from './queries';
import { getFriendshipStatus } from './social-queries';

export async function getSuggestedReelsAction(limit: number = 5) {
  try {
    const currentUser = await getUser();
    if (!currentUser) return { data: [] };

    // Tìm các media là video
    const reelsRaw = await db
      .select({
        id: postMedia.id,
        postId: feedPosts.id,
        url: postMedia.url,
        thumbnailUrl: postMedia.thumbnailUrl,
        title: feedPosts.message,
        createdAt: feedPosts.createdAt,
        userId: feedPosts.userId,
        userName: users.name,
        userAvatar: users.avatarUrl,
        visibility: feedPosts.visibility
      })
      .from(postMedia)
      .innerJoin(feedPosts, eq(postMedia.postId, feedPosts.id))
      .innerJoin(users, eq(feedPosts.userId, users.id))
      .where(
        and(
          inArray(postMedia.type, ['video', 'video_upload', 'video_external']),
          eq(feedPosts.status, 'approved')
        )
      )
      .orderBy(desc(postMedia.createdAt))
      .limit(limit * 3); // Lấy nhiều hơn limit để lọc quyền riêng tư

    // Lọc quyền riêng tư
    const visibleReels = [];
    for (const reel of reelsRaw) {
      if (visibleReels.length >= limit) break;

      if (reel.userId === currentUser.id) {
        visibleReels.push(reel);
        continue;
      }

      if (reel.visibility === 'public') {
        visibleReels.push(reel);
        continue;
      }

      if (reel.visibility === 'friends') {
        const friendship = await getFriendshipStatus(currentUser.id, reel.userId);
        if (friendship === 'accepted') {
          visibleReels.push(reel);
        }
      }
    }

    // Format kết quả trả về
    const formattedReels = visibleReels.map((reel) => ({
      id: reel.id,
      postId: reel.postId,
      title: reel.title?.substring(0, 60) || 'Video Reels',
      views: Math.floor(Math.random() * 1000) + 'K', // Giả lập views nếu không có
      image: reel.thumbnailUrl || reel.url, // Dùng url trực tiếp cho src của video hoặc fallback
      url: reel.url,
      userName: reel.userName,
      userAvatar: reel.userAvatar
    }));

    return { data: formattedReels };
  } catch (error: any) {
    console.error('Lỗi khi lấy danh sách Reels:', error);
    return { error: error.message || 'Lỗi lấy dữ liệu' };
  }
}
