import { db } from '../lib/db/drizzle';
import { downloaderVideos } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const [video] = await db.select().from(downloaderVideos).where(eq(downloaderVideos.id, 93));
  console.log(video);
  process.exit(0);
}
main();
