import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { filmSeries } from '../lib/db/schema';
import { autoCategorizeFilm } from '../lib/utils/film-tags';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Fetching all film series...');
  const allSeries = await db.query.filmSeries.findMany();
  
  let updatedCount = 0;

  for (const series of allSeries) {
    const tags = await autoCategorizeFilm(series.teamId, series.title, series.description || '');
    
    // Always update to ensure logic is applied
    await db.update(filmSeries)
      .set({ 
          tags: tags,
          genre: tags.length > 0 ? tags[0] : series.genre
      })
      .where(eq(filmSeries.id, series.id));
      
    updatedCount++;
    console.log(`Updated [${series.title}] -> Tags: ${tags.join(', ')}`);
  }

  console.log(`Finished updating ${updatedCount} film series with tags.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
