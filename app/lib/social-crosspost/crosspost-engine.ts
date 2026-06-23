import { runConnectorAction } from '../connect-hub/connector-service';
import { db } from '../db/drizzle';
import { feedPosts, socialCrossPosts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createCrossPost, updateCrossPostStatus } from '../db/social-crosspost-actions';

export async function executeCrossPost(
  postId: number,
  destinations: { connectionId: number, platform: string, targetId?: string, videoFormat?: 'reel' | 'video' }[],
  teamId: number
) {
  const post = await db.query.feedPosts.findFirst({
    where: eq(feedPosts.id, postId),
    with: { media: true }
  });

  if (!post) throw new Error('Post not found');

  const results = [];

  for (const dest of destinations) {
    // 1. Tạo record trạng thái pending kèm connectionId
    const crossPost = await createCrossPost(postId, dest.platform, dest.connectionId);

    try {
      // 2. Chuẩn bị payload và định tuyến actionSlug động
      let actionSlug = 'create_post';
      const input: any = {};

      const mediaList = post.media || [];
      const videos = mediaList.filter(m => m.type.includes('video'));
      const images = mediaList.filter(m => m.type.includes('image'));

      if (dest.platform === 'facebook') {
        if (videos.length > 0) {
          const videoUrl = videos[0].url;
          if (dest.videoFormat === 'reel') {
            actionSlug = 'publish_reel';
            input.pageId = dest.targetId;
            input.videoUrl = videoUrl;
            input.description = post.message;
          } else {
            actionSlug = 'publish_video';
            input.pageId = dest.targetId;
            input.videoUrl = videoUrl;
            input.title = post.taskTitle || '';
            input.description = post.message;
          }
        } else if (images.length > 0) {
          if (images.length === 1) {
            actionSlug = 'publish_photo';
            input.pageId = dest.targetId;
            input.imageUrl = images[0].url;
            input.caption = post.message;
          } else {
            actionSlug = 'publish_photos';
            input.pageId = dest.targetId;
            input.imageUrls = images.map(img => img.url);
            input.message = post.message;
          }
        } else {
          actionSlug = 'post_feed';
          input.pageId = dest.targetId;
          input.message = post.message;
        }
      } else if (dest.platform === 'tiktok') {
        if (videos.length > 0) {
          actionSlug = 'publish_video';
          input.videoUrl = videos[0].url;
          input.title = post.message;
        } else {
          throw new Error('TikTok chỉ hỗ trợ đăng video. Bài viết này không có video đính kèm.');
        }
      } else {
        // Fallback cho Zalo và các platform khác
        actionSlug = 'create_post';
        input.message = post.message;
        if (mediaList.length > 0) {
          input.mediaUrls = mediaList.map(m => m.url);
        }
        if (dest.targetId) {
          input.targetId = dest.targetId;
        }
      }

      // 3. Gọi qua Connect Hub
      const response = await runConnectorAction({
        teamId,
        connectionId: dest.connectionId,
        actionSlug,
        input,
        callerModule: 'social-crosspost'
      });

      if (response.success) {
        // 4. Update thành công
        const updated = await updateCrossPostStatus(crossPost.id, {
          status: 'published',
          platformPostId: response.data?.id || response.data?.postId || response.data?.video_id || null,
          platformJobId: response.data?.publish_id || null // Dành cho TikTok
        });
        results.push({ platform: dest.platform, success: true, data: updated });
      } else {
        // Update thất bại
        const updated = await updateCrossPostStatus(crossPost.id, {
          status: 'failed',
          errorMessage: response.error || 'Unknown error from connector',
        });
        results.push({ platform: dest.platform, success: false, error: response.error });
      }

    } catch (err: any) {
      // Fallback update thất bại
      const updated = await updateCrossPostStatus(crossPost.id, {
        status: 'failed',
        errorMessage: err.message || 'System error during crosspost',
      });
      results.push({ platform: dest.platform, success: false, error: err.message });
    }
  }

  return results;
}
