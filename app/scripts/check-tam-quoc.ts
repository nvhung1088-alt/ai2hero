import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { filmSeries, filmEpisodes } from '../lib/db/schema';
import { eq, sql } from 'drizzle-orm';

async function check() {
  const series = await db.query.filmSeries.findMany({
    where: sql`LOWER(${filmSeries.title}) LIKE '%tam quốc%' OR LOWER(${filmSeries.title}) LIKE '%xuyên không%'`,
    with: { episodes: true }
  });
  
  console.log(`Found ${series.length} series:`);
  for (const s of series) {
    console.log(`- Series: [${s.id}] ${s.title}`);
    for (const e of (s as any).episodes) {
      console.log(`  + Ep ${e.episodeNumber}: ${e.title} (${e.videoUrl})`);
    }
  }
  process.exit(0);
}
check();
