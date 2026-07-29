import "dotenv/config";
import { db } from "../lib/db/drizzle";
import { filmSeries, filmEpisodes } from "../lib/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  const series = await db.select({ id: filmSeries.id, title: filmSeries.title, description: filmSeries.description }).from(filmSeries).orderBy(desc(filmSeries.updatedAt)).limit(3);
  console.log("--- SERIES ---");
  console.log(series);
  const eps = await db.select({ id: filmEpisodes.id, title: filmEpisodes.title, summary: filmEpisodes.summary }).from(filmEpisodes).orderBy(desc(filmEpisodes.updatedAt)).limit(3);
  console.log("--- EPISODES ---");
  console.log(eps);
  process.exit(0);
}
main();
