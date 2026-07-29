import "dotenv/config";
import { db } from "../lib/db/drizzle";
import { filmSeries } from "../lib/db/schema";
import { desc, notLike } from "drizzle-orm";

async function main() {
  const series = await db.select({
    id: filmSeries.id,
    slug: filmSeries.slug,
    title: filmSeries.title,
    desc: filmSeries.description
  }).from(filmSeries)
    .where(notLike(filmSeries.description, "Bộ phim hấp dẫn:%"))
    .orderBy(desc(filmSeries.updatedAt))
    .limit(5);
    
  console.log(JSON.stringify(series, null, 2));
  process.exit(0);
}
main();
