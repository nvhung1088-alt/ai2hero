import "dotenv/config";
import { db } from "../lib/db/drizzle";
import { filmSeries } from "../lib/db/schema";
import { ilike } from "drizzle-orm";

async function main() {
  const series = await db.select({
    id: filmSeries.id,
    title: filmSeries.title,
    slug: filmSeries.slug,
  }).from(filmSeries).where(
    ilike(filmSeries.slug, '%xuyen-ve-thoi-co-dai%')
  );

  console.log("--- SERIES BY SLUG ---");
  console.log(series);
  
  process.exit(0);
}
main();
