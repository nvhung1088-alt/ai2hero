import { db } from '../lib/db/drizzle';
import { downloaderVideos } from '../lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

async function main() {
  const projectId = 4; // Project bilibili fiml

  const res = await db
    .update(downloaderVideos)
    .set({ status: 'pending', progress: 0 })
    .where(
      and(
        eq(downloaderVideos.projectId, projectId),
        inArray(downloaderVideos.status, ['paused', 'failed'])
      )
    )
    .returning();

  console.log(`Successfully reset ${res.length} videos of Project ${projectId} to pending!`);
  process.exit(0);
}

main().catch(console.error);
