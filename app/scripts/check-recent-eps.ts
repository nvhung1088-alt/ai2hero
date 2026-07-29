import "dotenv/config";
import { db } from "../lib/db/drizzle";
import { filmSeries, filmEpisodes } from "../lib/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  const eps = await db.select({
    id: filmEpisodes.id,
    title: filmEpisodes.title,
    seriesId: filmEpisodes.seriesId,
    summary: filmEpisodes.summary,
    updatedAt: filmEpisodes.updatedAt
  }).from(filmEpisodes).orderBy(desc(filmEpisodes.updatedAt)).limit(10);

  console.log("--- RECENT EPISODES ---");
  console.log(eps);
  
  process.exit(0);
}
main();
