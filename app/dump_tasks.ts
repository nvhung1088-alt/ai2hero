import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { dubTasks } from './lib/db/schema';
import { desc } from 'drizzle-orm';

// Try 5433 and 54322
const url = process.env.POSTGRES_URL?.replace('5433', '54322');
const client = postgres(url!);
const db = drizzle(client);

async function main() {
  try {
    const tasks = await db.select({ id: dubTasks.id, sourceUrl: dubTasks.sourceUrl }).from(dubTasks).orderBy(desc(dubTasks.createdAt)).limit(5);
    console.log(JSON.stringify(tasks, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
main();
