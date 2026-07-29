import "dotenv/config";
import { db } from "../lib/db/drizzle";
import { filmSeries, filmEpisodes } from "../lib/db/schema";
import { like, or, ilike } from "drizzle-orm";

async function main() {
  const series = await db.select({
    id: filmSeries.id,
    title: filmSeries.title,
    slug: filmSeries.slug,
  }).from(filmSeries).where(
    or(
      ilike(filmSeries.title, '%Thống Nhất Các Bộ Lặc%'),
      ilike(filmSeries.title, '%Kiến Thức Hiện Đại%'),
      ilike(filmSeries.title, '%Xuyên Về Thời Cổ Đại%')
    )
  );

  console.log("--- SERIES ---");
  console.log(series);

  const episodes = await db.select({
    id: filmEpisodes.id,
    title: filmEpisodes.title,
    seriesId: filmEpisodes.seriesId,
  }).from(filmEpisodes).where(
    or(
      ilike(filmEpisodes.title, '%Thống Nhất Các Bộ Lặc%'),
      ilike(filmEpisodes.title, '%Kiến Thức Hiện Đại%'),
      ilike(filmEpisodes.title, '%Xuyên Về Thời Cổ Đại%')
    )
  );

  console.log("--- EPISODES ---");
  console.log(episodes);

  process.exit(0);
}
main();
