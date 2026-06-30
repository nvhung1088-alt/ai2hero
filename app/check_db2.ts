import { db } from './lib/db';
import { dubTasks, dubProjects } from './lib/db/schema';
import { desc } from 'drizzle-orm';

async function main() {
  try {
    const tasks = await db.select().from(dubTasks).orderBy(desc(dubTasks.createdAt)).limit(5);
    console.log("=== RECENT 5 DUB TASKS ===");
    console.log(JSON.stringify(tasks, null, 2));
    
    const projects = await db.select().from(dubProjects).orderBy(desc(dubProjects.createdAt)).limit(5);
    console.log("=== RECENT 5 DUB PROJECTS ===");
    console.log(JSON.stringify(projects, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

main();
