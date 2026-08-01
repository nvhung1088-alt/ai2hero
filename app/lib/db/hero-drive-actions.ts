'use server';
import { db } from './drizzle';
import { driveScanConfigs, driveContents, driveFiles, DriveScanConfig, DriveContent, DriveFile } from './schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// === CONFIG ACTIONS ===

export async function getDriveScanConfigs(teamId: number) {
  try {
    const configs = await db
      .select()
      .from(driveScanConfigs)
      .where(eq(driveScanConfigs.teamId, teamId))
      .orderBy(desc(driveScanConfigs.createdAt));
    return { success: true, data: configs };
  } catch (error: any) {
    console.error('Error fetching drive scan configs:', error);
    return { success: false, error: error.message };
  }
}

export async function createDriveScanConfigAction(data: {
  teamId: number;
  userId: number;
  name: string;
  localFolderPath: string;
  connectionId?: number | null;
  targetFolderId?: string | null;
  deleteAfterUpload: boolean;
}) {
  try {
    const [newConfig] = await db
      .insert(driveScanConfigs)
      .values({
        teamId: data.teamId,
        userId: data.userId,
        name: data.name,
        localFolderPath: data.localFolderPath,
        connectionId: data.connectionId || null,
        targetFolderId: data.targetFolderId || null,
        deleteAfterUpload: data.deleteAfterUpload,
        isActive: true,
      })
      .returning();

    revalidatePath(`/hero-drive/t/${data.teamId}/dashboard`);
    return { success: true, data: newConfig };
  } catch (error: any) {
    console.error('Error creating drive scan config:', error);
    return { success: false, error: error.message };
  }
}

export async function toggleDriveScanConfigAction(id: number, teamId: number, isActive: boolean) {
  try {
    await db
      .update(driveScanConfigs)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(driveScanConfigs.id, id), eq(driveScanConfigs.teamId, teamId)));

    revalidatePath(`/hero-drive/t/${teamId}/dashboard`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteDriveScanConfigAction(id: number, teamId: number) {
  try {
    await db
      .delete(driveScanConfigs)
      .where(and(eq(driveScanConfigs.id, id), eq(driveScanConfigs.teamId, teamId)));

    revalidatePath(`/hero-drive/t/${teamId}/dashboard`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// === CONTENT & FILES ACTIONS ===

export async function getDriveContentsWithFiles(configId: number) {
  try {
    const contents = await db
      .select()
      .from(driveContents)
      .where(eq(driveContents.configId, configId))
      .orderBy(desc(driveContents.createdAt));

    const result = await Promise.all(
      contents.map(async (content) => {
        const files = await db
          .select()
          .from(driveFiles)
          .where(eq(driveFiles.contentId, content.id))
          .orderBy(driveFiles.fileName);
        return {
          ...content,
          files,
        };
      })
    );

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error fetching drive contents:', error);
    return { success: false, error: error.message };
  }
}
