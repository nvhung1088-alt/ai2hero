import { db } from './lib/db/drizzle';
import { dubTasks } from './lib/db/schema';
import { desc } from 'drizzle-orm';

async function main() {
  const tasks = await db.query.dubTasks.findMany({
    orderBy: [desc(dubTasks.createdAt)],
    limit: 3,
  });
  console.log(JSON.stringify(tasks, null, 2));
  process.exit(0);
}
main();
