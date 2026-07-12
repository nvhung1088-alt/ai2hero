import { db } from './lib/db/drizzle';
import { downloaderProjects, downloaderVideos, downloaderSettings, downloaderCookies } from './lib/db/schema';
import { eq, and, isNull, lt, asc, desc, inArray, notInArray } from 'drizzle-orm';

async function test() {
  const teamId = 7; 
  const activeIds: number[] = [];

  console.log("Starting DB Query Test...");
  try {
    console.log("1. Testing Stuck Videos query...");
    const stuckVideos = await db
      .select({ id: downloaderVideos.id })
      .from(downloaderVideos)
      .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
      .where(
        and(
          eq(downloaderProjects.teamId, teamId),
          eq(downloaderVideos.status, 'downloading'),
          activeIds.length > 0 ? notInArray(downloaderVideos.id, activeIds) : undefined
        )
      );
    console.log("Stuck videos count:", stuckVideos.length);

    console.log("2. Testing Settings query...");
    const [settings] = await db.select().from(downloaderSettings).where(eq(downloaderSettings.teamId, teamId)).limit(1);
    console.log("Settings maxConcurrentDownloads:", settings?.maxConcurrentDownloads);

    console.log("3. Testing Projects query...");
    const scanTasksQuery = await db
      .select()
      .from(downloaderProjects)
      .where(
        and(
          eq(downloaderProjects.teamId, teamId),
          eq(downloaderProjects.status, 'active')
        )
      )
      .limit(10);
    console.log("Active projects count:", scanTasksQuery.length);

    console.log("4. Testing force_pending query...");
    const forcePendingVideos = await db
      .select({ id: downloaderVideos.id })
      .from(downloaderVideos)
      .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
      .where(
        and(
          eq(downloaderProjects.teamId, teamId),
          eq(downloaderVideos.status, 'force_pending')
        )
      );
    console.log("Force pending count:", forcePendingVideos.length);

    console.log("5. Testing Cookies query...");
    const cookies = await db
      .select({ id: downloaderCookies.id })
      .from(downloaderCookies)
      .where(
        and(
          eq(downloaderCookies.teamId, teamId),
          eq(downloaderCookies.status, 'alive')
        )
      );
    console.log("Cookies count:", cookies.length);

    console.log("SUCCESS: All queries executed fine.");
  } catch (err: any) {
    console.error("FAILED with error:", err);
  }
}

test();
