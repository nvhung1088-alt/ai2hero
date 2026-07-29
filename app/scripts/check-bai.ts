import "dotenv/config";
import { db } from "../lib/db/drizzle";
import { filmSeries } from "../lib/db/schema";
import { like } from "drizzle-orm";

async function main() {
  const series = await db.select().from(filmSeries).where(like(filmSeries.title, "%Bãi phế liệu%"));
  console.log("--- SERIES ---");
  console.log(series);
  process.exit(0);
}
main();
