import { desc, and, eq, or, inArray } from 'drizzle-orm';
import { db } from './drizzle';
import {
  socialProfiles,
  socialFriends,
  users,
  socialGroupMembers,
  feedPosts,
  feedComments,
  postMedia,
  feedLikes
} from './schema';

/**
 * Lấy profile mạng xã hội của một user.
 * Tự động tạo bản ghi trống nếu chưa tồn tại.
 */
export async function getSocialProfile(userId: number) {
  const profile = await db.query.socialProfiles.findFirst({
    where: eq(socialProfiles.userId, userId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
          createdAt: true
        }
      }
    }
  });

  if (profile) {
    return profile;
  }

  // Nếu chưa có, tự động tạo mới
  try {
    const [newProfile] = await db.insert(socialProfiles).values({
      userId: userId,
      bio: '',
      coverUrl: '',
      location: '',
      birthday: '',
      website: '',
      relationship: '',
      visibility: 'public'
    }).returning();

    // Fetch lại cùng user
    const fetchedProfile = await db.query.socialProfiles.findFirst({
      where: eq(socialProfiles.userId, userId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
            createdAt: true
          }
        }
      }
    });
    return fetchedProfile || null;
  } catch (error) {
    console.error('Lỗi khi tạo social profile:', error);
    return null;
  }
}

/**
 * Lấy danh sách ID bạn bè đã kết bạn của user.
 */
export async function getFriendIds(userId: number): Promise<number[]> {
  const friendships = await db.query.socialFriends.findMany({
    where: and(
      eq(socialFriends.status, 'accepted'),
      or(
        eq(socialFriends.requesterId, userId),
        eq(socialFriends.addresseeId, userId)
      )
    )
  });

  return friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
}

/**
 * Lấy danh sách thông tin chi tiết bạn bè
 */
export async function getFriends(userId: number) {
  const ids = await getFriendIds(userId);
  if (ids.length === 0) return [];

  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      bio: socialProfiles.bio,
      lastActiveAt: socialProfiles.lastActiveAt,
    })
    .from(users)
    .leftJoin(socialProfiles, eq(users.id, socialProfiles.userId))
    .where(inArray(users.id, ids));
}

export async function getFriendsWithProfile(userId: number) {
  return getFriends(userId);
}

/**
 * Lấy danh sách lời mời kết bạn gửi đến user này
 */
export async function getFriendRequests(userId: number) {
  const requests = await db
    .select({
      id: socialFriends.id,
      requesterId: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      createdAt: socialFriends.createdAt
    })
    .from(socialFriends)
    .innerJoin(users, eq(socialFriends.requesterId, users.id))
    .leftJoin(socialProfiles, eq(users.id, socialProfiles.userId))
    .where(
      and(
        eq(socialFriends.addresseeId, userId),
        eq(socialFriends.status, 'pending')
      )
    );
  return requests;
}

/**
 * Lấy trạng thái kết bạn hiện tại giữa user và targetUser
 */
export async function getFriendshipStatus(userId: number, targetUserId: number) {
  const friendship = await db.query.socialFriends.findFirst({
    where: or(
      and(eq(socialFriends.requesterId, userId), eq(socialFriends.addresseeId, targetUserId)),
      and(eq(socialFriends.requesterId, targetUserId), eq(socialFriends.addresseeId, userId))
    )
  });

  if (!friendship) return 'none';
  if (friendship.status === 'accepted') return 'accepted';
  if (friendship.status === 'blocked') return 'blocked';
  if (friendship.status === 'pending') {
    return friendship.requesterId === userId ? 'pending_sent' : 'pending_received';
  }
  return 'none';
}

/**
 * Lấy danh sách các nhóm user đã tham gia
 */
export async function getUserGroups(userId: number) {
  const memberships = await db.query.socialGroupMembers.findMany({
    where: eq(socialGroupMembers.userId, userId),
    with: {
      group: true
    }
  });

  return memberships.map(m => m.group).filter(Boolean);
}

/**
 * Đếm số lượng bạn bè của user
 */
export async function getFriendsCount(userId: number): Promise<number> {
  const ids = await getFriendIds(userId);
  return ids.length;
}

/**
 * Đếm số lượng bạn chung giữa 2 user
 */
export async function getMutualFriendsCount(userId1: number, userId2: number): Promise<number> {
  const friends1 = await getFriendIds(userId1);
  const friends2 = await getFriendIds(userId2);
  const intersect = friends1.filter(id => friends2.includes(id));
  return intersect.length;
}

/**
 * Lấy các bài viết của một user cụ thể
 */
