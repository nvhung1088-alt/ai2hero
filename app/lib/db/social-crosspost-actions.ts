'use server'

import { db } from './drizzle';
import { socialCrossPosts, feedPosts, connectHubConnections } from './schema';
import { getUser } from './queries';
import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { executeCrossPost } from '../social-crosspost/crosspost-engine';

export async function createCrossPost(postId: number, platform: string, connectionId?: number) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  const post = await db.query.feedPosts.findFirst({
    where: and(eq(feedPosts.id, postId), eq(feedPosts.userId, user.id))
  });

  if (!post) throw new Error('Post not found or unauthorized');

  const [crossPost] = await db.insert(socialCrossPosts).values({
    postId,
    userId: user.id,
    platform,
    connectionId,
    status: 'pending'
  }).returning();

  return crossPost;
}

export async function getCrossPostsByPostId(postId: number) {
  return await db.query.socialCrossPosts.findMany({
    where: eq(socialCrossPosts.postId, postId)
  });
}

export async function updateCrossPostStatus(
  id: number, 
  data: { 
    status: 'pending' | 'published' | 'failed', 
    platformPostId?: string, 
    platformJobId?: string,
    errorMessage?: string,
    metrics?: any 
  }
) {
  const [updated] = await db.update(socialCrossPosts)
    .set({
      ...data,
      publishedAt: data.status === 'published' ? new Date() : undefined,
      updatedAt: new Date()
    })
    .where(eq(socialCrossPosts.id, id))
    .returning();

  return updated;
}

export async function executeCrossPostAction(
  postId: number,
  destinations: { connectionId: number, platform: string, targetId?: string }[],
  teamId: number
) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  const results = await executeCrossPost(postId, destinations, teamId);
  revalidatePath('/feed');
  return results;
}

export async function getConnectHubConnectionsAction(teamId: number) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');
  
  return await db.query.connectHubConnections.findMany({
    where: eq(connectHubConnections.teamId, teamId)
  });
}

