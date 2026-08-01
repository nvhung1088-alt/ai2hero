import { getUser, getTeamForUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { driveContents, driveFiles } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import ContentsClient from './contents-client';

export default async function DriveContentsPage({
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

  const contents = await db
    .select()
    .from(driveContents)
    .where(eq(driveContents.teamId, teamId))
    .orderBy(desc(driveContents.createdAt));

  const contentsWithFiles = await Promise.all(
    contents.map(async (c) => {
      const files = await db
        .select()
        .from(driveFiles)
        .where(eq(driveFiles.contentId, c.id))
        .orderBy(driveFiles.fileName);
      return {
        ...c,
        files,
      };
    })
  );

  return <ContentsClient teamId={teamId} initialContents={contentsWithFiles} />;
}
