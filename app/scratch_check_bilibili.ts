import { db } from './lib/db/drizzle';
import { downloaderProjects, downloaderVideos } from './lib/db/schema';
import { eq, like } from 'drizzle-orm';

async function main() {
  const projects = await db.select().from(downloaderProjects).where(like(downloaderProjects.name, '%vilivili%'));
  console.log('--- PROJECTS MATCHING vilivili ---');
  console.dir(projects, { depth: null });

  if (projects.length > 0) {
    const videos = await db.select().from(downloaderVideos).where(eq(downloaderVideos.projectId, projects[0].id)).limit(10);
    console.log(`--- VIDEOS FOR PROJECT ${projects[0].name} (${videos.length} items) ---`);
    console.dir(videos, { depth: null });
  }
}

main().catch(console.error).finally(() => process.exit());
