import { db } from './lib/db/drizzle';
import { downloaderVideos } from './lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const videos = await db.select().from(downloaderVideos).where(eq(downloaderVideos.projectId, 5));
  console.log(`Fixing ${videos.length} videos for project 5...`);

  for (const v of videos) {
    if (v.videoUrl.includes('douyin.com/video/BV')) {
      const newUrl = v.videoUrl.replace('https://www.douyin.com/video/', 'https://www.bilibili.com/video/');
      const newTitle = v.title.replace('Douyin BV', 'Bilibili BV');
      await db.update(downloaderVideos)
        .set({
          videoUrl: newUrl,
          title: newTitle,
          status: 'pending',
          error: null,
          extractStatus: null,
          updatedAt: new Date()
        })
        .where(eq(downloaderVideos.id, v.id));
    }
  }

  console.log('✅ Updated all video URLs to Bilibili format!');
}

main().catch(console.error).finally(() => process.exit());
