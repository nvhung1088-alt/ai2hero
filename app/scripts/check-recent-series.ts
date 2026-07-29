import "dotenv/config";
import { db } from "../lib/db/drizzle";
import { filmSeries, filmEpisodes } from "../lib/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  const series = await db.select({
    id: filmSeries.id,
    title: filmSeries.title,
    slug: filmSeries.slug,
    description: filmSeries.description,
    updatedAt: filmSeries.updatedAt
  }).from(filmSeries).orderBy(desc(filmSeries.updatedAt)).limit(10);

  console.log("--- RECENT SERIES ---");
  console.log(series);
  
  process.exit(0);
}
main();
