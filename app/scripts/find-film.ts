import "dotenv/config";
import { db } from "../lib/db/drizzle";
import { filmSeries, filmEpisodes } from "../lib/db/schema";
import { like, or, ilike } from "drizzle-orm";

async function main() {
  const series = await db.select({
    id: filmSeries.id,
    title: filmSeries.title,
    slug: filmSeries.slug,
    description: filmSeries.description
  }).from(filmSeries).where(
    or(
      ilike(filmSeries.title, '%Xuyên Về%'),
      ilike(filmSeries.title, '%Bộ Lặc%'),
      ilike(filmSeries.title, '%cổ đại%')
    )
  );

  console.log("--- SERIES ---");
  console.log(series);

  const episodes = await db.select({
    id: filmEpisodes.id,
    title: filmEpisodes.title,
    seriesId: filmEpisodes.seriesId,
    summary: filmEpisodes.summary
  }).from(filmEpisodes).where(
    or(
      ilike(filmEpisodes.title, '%Xuyên Về%'),
      ilike(filmEpisodes.title, '%Bộ Lặc%'),
      ilike(filmEpisodes.title, '%cổ đại%')
    )
  ).limit(10);

  console.log("--- EPISODES ---");
  console.log(episodes);

  process.exit(0);
}
main();
