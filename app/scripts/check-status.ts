import { db } from '../lib/db/drizzle';
import { downloaderProjects, downloaderVideos } from '../lib/db/schema';

async function main() {
  console.log("=== PROJECTS ===");
  const projects = await db.select().from(downloaderProjects);
  for (const p of projects) {
    console.log(`ID: ${p.id}, Name: ${p.name}, Status: ${p.status}, Total: ${p.totalVideos}, Downloaded: ${p.downloadedVideos}`);
  }

  console.log("\n=== VIDEOS ===");
  const videos = await db.select().from(downloaderVideos);
  console.log(`Total videos in DB: ${videos.length}`);
  
  const statusCounts = videos.reduce((acc: any, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1;
    return acc;
  }, {});
  console.log("Status counts:", statusCounts);

  if (videos.length > 0) {
    console.log("\nSample videos (first 5):");
    for (const v of videos.slice(0, 5)) {
      console.log(`ID: ${v.id}, ProjID: ${v.projectId}, Title: ${v.title}, Status: ${v.status}, Url: ${v.videoUrl}`);
    }
  }
  process.exit(0);
}

main().catch(console.error);
