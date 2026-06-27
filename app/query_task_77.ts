import { db } from './lib/db/drizzle';
import { dubTasks } from './lib/db/schema';
import { desc, eq } from 'drizzle-orm';

async function main() {
  const tasks = await db.select({
    id: dubTasks.id,
    status: dubTasks.status,
    createdAt: dubTasks.createdAt
  }).from(dubTasks).orderBy(desc(dubTasks.id)).limit(10);
  console.log("Latest 10 tasks:", tasks);

  const task77 = await db.select().from(dubTasks).where(eq(dubTasks.id, 77)).limit(1);
  console.log("Task 77:", task77);
  process.exit(0);
}

main().catch(console.error);