export async function getUserFeedPosts(userId: number, currentUserId: number, page: number = 1, limit: number = 15) {
  const offset = (page - 1) * limit;

  let visibilityCondition;
  if (currentUserId === userId) {
    visibilityCondition = eq(feedPosts.userId, userId);
  } else {
    const friendshipStatus = await getFriendshipStatus(currentUserId, userId);
    if (friendshipStatus === 'accepted') {
      visibilityCondition = and(
        eq(feedPosts.userId, userId),
        inArray(feedPosts.visibility, ['public', 'friends']),
        eq(feedPosts.status, 'approved')
      );
    } else {
      visibilityCondition = and(
        eq(feedPosts.userId, userId),
        eq(feedPosts.visibility, 'public'),
        eq(feedPosts.status, 'approved')
      );
    }
  }

  const postsRaw = await db.query.feedPosts.findMany({
    where: visibilityCondition,
    limit,
    offset,
    orderBy: [desc(feedPosts.createdAt)],
    with: {
      user: {
        columns: { id: true, name: true, email: true, avatarUrl: true, role: true }
      },
      comments: { 
        orderBy: [desc(feedComments.createdAt)],
        with: {
          likesList: true
        }
      },
      likesList: true,
      media: { orderBy: postMedia.sortOrder },
      sharedPost: {
        with: {
          user: { columns: { id: true, name: true, email: true, avatarUrl: true } },
          media: { orderBy: postMedia.sortOrder }
        }
      }
    }
  });

  return postsRaw.map(post => {
    // Post reactions
    const myLike = post.likesList.find((like: any) => like.userId === currentUserId);
    const likedByMe = !!myLike;
    const myReactionType = myLike ? myLike.reactionType : null;

    const reactionsSummary: Record<string, number> = {};
    post.likesList.forEach((like: any) => {
      const type = like.reactionType || 'like';
      reactionsSummary[type] = (reactionsSummary[type] || 0) + 1;
    });

    // Map comments with their reactions
    const commentsWithLikes = post.comments.map((comment: any) => {
      const commMyLike = comment.likesList?.find((like: any) => like.userId === currentUserId);
      const commLikedByMe = !!commMyLike;
      const commReactionType = commMyLike ? commMyLike.reactionType : null;
      
      const commLikesSummary: Record<string, number> = {};
      comment.likesList?.forEach((like: any) => {
        const type = like.reactionType || 'like';
        commLikesSummary[type] = (commLikesSummary[type] || 0) + 1;
      });

      return {
        ...comment,
        likesCount: comment.likesList?.length || 0,
        likedByMe: commLikedByMe,
        reactionType: commReactionType,
        reactionsSummary: commLikesSummary,
        replies: [] as any[]
      };
    });

    // Build comment tree
    const commentMap = new Map<number, any>();
    commentsWithLikes.forEach(c => commentMap.set(c.id, c));

    const rootComments: any[] = [];
    const sortedComments = [...commentsWithLikes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sortedComments.forEach(comment => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(comment);
        } else {
          rootComments.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    rootComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      ...post,
      userName: post.user?.name || 'Hệ thống',
      userAvatar: post.user?.avatarUrl || '👤',
      userRole: post.user?.role || 'member',
      timestamp: new Date(post.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(post.createdAt).toISOString().split('T')[0],
      likesCount: post.likesList.length,
      commentsCount: post.comments.length,
      likedByMe,
      myReactionType,
      reactionsSummary,
      comments: rootComments,
      pinned: post.pinned === 1,
      pinnedBy: post.pinnedBy || undefined,
      mentions: Array.isArray(post.mentions) ? post.mentions : [],
      attachments: Array.isArray(post.attachments) ? post.attachments : [],
      resultMetrics: Array.isArray(post.resultMetrics) ? post.resultMetrics : []
    };
  });
}

export async function getGroupPendingMembers(groupId: number) {
  return await db.query.socialGroupMembers.findMany({
    where: and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.status, 'pending')),
    with: {
      user: {
        columns: { id: true, name: true, email: true, avatarUrl: true }
      }
    },
    orderBy: [desc(socialGroupMembers.joinedAt)]
  });
}

export async function getGroupPendingPosts(groupId: number) {
  return await db.query.feedPosts.findMany({
    where: and(eq(feedPosts.groupId, groupId), eq(feedPosts.status, 'pending')),
    with: {
      user: {
        columns: { id: true, name: true, email: true, avatarUrl: true }
      },
      media: { orderBy: postMedia.sortOrder }
    },
    orderBy: [desc(feedPosts.createdAt)]
  });
}

/**
 * Lấy danh sách giới hạn bạn bè để hiển thị trên Sidebar/Box bạn bè
 */
export async function getTopFriends(userId: number, limit = 9) {
  const ids = await getFriendIds(userId);
  if (ids.length === 0) return [];

  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      bio: socialProfiles.bio,
      lastActiveAt: socialProfiles.lastActiveAt,
    })
    .from(users)
    .leftJoin(socialProfiles, eq(users.id, socialProfiles.userId))
    .where(inArray(users.id, ids))
    .limit(limit);
}

