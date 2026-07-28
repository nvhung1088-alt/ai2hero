import { db } from '../lib/db/drizzle';
import { filmEpisodes } from '../lib/db/schema';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function audit() {
  const missingCondition = sql`(${filmEpisodes.timeline} IS NULL OR jsonb_typeof(${filmEpisodes.timeline}) != 'array' OR jsonb_array_length(${filmEpisodes.timeline}) = 0)`;
  
  const res = await db.select({ count: sql<number>`count(*)` })
    .from(filmEpisodes)
    .where(missingCondition);

  console.log('Episodes matching missingCondition:', res[0].count);

  const nullSummary = await db.select({ count: sql<number>`count(*)` })
    .from(filmEpisodes)
    .where(sql`${filmEpisodes.summary} IS NULL OR ${filmEpisodes.summary} = ''`);

  console.log('Episodes matching missing summary:', nullSummary[0].count);

  const sampleEps = await db.select({
    id: filmEpisodes.id,
    title: filmEpisodes.title,
    timeline: filmEpisodes.timeline,
    summary: filmEpisodes.summary
  }).from(filmEpisodes).limit(5);

  console.log('Sample 5 episodes raw:', JSON.stringify(sampleEps, null, 2));
}

audit().catch(console.error);
