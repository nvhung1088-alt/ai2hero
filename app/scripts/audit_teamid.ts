import { db } from '../lib/db/drizzle';
import { filmEpisodes } from '../lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function main() {
  // Count per teamId using drizzle groupBy
  const total3 = await db.select({ count: sql<number>`count(*)` }).from(filmEpisodes).where(eq(filmEpisodes.teamId, 3));
  
  const missing3 = await db.select({ count: sql<number>`count(*)` }).from(filmEpisodes)
    .where(sql`team_id = 3 AND (timeline IS NULL OR (jsonb_typeof(timeline) = 'array' AND jsonb_array_length(timeline) = 0) OR jsonb_typeof(timeline) != 'array')`);
  
  const hasTimeline3 = await db.select({ count: sql<number>`count(*)` }).from(filmEpisodes)
    .where(sql`team_id = 3 AND timeline IS NOT NULL AND jsonb_typeof(timeline) = 'array' AND jsonb_array_length(timeline) > 0`);

  console.log(`TeamId=3: total=${total3[0].count}, missing=${missing3[0].count}, has_timeline=${hasTimeline3[0].count}`);

  // Sample episodes with their timeline type
  const sample = await db.select({
    id: filmEpisodes.id,
    teamId: filmEpisodes.teamId,
    timelineIsNull: sql<boolean>`timeline IS NULL`,
    timelineType: sql<string>`CASE WHEN timeline IS NULL THEN 'NULL' ELSE jsonb_typeof(timeline) END`,
  }).from(filmEpisodes).where(eq(filmEpisodes.teamId, 3)).limit(5);
  
  console.log('\nSample 5 episodes teamId=3:');
  for (const row of sample) {
    console.log(`  id=${row.id}, teamId=${row.teamId}, timelineIsNull=${row.timelineIsNull}, timelineType=${row.timelineType}`);
  }
}

main().catch(console.error);
