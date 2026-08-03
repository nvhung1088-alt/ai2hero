'use server';

import { db } from './drizzle';
import {
  driveProjects,
  driveFolderMappings,
  driveScanConfigs,
  driveContents,
  driveFiles,
} from './schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// === PROJECT ACTIONS ===

export async function getDriveProjects(teamId: number) {
  try {
    const projects = await db
      .select()
      .from(driveProjects)
      .where(eq(driveProjects.teamId, teamId))
      .orderBy(desc(driveProjects.createdAt));
    return { success: true, data: projects };
  } catch (error: any) {
    console.error('Error fetching drive projects:', error);
    return { success: false, error: error.message };
  }
}

export async function createDriveProjectAction(data: {
  teamId: number;
  userId: number;
  name: string;
  description?: string;
}) {
  try {
    const [newProject] = await db
      .insert(driveProjects)
      .values({
        teamId: data.teamId,
        userId: data.userId,
        name: data.name,
        description: data.description || null,
        status: 'active',
      })
      .returning();

    revalidatePath(`/hero-drive/t/${data.teamId}/dashboard`);
    return { success: true, data: newProject };
  } catch (error: any) {
    console.error('Error creating drive project:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteDriveProjectAction(id: number, teamId: number) {
  try {
    await db
      .delete(driveProjects)
      .where(and(eq(driveProjects.id, id), eq(driveProjects.teamId, teamId)));

    revalidatePath(`/hero-drive/t/${teamId}/dashboard`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// === FOLDER MAPPING ACTIONS ===

export async function getDriveFolderMappings(projectId: number) {
  try {
    const mappings = await db
      .select()
      .from(driveFolderMappings)
      .where(eq(driveFolderMappings.projectId, projectId))
      .orderBy(desc(driveFolderMappings.createdAt));
    return { success: true, data: mappings };
  } catch (error: any) {
    console.error('Error fetching folder mappings:', error);
    return { success: false, error: error.message };
  }
}

export async function createDriveFolderMappingAction(data: {
  projectId: number;
  name: string;
  localFolderPath: string;
  connectionId?: number | null;
  targetFolderId?: string | null;
  targetFolderName?: string | null;
  deleteAfterUpload: boolean;
  scanInterval?: number;
}) {
  try {
    const [newMapping] = await db
      .insert(driveFolderMappings)
      .values({
        projectId: data.projectId,
        name: data.name,
        localFolderPath: data.localFolderPath,
        connectionId: data.connectionId || null,
        targetFolderId: data.targetFolderId || null,
        targetFolderName: data.targetFolderName || null,
        deleteAfterUpload: data.deleteAfterUpload,
        scanInterval: data.scanInterval || 10,
        isActive: true,
        status: 'idle',
      })
      .returning();

    return { success: true, data: newMapping };
  } catch (error: any) {
    console.error('Error creating folder mapping:', error);
    return { success: false, error: error.message };
  }
}

export async function toggleDriveFolderMappingAction(id: number, projectId: number, isActive: boolean) {
  try {
    await db
      .update(driveFolderMappings)
      .set({
        isActive,
        status: isActive ? 'idle' : 'paused',
        updatedAt: new Date(),
      })
      .where(and(eq(driveFolderMappings.id, id), eq(driveFolderMappings.projectId, projectId)));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateDriveFolderMappingAction(id: number, data: {
  name?: string;
  localFolderPath?: string;
  connectionId?: number | null;
  targetFolderId?: string | null;
  targetFolderName?: string | null;
  deleteAfterUpload?: boolean;
  scanInterval?: number;
}) {
  try {
    const [updated] = await db
      .update(driveFolderMappings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(driveFolderMappings.id, id))
      .returning();

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating folder mapping:', error);
    return { success: false, error: error.message };
  }
}

export async function triggerImmediateScanAction(id: number) {
  try {
    const [updated] = await db
      .update(driveFolderMappings)
      .set({
        lastScanAt: null,
        status: 'scanning',
        updatedAt: new Date(),
      })
      .where(eq(driveFolderMappings.id, id))
      .returning();

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteDriveFolderMappingAction(id: number, projectId: number) {
  try {
    await db
      .delete(driveFolderMappings)
      .where(and(eq(driveFolderMappings.id, id), eq(driveFolderMappings.projectId, projectId)));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getFolderMappingHistoryAction(mappingId: number) {
  try {
    const contents = await db
      .select()
      .from(driveContents)
      .where(eq(driveContents.mappingId, mappingId))
      .orderBy(desc(driveContents.createdAt));

    if (contents.length === 0) {
      return { success: true, data: [] };
    }

    const contentIds = contents.map((c) => c.id);
    const allFiles = await db
      .select()
      .from(driveFiles)
      .where(inArray(driveFiles.contentId, contentIds))
      .orderBy(driveFiles.fileName);

    const filesByContentId = new Map<number, any[]>();
    for (const f of allFiles) {
      if (!filesByContentId.has(f.contentId)) {
        filesByContentId.set(f.contentId, []);
      }
      filesByContentId.get(f.contentId)!.push(f);
    }

    const result = contents.map((content) => ({
      ...content,
      files: filesByContentId.get(content.id) || [],
    }));

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error fetching mapping history:', error);
    return { success: false, error: error.message };
  }
}

// === LEGACY SCAN CONFIG ACTIONS ===

export async function getDriveScanConfigs(teamId: number) {
  try {
    const configs = await db
      .select()
      .from(driveScanConfigs)
      .where(eq(driveScanConfigs.teamId, teamId))
      .orderBy(desc(driveScanConfigs.createdAt));
    return { success: true, data: configs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// === CONTENTS & FILES ACTIONS ===

export async function getDriveContentsWithFilesByProject(projectId: number) {
  try {
    const contents = await db
      .select()
      .from(driveContents)
      .where(eq(driveContents.projectId, projectId))
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

export async function cleanAndResetMappingAction(mappingId: number) {
  try {
    const contents = await db
      .select({ id: driveContents.id })
      .from(driveContents)
      .where(eq(driveContents.mappingId, mappingId));

    if (contents.length > 0) {
      const contentIds = contents.map((c) => c.id);
      await db
        .delete(driveFiles)
        .where(
          and(
            inArray(driveFiles.contentId, contentIds),
            inArray(driveFiles.status, ['pending', 'failed'])
          )
        );

      const remainingFiles = await db
        .select({ contentId: driveFiles.contentId })
        .from(driveFiles)
        .where(inArray(driveFiles.contentId, contentIds));

      const activeContentIds = new Set(remainingFiles.map((f) => f.contentId));
      const unusedContentIds = contentIds.filter((id) => !activeContentIds.has(id));

      if (unusedContentIds.length > 0) {
        await db.delete(driveContents).where(inArray(driveContents.id, unusedContentIds));
      }
    }

    revalidatePath('/hero-drive');
    return { success: true };
  } catch (error: any) {
    console.error('Error cleaning mapping action:', error);
    return { success: false, error: error.message };
  }
}

export async function retryFailedFilesAction(mappingId: number) {
  try {
    const contents = await db
      .select({ id: driveContents.id })
      .from(driveContents)
      .where(eq(driveContents.mappingId, mappingId));

    if (contents.length > 0) {
      const contentIds = contents.map((c) => c.id);
      await db
        .update(driveFiles)
        .set({
          status: 'pending',
          error: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(driveFiles.contentId, contentIds),
            eq(driveFiles.status, 'failed')
          )
        );
    }

    revalidatePath('/hero-drive');
    return { success: true };
  } catch (error: any) {
    console.error('Error retrying failed files action:', error);
    return { success: false, error: error.message };
  }
}