/**
 * Lấy các ảnh mới nhất của người dùng từ postMedia
 */
export async function getLatestPhotos(userId: number, limit = 9): Promise<string[]> {
  const mediaList = await db
    .select({
      url: postMedia.url
    })
    .from(postMedia)
    .innerJoin(feedPosts, eq(postMedia.postId, feedPosts.id))
    .where(
      and(
        eq(feedPosts.userId, userId),
        eq(postMedia.type, 'image'),
        eq(feedPosts.status, 'approved')
      )
    )
    .orderBy(desc(postMedia.createdAt))
    .limit(limit);

  return mediaList.map((m) => m.url);
}

/**
 * Lấy danh sách avatar của bạn chung
 */
export async function getMutualFriendsAvatars(currentUserId: number, targetUserId: number, limit = 5) {
  const friends1 = await getFriendIds(currentUserId);
  const friends2 = await getFriendIds(targetUserId);
  const intersectIds = friends1.filter((id) => friends2.includes(id));
  if (intersectIds.length === 0) return [];

  return await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(inArray(users.id, intersectIds))
    .limit(limit);
}

/**
 * Lấy danh sách các ID nhóm mà user đã tham gia (status = 'approved')
 */
export async function getUserJoinedGroupIds(userId: number): Promise<number[]> {
  const memberships = await db.query.socialGroupMembers.findMany({
    where: and(
      eq(socialGroupMembers.userId, userId),
      eq(socialGroupMembers.status, 'approved')
    ),
    columns: {
      groupId: true
    }
  });
  return memberships.map((m) => m.groupId);
}

/**
 * Lấy bảng tin bài viết từ tất cả các nhóm mà user tham gia
 */
export async function getGroupsFeedPosts(userId: number, currentUserId: number, page: number = 1, limit: number = 15) {
  const groupIds = await getUserJoinedGroupIds(userId);
  if (groupIds.length === 0) return [];

  const offset = (page - 1) * limit;

  const postsRaw = await db.query.feedPosts.findMany({
    where: and(
      inArray(feedPosts.groupId, groupIds),
      eq(feedPosts.status, 'approved')
    ),
    limit,
    offset,
    orderBy: [desc(feedPosts.createdAt)],
    with: {
      user: {
        columns: { id: true, name: true, email: true, avatarUrl: true, role: true }
      },
      comments: { 
        orderBy: [desc(feedComments.createdAt)],
        with: {
          likesList: true
        }
      },
      likesList: true,
      media: { orderBy: postMedia.sortOrder },
      group: {
        columns: { id: true, name: true, coverUrl: true }
      }
    }
  });

  return postsRaw.map(post => {
    const myLike = post.likesList.find((like: any) => like.userId === currentUserId);
    const likedByMe = !!myLike;
    const myReactionType = myLike ? myLike.reactionType : null;

    const reactionsSummary: Record<string, number> = {};
    post.likesList.forEach((like: any) => {
      const type = like.reactionType || 'like';
      reactionsSummary[type] = (reactionsSummary[type] || 0) + 1;
    });

    const commentsWithLikes = post.comments.map((comment: any) => {
      const commMyLike = comment.likesList?.find((like: any) => like.userId === currentUserId);
      const commLikedByMe = !!commMyLike;
      const commReactionType = commMyLike ? commMyLike.reactionType : null;
      
      const commLikesSummary: Record<string, number> = {};
      comment.likesList?.forEach((like: any) => {
        const type = like.reactionType || 'like';
        commLikesSummary[type] = (commLikesSummary[type] || 0) + 1;
      });

      return {
        ...comment,
        likesCount: comment.likesList?.length || 0,
        likedByMe: commLikedByMe,
        reactionType: commReactionType,
        reactionsSummary: commLikesSummary,
        replies: [] as any[]
      };
    });

    const commentMap = new Map<number, any>();
    commentsWithLikes.forEach(c => commentMap.set(c.id, c));

    const rootComments: any[] = [];
    const sortedComments = [...commentsWithLikes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sortedComments.forEach(comment => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(comment);
        } else {
          rootComments.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    rootComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      ...post,
      userName: post.user?.name || 'Hệ thống',
      userAvatar: post.user?.avatarUrl || '👤',
      userRole: post.user?.role || 'member',
      timestamp: new Date(post.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(post.createdAt).toISOString().split('T')[0],
      likesCount: post.likesList.length,
      commentsCount: post.comments.length,
      likedByMe,
      myReactionType,
      reactionsSummary,
      comments: rootComments,
      pinned: post.pinned === 1,
      pinnedBy: post.pinnedBy || undefined,
      mentions: Array.isArray(post.mentions) ? post.mentions : [],
      attachments: Array.isArray(post.attachments) ? post.attachments : [],
      resultMetrics: Array.isArray(post.resultMetrics) ? post.resultMetrics : []
    };
  });
}