import "dotenv/config";
import { db } from "../lib/db/drizzle";
import { filmSeries, filmEpisodes } from "../lib/db/schema";
import { like, eq, isNotNull } from "drizzle-orm";

async function main() {
  const seriesToUpdate = await db.select().from(filmSeries).where(like(filmSeries.description, "Bộ phim hấp dẫn:%"));
  let count = 0;
  for (const s of seriesToUpdate) {
    const ep = await db.query.filmEpisodes.findFirst({
      where: eq(filmEpisodes.seriesId, s.id)
    });
    if (ep && ep.summary && !ep.summary.startsWith("Phim hấp dẫn:")) {
      await db.update(filmSeries).set({ description: ep.summary }).where(eq(filmSeries.id, s.id));
      console.log(`Updated series ${s.id} with summary: ${ep.summary.substring(0, 30)}...`);
      count++;
    } else {
       console.log(`Series ${s.id} skipped - no valid ep summary`);
    }
  }
  console.log(`Done! Updated ${count} series.`);
}
main();
