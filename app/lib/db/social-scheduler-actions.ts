'use server'

import { db } from './drizzle';
import { feedPosts, connectHubConnections, heroSocialSchedules } from './schema';
import { getUser } from './queries';
import { and, eq, inArray, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getTeamFeedPostsAction(
  teamId: number,
  filters?: { mediaType?: 'image' | 'video' | 'text' }
) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  const whereConditions = [
    eq(feedPosts.teamId, teamId),
    eq(feedPosts.status, 'approved')
  ];

  const posts = await db.query.feedPosts.findMany({
    where: and(...whereConditions),
    orderBy: [desc(feedPosts.createdAt)],
    with: {
      media: true
    }
  });

  if (filters?.mediaType) {
    return posts.filter(post => {
      const hasVideo = post.media?.some(m => m.type.includes('video')) || false;
      const hasImage = post.media?.some(m => m.type.includes('image')) || false;

      if (filters.mediaType === 'video') return hasVideo;
      if (filters.mediaType === 'image') return hasImage && !hasVideo;
      if (filters.mediaType === 'text') return !hasImage && !hasVideo;
      return true;
    });
  }

  return posts;
}

export async function getSocialConnectionsAction(teamId: number) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await db.query.connectHubConnections.findMany({
    where: and(
      eq(connectHubConnections.teamId, teamId),
      inArray(connectHubConnections.appSlug, ['facebook', 'tiktok', 'zalo']),
      eq(connectHubConnections.status, 'connected')
    )
  });
}

export async function createBatchSchedulesAction(params: {
  teamId: number;
  postIds: number[];
  platforms: string[];
  connectionIds: number[];
  mode: 'auto_interval' | 'custom';
  intervalHours?: number;
  startAt?: string; // string representation of Date to pass over client-server safely
  customSchedules?: { postId: number; scheduledAt: string }[];
  videoFormat?: 'video' | 'reel';
}) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  const {
    teamId,
    postIds,
    platforms,
    connectionIds,
    mode,
    intervalHours = 2,
    startAt,
    customSchedules,
    videoFormat
  } = params;

  if (!postIds || postIds.length === 0) {
    throw new Error('Chưa chọn bài viết nào để lập lịch.');
  }

  // Fetch full details of the posts
  const posts = await db.query.feedPosts.findMany({
    where: and(
      eq(feedPosts.teamId, teamId),
      inArray(feedPosts.id, postIds)
    ),
    with: {
      media: true
    }
  });

  const batchId = `batch_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
  const insertValues = [];
  const baseStartDate = startAt ? new Date(startAt) : new Date();

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    let scheduledAt = new Date(baseStartDate);

    if (mode === 'auto_interval') {
      scheduledAt.setHours(scheduledAt.getHours() + (i * intervalHours));
    } else if (mode === 'custom' && customSchedules) {
      const custom = customSchedules.find(cs => cs.postId === post.id);
      if (custom) {
        scheduledAt = new Date(custom.scheduledAt);
      }
    }

    const mediaList = post.media?.map(m => ({
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl || ''
    })) || [];

    insertValues.push({
      teamId,
      userId: user.id,
      sourcePostId: post.id,
      content: post.message,
      mediaAttachments: mediaList,
      videoFormat: videoFormat || 'video',
      batchId,
      scheduledAt,
      status: 'pending',
      targetPlatforms: platforms,
      connectionIds: connectionIds,
    });
  }

  const created = await db.insert(heroSocialSchedules).values(insertValues).returning();
  revalidatePath('/scheduler');
  return { success: true, batchId, count: created.length };
}

export async function getSchedulesAction(teamId: number) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await db.query.heroSocialSchedules.findMany({
    where: eq(heroSocialSchedules.teamId, teamId),
    orderBy: [desc(heroSocialSchedules.scheduledAt)]
  });
}

export async function cancelScheduleAction(scheduleId: number) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  const [updated] = await db.update(heroSocialSchedules)
    .set({
      status: 'failed',
      errorMessage: 'Bị huỷ bởi người dùng.',
      updatedAt: new Date()
    })
    .where(eq(heroSocialSchedules.id, scheduleId))
    .returning();

  revalidatePath('/scheduler');
  return updated;
}

export async function retryScheduleAction(scheduleId: number) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  const [updated] = await db.update(heroSocialSchedules)
    .set({
      status: 'pending',
      scheduledAt: new Date(),
      errorMessage: null,
      updatedAt: new Date()
    })
    .where(eq(heroSocialSchedules.id, scheduleId))
    .returning();

  revalidatePath('/scheduler');
  return updated;
}
