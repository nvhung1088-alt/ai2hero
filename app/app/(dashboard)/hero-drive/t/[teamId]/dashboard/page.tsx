import { getUser, getTeamForUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { driveFolderMappings, connectHubConnections, driveProjects } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import DriveDashboardClient from './dashboard-client';

export default async function DriveDashboardPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr);

  const user = await getUser();
  if (!user) redirect('/sign-in');

  const team = await getTeamForUser();
  if (!team || team.id !== teamId) redirect('/dashboard');

  // Lấy hoặc khởi tạo default project cho Team nếu chưa có
  let defaultProject = await db.query.driveProjects.findFirst({
    where: eq(driveProjects.teamId, teamId),
  });

  if (!defaultProject) {
    const [newProj] = await db
      .insert(driveProjects)
      .values({
        teamId,
        userId: user.id,
        name: 'Default Project',
        status: 'active',
      })
      .returning();
    defaultProject = newProj;
  }

  // Lấy tất cả projects của teamId hiện tại
  const teamProjects = await db
    .select({ id: driveProjects.id })
    .from(driveProjects)
    .where(eq(driveProjects.teamId, teamId));

  const teamProjectIds = teamProjects.map((p) => p.id);

  // Fetch folder mappings CHỈ thuộc các project của teamId này (ngăn rò rỉ multi-tenancy)
  let mappings: any[] = [];
  if (teamProjectIds.length > 0) {
    mappings = await db
      .select()
      .from(driveFolderMappings)
      .where(inArray(driveFolderMappings.projectId, teamProjectIds))
      .orderBy(desc(driveFolderMappings.createdAt));
  }

  // Fetch all Google Drive Connections from Connect Hub
  const googleDriveConnections = await db
    .select()
    .from(connectHubConnections)
    .where(eq(connectHubConnections.teamId, teamId));

  const driveConns = googleDriveConnections.filter(
    (c) => c.appSlug === 'google-drive'
  );

  return (
    <DriveDashboardClient
      user={user}
      team={team}
      initialMappings={mappings}
      googleDriveConnections={driveConns}
      defaultProjectId={defaultProject.id}
    />
  );
}

