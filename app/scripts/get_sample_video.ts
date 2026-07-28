import { db } from '../lib/db/drizzle';
import { filmEpisodes, filmSeries } from '../lib/db/schema';
import { eq, isNotNull } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function main() {
  const ep = await db.query.filmEpisodes.findFirst({
    where: isNotNull(filmEpisodes.timeline)
  });

  if (ep) {
    const series = await db.query.filmSeries.findFirst({
      where: eq(filmSeries.id, ep.seriesId)
    });
    console.log('=== SAMPLE_VIDEO_RESULT ===');
    console.log(JSON.stringify({
      seriesTitle: series?.title,
      episodeTitle: ep.title,
      summary: ep.summary,
      timeline: ep.timeline,
      videoUrl: ep.videoUrl
    }, null, 2));
  } else {
    console.log('No translated episode found');
  }
}

main().catch(console.error);
