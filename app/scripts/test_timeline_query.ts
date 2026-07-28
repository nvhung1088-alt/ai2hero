import { db } from '../lib/db/drizzle';
import { filmEpisodes } from '../lib/db/schema';
import { sql, count } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function main() {
  const missingTimelineEps = await db.select({ id: filmEpisodes.id, title: filmEpisodes.title, timeline: filmEpisodes.timeline })
    .from(filmEpisodes)
    .where(sql`${filmEpisodes.timeline} IS NULL OR jsonb_typeof(${filmEpisodes.timeline}) != 'array' OR jsonb_array_length(${filmEpisodes.timeline}) = 0`)
    .limit(5);

  const totalMissing = await db.select({ count: count() })
    .from(filmEpisodes)
    .where(sql`${filmEpisodes.timeline} IS NULL OR jsonb_typeof(${filmEpisodes.timeline}) != 'array' OR jsonb_array_length(${filmEpisodes.timeline}) = 0`);

  console.log('Total episodes needing AI timeline:', totalMissing[0].count);
  console.log('Sample 5 episodes:', missingTimelineEps);
}

main().catch(console.error);
