import { db } from './lib/db/drizzle';
import { dubTasks, dubProjects, teams } from './lib/db/schema';
import { desc } from 'drizzle-orm';

async function main() {
  try {
    const allTeams = await db.select().from(teams);
    console.log("=== ALL TEAMS ===");
    console.log(allTeams.map(t => ({ id: t.id, name: t.name })));

    const tasks = await db.select().from(dubTasks).orderBy(desc(dubTasks.createdAt)).limit(10);
    console.log("=== RECENT 10 DUB TASKS ===");
    console.log(tasks.map(t => ({ id: t.id, status: t.status, teamId: t.teamId, title: t.sourceTitle })));
    
    const projects = await db.select().from(dubProjects).orderBy(desc(dubProjects.createdAt)).limit(10);
    console.log("=== RECENT 10 DUB PROJECTS ===");
    console.log(projects.map(p => ({ id: p.id, status: p.status, teamId: p.teamId, name: p.name })));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

main();
