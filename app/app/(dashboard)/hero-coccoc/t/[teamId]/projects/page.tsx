import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { coccocProjects, coccocProfiles, coccocSources, coccocTasks } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import ProjectsClient from './projects-client';

export const revalidate = 0;

export default async function HeroCoccocProjectsPage({
  params
}: {
  params: Promise<any>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);

  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  // 1. Fetch projects
  const projectsList = await db
    .select({
      id: coccocProjects.id,
      name: coccocProjects.name,
      profileId: coccocProjects.profileId,
      downloadFolder: coccocProjects.downloadFolder,
      schedule: coccocProjects.schedule,
      quality: coccocProjects.quality,
      isActive: coccocProjects.isActive,
      totalDownloaded: coccocProjects.totalDownloaded,
      maxTotalVideos: coccocProjects.maxTotalVideos,
      lastScanAt: coccocProjects.lastScanAt,
    })
    .from(coccocProjects)
    .where(eq(coccocProjects.teamId, teamId))
    .orderBy(desc(coccocProjects.createdAt));

  // 2. Fetch project details (sources count and tasks count) for metadata
  const projectsWithMetadata = await Promise.all(
    projectsList.map(async (project) => {
      const [sourcesCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(coccocSources)
        .where(eq(coccocSources.projectId, project.id));

      const [tasksCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(coccocTasks)
        .where(eq(coccocTasks.projectId, project.id));

      // Lấy Profile name tương ứng
      const [profile] = await db
        .select({ name: coccocProfiles.name })
        .from(coccocProfiles)
        .where(eq(coccocProfiles.id, project.profileId))
        .limit(1);

      return {
        ...project,
        profileName: profile?.name || 'Không xác định',
        sourcesCount: sourcesCount?.count || 0,
        tasksCount: tasksCount?.count || 0,
      };
    })
  );

  // 3. Fetch profiles list for creation form
  const profilesList = await db
    .select({ id: coccocProfiles.id, name: coccocProfiles.name })
    .from(coccocProfiles)
    .where(eq(coccocProfiles.teamId, teamId))
    .orderBy(desc(coccocProfiles.createdAt));

  return (
    <ProjectsClient
      teamId={teamId}
      userId={user.id}
      projects={projectsWithMetadata}
      profiles={profilesList}
    />
  );
}
