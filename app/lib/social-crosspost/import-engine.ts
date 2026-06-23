import { db } from '../db/drizzle';
import { feedPosts, socialImportedPosts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { runConnectorAction } from '../connect-hub/connector-service';

export async function importFacebookPagePosts(
  teamId: number,
  userId: number,
  connectionId: number,
  limit: number = 20
) {
  try {
    const response = await runConnectorAction({
      teamId,
      connectionId,
      actionSlug: 'get_page_posts',
      input: { limit: limit.toString() },
      callerModule: 'social-import'
    });

    if (!response || !response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch page posts from Facebook');
    }

    const posts = Array.isArray(response.data) ? response.data : (response.data.data || []);
    let importedCount = 0;

    for (const fbPost of posts) {
      // Check if already imported
      const existingImport = await db
        .select()
        .from(socialImportedPosts)
        .where(
          and(
            eq(socialImportedPosts.connectionId, connectionId),
            eq(socialImportedPosts.externalPostId, fbPost.id)
          )
        )
        .limit(1);

      if (existingImport.length > 0) {
        continue; // Skip already imported post
      }

      // Map attachments
      const attachments = [];
      if (fbPost.full_picture) {
        attachments.push({ type: 'image', url: fbPost.full_picture });
      }

      // Insert to feedPosts
      const [newFeedPost] = await db.insert(feedPosts).values({
        teamId,
        userId,
        type: 'news',
        message: fbPost.message || '',
        attachments,
        appId: 'facebook',
        visibility: 'public',
        createdAt: fbPost.created_time ? new Date(fbPost.created_time) : new Date(),
        updatedAt: new Date()
      }).returning();

      if (newFeedPost) {
        // Track import
        await db.insert(socialImportedPosts).values({
          teamId,
          userId,
          connectionId,
          platform: 'facebook',
          externalPostId: fbPost.id,
          externalUrl: fbPost.permalink_url,
          feedPostId: newFeedPost.id,
          rawData: fbPost,
          syncStatus: 'synced',
          syncedAt: new Date()
        });
        importedCount++;
      }
    }

    return { success: true, importedCount };
  } catch (error: any) {
    console.error('[IMPORT ENGINE] Facebook error:', error);
    return { success: false, error: error.message };
  }
}
