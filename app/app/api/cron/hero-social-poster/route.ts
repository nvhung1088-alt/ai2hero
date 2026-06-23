import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { heroSocialSchedules, feedPosts, connectHubConnections } from '@/lib/db/schema';
import { eq, lte, and, inArray } from 'drizzle-orm';
import { executeCrossPost } from '@/lib/social-crosspost/crosspost-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max

export async function GET(request: Request) {
  // Validate cron secret if needed (e.g. from Vercel)
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();
    
    // 1. Fetch pending schedules that are due
    const pendingSchedules = await db.query.heroSocialSchedules.findMany({
      where: and(
        eq(heroSocialSchedules.status, 'pending'),
        lte(heroSocialSchedules.scheduledAt, now)
      ),
      limit: 10 // process in batches
    });

    if (pendingSchedules.length === 0) {
      return NextResponse.json({ message: 'No pending schedules to process.' });
    }

    const results = [];

    // 2. Process each schedule
    for (const schedule of pendingSchedules) {
      try {
        // Mark as publishing
        await db.update(heroSocialSchedules)
          .set({ status: 'publishing' })
          .where(eq(heroSocialSchedules.id, schedule.id));

        const publishedPostIds: Record<string, any> = {};
        const platforms = Array.isArray(schedule.targetPlatforms) ? schedule.targetPlatforms : [];
        const connectionIds = Array.isArray(schedule.connectionIds) ? (schedule.connectionIds as number[]) : [];

        // Check if there are connections config
        if (connectionIds.length > 0) {
          const connections = await db.query.connectHubConnections.findMany({
            where: inArray(connectHubConnections.id, connectionIds)
          });

          // Build destinations array for crosspost engine
          const destinations = connections.map(conn => ({
            connectionId: conn.id,
            platform: conn.appSlug,
            targetId: undefined, // Will fallback to pageId in credentials
            videoFormat: (schedule.videoFormat || 'video') as 'reel' | 'video'
          }));

          if (destinations.length > 0 && schedule.sourcePostId) {
            const crossPostResults = await executeCrossPost(schedule.sourcePostId, destinations, schedule.teamId);

            // Collect results
            for (const res of crossPostResults) {
              if (res.success && res.data) {
                publishedPostIds[res.platform] = res.data.platformPostId || res.data.platformJobId || 'success';
              }
            }

            const hasSuccess = crossPostResults.some(res => res.success);
            if (!hasSuccess) {
              const errors = crossPostResults.map(res => `${res.platform}: ${res.error}`).join('; ');
              throw new Error(`Đăng bài thất bại trên tất cả nền tảng: ${errors}`);
            }
          }
        }

        // Post to internal iSocial Feed if requested
        if (platforms.includes('isocial')) {
          const [newPost] = await db.insert(feedPosts).values({
            teamId: schedule.teamId,
            userId: schedule.userId,
            message: schedule.content,
            type: 'post',
            attachments: schedule.mediaAttachments || [],
            appId: 'hero-social'
          }).returning({ id: feedPosts.id });
          
          publishedPostIds['isocial'] = newPost.id;
        }

        // Mark as published
        await db.update(heroSocialSchedules)
          .set({ 
            status: 'published',
            publishedPostIds: publishedPostIds,
            updatedAt: new Date()
          })
          .where(eq(heroSocialSchedules.id, schedule.id));

        results.push({ id: schedule.id, status: 'success', publishedPostIds });

      } catch (error: any) {
        // Mark as failed
        await db.update(heroSocialSchedules)
          .set({ 
            status: 'failed',
            errorMessage: error?.message || 'Unknown error during publishing',
            updatedAt: new Date()
          })
          .where(eq(heroSocialSchedules.id, schedule.id));
          
        results.push({ id: schedule.id, status: 'failed', error: error?.message });
      }
    }

    return NextResponse.json({ 
      message: `Processed ${pendingSchedules.length} schedules`,
      results 
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
