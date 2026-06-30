'use server';

import { db } from './drizzle';
import { downloaderProjects, downloaderVideos, downloaderCookies, downloaderSettings, teams, users } from './schema';
import { eq, and, desc, sql, isNull, gt, inArray } from 'drizzle-orm';
import { getUser } from './queries';
import { generateLinkCode } from './extension-actions';

// ============================================================
// PAIR CODE
// ============================================================

export async function generateDownloaderPairCodeAction(teamId: number) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    
    return await generateLinkCode(teamId, user.id);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// PROJECTS
// ============================================================

export async function getDownloaderProjectsAction(teamId: number) {
  try {
    const projectsList = await db
      .select()
      .from(downloaderProjects)
      .where(eq(downloaderProjects.teamId, teamId))
      .orderBy(desc(downloaderProjects.createdAt));
    return { success: true, projects: projectsList };
  } catch (error: any) {
    console.error('[hero-downloader-actions] getDownloaderProjectsAction error:', error);
    return { error: 'Failed to get projects: ' + error.message };
  }
}

export async function createDownloaderProjectAction(data: {
  teamId: number;
  userId?: number;
  name: string;
  platform?: string;
  sourceUrl: string;
  settings?: any;
}) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const [project] = await db
      .insert(downloaderProjects)
      .values({
        teamId: data.teamId,
        userId: user.id,
        name: data.name,
        platform: data.platform || 'custom',
        sourceUrl: data.sourceUrl,
        settings: data.settings,
        status: 'idle',
      })
      .returning();
    return { success: true, project };
  } catch (error: any) {
    console.error('[hero-downloader-actions] createDownloaderProjectAction error:', error);
    return { error: 'Failed to create project: ' + error.message };
  }
}

export async function updateDownloaderProjectAction(id: number, teamId: number, data: {
  name?: string;
  platform?: string;
  sourceUrl?: string;
  status?: string;
  totalVideos?: number;
  downloadedVideos?: number;
  lastScanAt?: Date | null;
  settings?: any;
}) {
  try {
    const [project] = await db
      .update(downloaderProjects)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(downloaderProjects.id, id), eq(downloaderProjects.teamId, teamId)))
      .returning();

    if (data.status === 'active' && project) {
      await db
        .update(downloaderVideos)
        .set({ status: 'pending', progress: 0 })
        .where(
          and(
            eq(downloaderVideos.projectId, id),
            inArray(downloaderVideos.status, ['paused', 'failed'])
          )
        );
    }
    return { success: true, project };
  } catch (error: any) {
    console.error('[hero-downloader-actions] updateDownloaderProjectAction error:', error);
    return { error: 'Failed to update project: ' + error.message };
  }
}

export async function deleteDownloaderProjectAction(id: number, teamId: number) {
  try {
    await db
      .delete(downloaderProjects)
      .where(and(eq(downloaderProjects.id, id), eq(downloaderProjects.teamId, teamId)));
    return { success: true };
  } catch (error: any) {
    console.error('[hero-downloader-actions] deleteDownloaderProjectAction error:', error);
    return { error: 'Failed to delete project: ' + error.message };
  }
}

// ============================================================
// VIDEOS
// ============================================================

export async function getDownloaderVideosAction(teamId: number, projectId?: number) {
  try {
    let videosList;

    if (projectId) {
      // Nếu có projectId thì chỉ cần query bảng downloaderVideos là đủ an toàn
      videosList = await db
        .select()
        .from(downloaderVideos)
        .where(eq(downloaderVideos.projectId, projectId))
        .orderBy(desc(downloaderVideos.createdAt));
    } else {
      // Nếu không có projectId, join với downloaderProjects để lấy theo teamId
      videosList = await db
        .select({
          id: downloaderVideos.id,
          projectId: downloaderVideos.projectId,
          videoUrl: downloaderVideos.videoUrl,
          title: downloaderVideos.title,
          author: downloaderVideos.author,
          thumbnailUrl: downloaderVideos.thumbnailUrl,
          duration: downloaderVideos.duration,
          status: downloaderVideos.status,
          progress: downloaderVideos.progress,
          downloadSpeed: downloaderVideos.downloadSpeed,
          localPath: downloaderVideos.localPath,
          error: downloaderVideos.error,
          createdAt: downloaderVideos.createdAt,
          updatedAt: downloaderVideos.updatedAt,
          sizeBytes: downloaderVideos.sizeBytes,
          actualSizeBytes: downloaderVideos.actualSizeBytes,
        })
        .from(downloaderVideos)
        .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
        .where(eq(downloaderProjects.teamId, teamId))
        .orderBy(desc(downloaderVideos.createdAt));
    }

    return { success: true, videos: videosList };
  } catch (error: any) {
    console.error('[hero-downloader-actions] getDownloaderVideosAction error:', error);
    return { error: 'Failed to get videos: ' + error.message };
  }
}

