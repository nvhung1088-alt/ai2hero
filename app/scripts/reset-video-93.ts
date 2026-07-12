import { db } from '../lib/db/drizzle';
import { downloaderVideos } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  await db
    .update(downloaderVideos)
    .set({
      status: 'pending',
      directMp4Url: null,
      extractStatus: null,
      error: null,
      progress: 0,
      updatedAt: new Date()
    })
    .where(eq(downloaderVideos.id, 93));
  console.log('Reset video 93 to pending');
  process.exit(0);
}
main();
