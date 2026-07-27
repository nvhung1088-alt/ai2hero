import { db } from './lib/db/drizzle';
import { downloaderProjects, downloaderVideos } from './lib/db/schema';
import { eq, desc } from 'drizzle-orm';

async function main() {
  const projects = await db.select().from(downloaderProjects).where(eq(downloaderProjects.name, 'Bilibili Phim lẻ'));
  if (projects.length === 0) {
    console.log("No project named 'Bilibili Phim lẻ' found");
    return;
  }
  const project = projects[0];
  console.log("Project:", project.name);
  console.log("Settings:", project.settings);
  
  const videos = await db.select().from(downloaderVideos).where(eq(downloaderVideos.projectId, project.id)).orderBy(desc(downloaderVideos.createdAt)).limit(5);
  console.log("Recent 5 videos:");
  for (const v of videos) {
    console.log(`- [${v.status}] ${v.title} (${v.videoUrl})`);
  }
}

main().catch(console.error).then(() => process.exit(0));