export async function createDownloaderVideoAction(data: {
  projectId: number;
  title?: string;
  videoUrl?: string;
}) {
  try {
    const [video] = await db
      .insert(downloaderVideos)
      .values({
        projectId: data.projectId,
        title: data.title || 'Untitled Video',
        videoUrl: data.videoUrl || '',
        status: 'pending',
        progress: 0,
      })
      .returning();
    
    // Update total videos count in project
    const projectCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(downloaderVideos)
      .where(eq(downloaderVideos.projectId, data.projectId));
      
    await db.update(downloaderProjects)
      .set({ totalVideos: projectCount[0]?.count || 0 })
      .where(eq(downloaderProjects.id, data.projectId));

    return { success: true, video };
  } catch (error: any) {
    console.error('[hero-downloader-actions] createDownloaderVideoAction error:', error);
    return { error: 'Failed to create video: ' + error.message };
  }
}

export async function updateDownloaderVideoAction(id: number, teamId: number, data: {
  title?: string;
  status?: string;
  progress?: number;
  speed?: string;
  localPath?: string;
  errorMessage?: string;
  duration?: string;
  sizeBytes?: number;
}) {
  try {
    // If status is completed, record timestamp
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.status === 'completed') {
      updateData.downloadCompletedAt = new Date();
    } else if (data.status === 'downloading' && data.progress === 0) {
      updateData.downloadStartedAt = new Date();
    }

    const [video] = await db
      .update(downloaderVideos)
      .set(updateData)
      .where(eq(downloaderVideos.id, id))
      .returning();
      
    // Update downloaded count if completed
    if (data.status === 'completed' && video) {
      const downloadedCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(downloaderVideos)
        .where(and(
          eq(downloaderVideos.projectId, video.projectId),
          eq(downloaderVideos.status, 'completed')
        ));
        
      await db.update(downloaderProjects)
        .set({ downloadedVideos: downloadedCount[0]?.count || 0 })
        .where(eq(downloaderProjects.id, video.projectId));
    }

    return { success: true, video };
  } catch (error: any) {
    console.error('[hero-downloader-actions] updateDownloaderVideoAction error:', error);
    return { error: 'Failed to update video: ' + error.message };
  }
}

export async function deleteDownloaderVideoAction(id: number, teamId: number) {
  try {
    const [video] = await db
      .select({ projectId: downloaderVideos.projectId })
      .from(downloaderVideos)
      .where(eq(downloaderVideos.id, id))
      .limit(1);

    await db
      .delete(downloaderVideos)
      .where(eq(downloaderVideos.id, id));
      
    // Update counts
    if (video) {
      const counts = await db
        .select({
          total: sql<number>`count(*)::int`,
          downloaded: sql<number>`sum(case when status = 'completed' then 1 else 0 end)::int`
        })
        .from(downloaderVideos)
        .where(eq(downloaderVideos.projectId, video.projectId));
        
      await db.update(downloaderProjects)
        .set({ 
          totalVideos: counts[0]?.total || 0,
          downloadedVideos: counts[0]?.downloaded || 0 
        })
        .where(eq(downloaderProjects.id, video.projectId));
    }

    return { success: true };
  } catch (error: any) {
    console.error('[hero-downloader-actions] deleteDownloaderVideoAction error:', error);
    return { error: 'Failed to delete video: ' + error.message };
  }
}

// ============================================================
// COOKIES
// ============================================================

export async function updateDownloaderVideoStatusAction(id: number, teamId: number, status: string) {
  try {
    // Verify video belongs to the team's project
    const [video] = await db
      .select({ id: downloaderVideos.id, projectId: downloaderVideos.projectId })
      .from(downloaderVideos)
      .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
      .where(and(eq(downloaderVideos.id, id), eq(downloaderProjects.teamId, teamId)))
      .limit(1);

    if (!video) {
      return { error: 'Video not found or unauthorized' };
    }

    await db.update(downloaderVideos).set({ status, updatedAt: new Date() }).where(eq(downloaderVideos.id, id));
    return { success: true };
  } catch (error: any) {
    console.error('[hero-downloader-actions] updateDownloaderVideoStatusAction error:', error);
    return { error: 'Failed to update video status: ' + error.message };
  }
}

export async function getDownloaderCookiesAction(teamId: number) {
  try {
    const cookiesList = await db
      .select()
      .from(downloaderCookies)
      .where(eq(downloaderCookies.teamId, teamId))
      .orderBy(desc(downloaderCookies.createdAt));
    return { success: true, cookies: cookiesList };
  } catch (error: any) {
    console.error('[hero-downloader-actions] getDownloaderCookiesAction error:', error);
    return { error: 'Failed to get cookies: ' + error.message };
  }
}

export async function createDownloaderCookieAction(data: {
  teamId: number;
  name: string;
  cookieData: string;
}) {
  try {
    const [cookie] = await db
      .insert(downloaderCookies)
      .values({
        teamId: data.teamId,
        name: data.name,
        cookieData: data.cookieData,
        status: 'unknown',
      })
      .returning();
    return { success: true, cookie };
  } catch (error: any) {
    console.error('[hero-downloader-actions] createDownloaderCookieAction error:', error);
    return { error: 'Failed to create cookie: ' + error.message };
  }
}

export async function deleteDownloaderCookieAction(id: number, teamId: number) {
  try {
    await db
      .delete(downloaderCookies)
      .where(and(eq(downloaderCookies.id, id), eq(downloaderCookies.teamId, teamId)));
    return { success: true };
  } catch (error: any) {
    console.error('[hero-downloader-actions] deleteDownloaderCookieAction error:', error);
    return { error: 'Failed to delete cookie: ' + error.message };
  }
}

// ============================================================
// SETTINGS
// ============================================================

export async function getDownloaderSettingsAction(teamId: number) {
  try {
    let [settings] = await db
      .select()
      .from(downloaderSettings)
      .where(eq(downloaderSettings.teamId, teamId))
      .limit(1);
      
    // Create default settings if not exists
    if (!settings) {
      [settings] = await db
        .insert(downloaderSettings)
        .values({
          teamId,
          maxConcurrentScans: 5,
          maxConcurrentDownloads: 3,
          autoStartWorker: 1,
        })
        .returning();
    }
    
    return { success: true, settings };
  } catch (error: any) {
    console.error('[hero-downloader-actions] getDownloaderSettingsAction error:', error);
    return { error: 'Failed to get settings: ' + error.message };
  }
}

export async function updateDownloaderSettingsAction(teamId: number, data: {
  maxConcurrentScans?: number;
  maxConcurrentDownloads?: number;
  autoStartWorker?: boolean;
}) {
  try {
    const updateData: any = {
        updatedAt: new Date()
    };
    if (data.maxConcurrentScans !== undefined) {
        updateData.maxConcurrentScans = data.maxConcurrentScans;
    }
    if (data.maxConcurrentDownloads !== undefined) {
        updateData.maxConcurrentDownloads = data.maxConcurrentDownloads;
    }
    if (data.autoStartWorker !== undefined) {
        updateData.autoStartWorker = data.autoStartWorker ? 1 : 0;
    }

    const [settings] = await db
      .update(downloaderSettings)
      .set(updateData)
      .where(eq(downloaderSettings.teamId, teamId))
      .returning();
      
    // If settings wasn't returned, maybe it doesn't exist, handle create
    if (!settings) {
      const [newSettings] = await db
        .insert(downloaderSettings)
        .values({
          teamId,
          maxConcurrentScans: data.maxConcurrentScans ?? 5,
          maxConcurrentDownloads: data.maxConcurrentDownloads ?? 3,
          autoStartWorker: data.autoStartWorker ?? true ? 1 : 0,
        })
        .returning();
      return { success: true, settings: newSettings };
    }
    
    return { success: true, settings };
  } catch (error: any) {
    console.error('[hero-downloader-actions] updateDownloaderSettingsAction error:', error);
    return { error: 'Failed to update settings: ' + error.message };
  }
}

export async function stopAllDownloaderVideosAction(teamId: number, projectId: number) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    // Verify project belongs to team
    const [project] = await db
      .select()
      .from(downloaderProjects)
      .where(
        and(
          eq(downloaderProjects.id, projectId),
          eq(downloaderProjects.teamId, teamId)
        )
      )
      .limit(1);

    if (!project) {
      return { error: 'Project not found' };
    }

    // Update all pending/downloading videos to cancelled
    await db
      .update(downloaderVideos)
      .set({ 
        status: 'cancelled', 
        updatedAt: new Date(),
        error: 'Đã dừng tải bởi người dùng',
        progress: 0 
      })
      .where(
        and(
          eq(downloaderVideos.projectId, projectId),
          inArray(downloaderVideos.status, ['pending', 'downloading'])
        )
      );

    return { success: true };
  } catch (error: any) {
    console.error('[hero-downloader-actions] stopAllDownloaderVideosAction error:', error);
    return { error: 'Failed to stop videos: ' + error.message };
  }
}
