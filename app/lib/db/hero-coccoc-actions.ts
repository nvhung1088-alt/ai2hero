'use server';

import { db } from './drizzle';
import { 
  coccocProfiles, 
  coccocProjects, 
  coccocSources, 
  coccocTasks, 
  coccocWorkers, 
  teams, 
  users, 
  extensionLinkCodes 
} from './schema';
import { eq, and, desc, sql, isNull, gt } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { revalidatePath } from 'next/cache';

const authSecret = process.env.AUTH_SECRET;
if (!authSecret) {
  throw new Error('AUTH_SECRET environment variable is required');
}
const key = new TextEncoder().encode(authSecret);
const WORKER_TOKEN_EXPIRY_DAYS = 90;

// === HELPER LOGGING ===
export async function appendCoccocTaskLog(taskId: number, action: string, message: string, tx?: any) {
  const dbClient = tx || db;
  try {
    const [task] = await dbClient
      .select({ logs: coccocTasks.logs })
      .from(coccocTasks)
      .where(eq(coccocTasks.id, taskId))
      .limit(1);

    if (task) {
      const currentLogs = Array.isArray(task.logs) ? (task.logs as any[]) : [];
      const newLogs = [
        ...currentLogs,
        {
          time: new Date().toISOString(),
          action,
          message,
        }
      ];
      await dbClient
        .update(coccocTasks)
        .set({ logs: newLogs, updatedAt: new Date() })
        .where(eq(coccocTasks.id, taskId));
    }
  } catch (err) {
    console.error(`[appendCoccocTaskLog] Error logging task ${taskId}:`, err);
  }
}

// === PROFILES CRUD ===
export async function getCoccocProfilesAction(teamId: number) {
  try {
    const profiles = await db
      .select()
      .from(coccocProfiles)
      .where(eq(coccocProfiles.teamId, teamId))
      .orderBy(desc(coccocProfiles.createdAt));
    return { success: true, profiles };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] getCoccocProfilesAction error:', error);
    return { error: 'Lỗi lấy danh sách Profile: ' + error.message };
  }
}

export async function createCoccocProfileAction(data: {
  teamId: number;
  userId: number;
  name: string;
  userDataPath: string;
  profileDir?: string;
}) {
  try {
    const [newProfile] = await db
      .insert(coccocProfiles)
      .values({
        teamId: data.teamId,
        userId: data.userId,
        name: data.name,
        userDataPath: data.userDataPath,
        profileDir: data.profileDir || 'Default',
        status: 'active',
      })
      .returning();

    revalidatePath(`/hero-coccoc/t/${data.teamId}/dashboard`);
    return { success: true, profile: newProfile };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] createCoccocProfileAction error:', error);
    return { error: 'Lỗi tạo Profile Cốc Cốc: ' + error.message };
  }
}

export async function deleteCoccocProfileAction(profileId: number, teamId: number) {
  try {
    await db
      .delete(coccocProfiles)
      .where(and(eq(coccocProfiles.id, profileId), eq(coccocProfiles.teamId, teamId)));

    revalidatePath(`/hero-coccoc/t/${teamId}/dashboard`);
    return { success: true };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] deleteCoccocProfileAction error:', error);
    return { error: 'Lỗi xóa Profile: ' + error.message };
  }
}

// === PROJECTS CRUD ===
export async function getCoccocProjectsAction(teamId: number) {
  try {
    const projects = await db
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
        createdAt: coccocProjects.createdAt,
      })
      .from(coccocProjects)
      .where(eq(coccocProjects.teamId, teamId))
      .orderBy(desc(coccocProjects.createdAt));

    return { success: true, projects };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] getCoccocProjectsAction error:', error);
    return { error: 'Lỗi lấy danh sách dự án: ' + error.message };
  }
}

export async function getCoccocProjectDetailAction(projectId: number, teamId: number) {
  try {
    const [project] = await db
      .select()
      .from(coccocProjects)
      .where(and(eq(coccocProjects.id, projectId), eq(coccocProjects.teamId, teamId)))
      .limit(1);

    if (!project) {
      return { error: 'Dự án không tồn tại' };
    }

    const sources = await db
      .select()
      .from(coccocSources)
      .where(eq(coccocSources.projectId, projectId));

    return { success: true, project, sources };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] getCoccocProjectDetailAction error:', error);
    return { error: 'Lỗi lấy chi tiết dự án: ' + error.message };
  }
}

export async function createCoccocProjectAction(data: {
  teamId: number;
  userId: number;
  profileId: number;
  name: string;
  downloadFolder: string;
  schedule?: string;
  quality?: string;
  minDuration?: number;
  maxDuration?: number;
  priority?: string;
  maxVideosPerRun?: number;
  maxTotalVideos?: number;
  sources: { sourceType: string; sourceValue: string; label?: string }[];
}) {
  try {
    // 1. Tạo project
    const [project] = await db
      .insert(coccocProjects)
      .values({
        teamId: data.teamId,
        userId: data.userId,
        profileId: data.profileId,
        name: data.name,
        downloadFolder: data.downloadFolder,
        schedule: data.schedule || 'manual',
        quality: data.quality || 'highest',
        minDuration: data.minDuration,
        maxDuration: data.maxDuration,
        priority: data.priority || 'newest',
        maxVideosPerRun: data.maxVideosPerRun ?? 10,
        maxTotalVideos: data.maxTotalVideos ?? 100,
        isActive: true,
      })
      .returning();

    // 2. Thêm sources nếu có
    if (data.sources && data.sources.length > 0) {
      await db.insert(coccocSources).values(
        data.sources.map((src) => ({
          projectId: project.id,
          sourceType: src.sourceType,
          sourceValue: src.sourceValue,
          label: src.label,
        }))
      );
    }

    revalidatePath(`/hero-coccoc/t/${data.teamId}/projects`);
    return { success: true, project };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] createCoccocProjectAction error:', error);
    return { error: 'Lỗi tạo dự án: ' + error.message };
  }
}

export async function updateCoccocProjectAction(
  projectId: number,
  teamId: number,
  data: {
    name?: string;
    profileId?: number;
    downloadFolder?: string;
    schedule?: string;
    quality?: string;
    minDuration?: number;
    maxDuration?: number;
    priority?: string;
    maxVideosPerRun?: number;
    maxTotalVideos?: number;
    isActive?: boolean;
    sources?: { id?: number; sourceType: string; sourceValue: string; label?: string }[];
  }
) {
  try {
    // Update core fields
    await db
      .update(coccocProjects)
      .set({
        name: data.name,
        profileId: data.profileId,
        downloadFolder: data.downloadFolder,
        schedule: data.schedule,
        quality: data.quality,
        minDuration: data.minDuration,
        maxDuration: data.maxDuration,
        priority: data.priority,
        maxVideosPerRun: data.maxVideosPerRun,
        maxTotalVideos: data.maxTotalVideos,
        isActive: data.isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(coccocProjects.id, projectId), eq(coccocProjects.teamId, teamId)));

    // Re-sync sources if provided
    if (data.sources) {
      // Xóa các source cũ không còn trong list gửi lên
      const activeIds = data.sources.map((s) => s.id).filter(Boolean) as number[];
      if (activeIds.length > 0) {
        await db
          .delete(coccocSources)
          .where(and(eq(coccocSources.projectId, projectId), sql`id not in ${activeIds}`));
      } else {
        await db.delete(coccocSources).where(eq(coccocSources.projectId, projectId));
      }

      // Thêm hoặc cập nhật
      for (const src of data.sources) {
        if (src.id) {
          await db
            .update(coccocSources)
            .set({
              sourceType: src.sourceType,
              sourceValue: src.sourceValue,
              label: src.label,
            })
            .where(eq(coccocSources.id, src.id));
        } else {
          await db.insert(coccocSources).values({
            projectId,
            sourceType: src.sourceType,
            sourceValue: src.sourceValue,
            label: src.label,
          });
        }
      }
    }

    revalidatePath(`/hero-coccoc/t/${teamId}/projects`);
    return { success: true };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] updateCoccocProjectAction error:', error);
    return { error: 'Lỗi cập nhật dự án: ' + error.message };
  }
}

export async function deleteCoccocProjectAction(projectId: number, teamId: number) {
  try {
    await db
      .delete(coccocProjects)
      .where(and(eq(coccocProjects.id, projectId), eq(coccocProjects.teamId, teamId)));

    revalidatePath(`/hero-coccoc/t/${teamId}/projects`);
    return { success: true };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] deleteCoccocProjectAction error:', error);
    return { error: 'Lỗi xóa dự án: ' + error.message };
  }
}

export async function toggleCoccocProjectAction(projectId: number, teamId: number) {
  try {
    const [project] = await db
      .select({ isActive: coccocProjects.isActive })
      .from(coccocProjects)
      .where(and(eq(coccocProjects.id, projectId), eq(coccocProjects.teamId, teamId)))
      .limit(1);

    if (!project) return { error: 'Dự án không tồn tại' };

    await db
      .update(coccocProjects)
      .set({ isActive: !project.isActive, updatedAt: new Date() })
      .where(eq(coccocProjects.id, projectId));

    revalidatePath(`/hero-coccoc/t/${teamId}/projects`);
    return { success: true, isActive: !project.isActive };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] toggleCoccocProjectAction error:', error);
    return { error: 'Lỗi chuyển đổi trạng thái dự án: ' + error.message };
  }
}

// === SOURCES ===
export async function addCoccocSourceAction(data: {
  projectId: number;
  sourceType: string;
  sourceValue: string;
  platform?: string;
  label?: string;
}) {
  try {
    const [source] = await db
      .insert(coccocSources)
      .values({
        projectId: data.projectId,
        sourceType: data.sourceType,
        sourceValue: data.sourceValue,
        platform: data.platform || 'other',
        label: data.label,
      })
      .returning();

    return { success: true, source };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] addCoccocSourceAction error:', error);
    return { error: 'Lỗi thêm nguồn quét: ' + error.message };
  }
}

export async function removeCoccocSourceAction(sourceId: number) {
  try {
    await db.delete(coccocSources).where(eq(coccocSources.id, sourceId));
    return { success: true };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] removeCoccocSourceAction error:', error);
    return { error: 'Lỗi xóa nguồn quét: ' + error.message };
  }
}

// === TASKS ===
export async function getCoccocTasksAction(
  teamId: number,
  options: { projectId?: number; status?: string; limit?: number; offset?: number } = {}
) {
  try {
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    let conditions = [eq(coccocTasks.teamId, teamId)];
    if (options.projectId) {
      conditions.push(eq(coccocTasks.projectId, options.projectId));
    }
    if (options.status) {
      conditions.push(eq(coccocTasks.status, options.status));
    }

    const tasks = await db
      .select()
      .from(coccocTasks)
      .where(and(...conditions))
      .orderBy(desc(coccocTasks.createdAt))
      .limit(limit)
      .offset(offset);

    // Tính tổng để phân trang
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(coccocTasks)
      .where(and(...conditions));

    return { success: true, tasks, totalCount: countResult?.count || 0 };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] getCoccocTasksAction error:', error);
    return { error: 'Lỗi lấy lịch sử tác vụ: ' + error.message };
  }
}

export async function createQuickDownloadAction(data: {
  teamId: number;
  userId: number;
  videoUrl: string;
}) {
  try {
    const [task] = await db
      .insert(coccocTasks)
      .values({
        teamId: data.teamId,
        videoUrl: data.videoUrl,
        status: 'pending',
        priority: 1, // High priority
        logs: [
          {
            time: new Date().toISOString(),
            action: 'Khởi tạo',
            message: 'Tạo tác vụ tải nhanh từ dashboard Web UI',
          }
        ]
      })
      .returning();

    revalidatePath(`/hero-coccoc/t/${data.teamId}/quick-download`);
    return { success: true, task };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] createQuickDownloadAction error:', error);
    return { error: 'Lỗi tạo tác vụ tải nhanh: ' + error.message };
  }
}

export async function updateCoccocTaskAction(
  taskId: number,
  data: {
    status?: string;
    downloadedPath?: string;
    fileSize?: number;
    duration?: number;
    quality?: string;
    error?: string;
    logs?: any;
  }
) {
  try {
    const updates: any = {
      updatedAt: new Date(),
    };

    if (data.status) {
      updates.status = data.status;
      if (data.status === 'scanning' || data.status === 'downloading') {
        updates.startedAt = new Date();
      } else if (data.status === 'completed' || data.status === 'failed') {
        updates.completedAt = new Date();
      }
    }
    if (data.downloadedPath) updates.downloadedPath = data.downloadedPath;
    if (data.fileSize !== undefined) updates.fileSize = data.fileSize;
    if (data.duration !== undefined) updates.duration = data.duration;
    if (data.quality) updates.quality = data.quality;
    if (data.error) updates.error = data.error;
    if (data.logs) updates.logs = data.logs;

    const [updatedTask] = await db
      .update(coccocTasks)
      .set(updates)
      .where(eq(coccocTasks.id, taskId))
      .returning();

    return { success: true, task: updatedTask };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] updateCoccocTaskAction error:', error);
    return { error: 'Lỗi cập nhật tác vụ: ' + error.message };
  }
}

// === WORKER PAIRING & AUTH ===
export async function generateCoccocPairingCodeAction(teamId: number, userId: number) {
  try {
    // Xóa code cũ hết hạn
    await db.delete(extensionLinkCodes).where(eq(extensionLinkCodes.teamId, teamId));

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 chữ số
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    await db.insert(extensionLinkCodes).values({
      teamId,
      userId,
      code,
      expiresAt,
    });

    return { success: true, code, expiresAt };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] generateCoccocPairingCodeAction error:', error);
    return { error: 'Lỗi sinh mã liên kết: ' + error.message };
  }
}

export async function validateAndPairCoccocWorkerAction(data: {
  code: string;
  deviceName: string;
  platform: string;
  version: string;
}) {
  try {
    const code = data.code.trim();

    // Tìm code hợp lệ
    const [linkCode] = await db
      .select()
      .from(extensionLinkCodes)
      .where(
        and(
          eq(extensionLinkCodes.code, code),
          isNull(extensionLinkCodes.usedAt),
          gt(extensionLinkCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!linkCode) {
      return { success: false, error: 'Mã liên kết không hợp lệ hoặc đã hết hạn' };
    }

    const [team] = await db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.id, linkCode.teamId))
      .limit(1);

    if (!team) {
      return { success: false, error: 'Workspace không tồn tại' };
    }

    // Sinh JWT token
    const expiresAt = new Date(Date.now() + WORKER_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const accessToken = await new SignJWT({
      teamId: linkCode.teamId,
      userId: linkCode.userId,
      type: 'coccoc_worker',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${WORKER_TOKEN_EXPIRY_DAYS}d`)
      .sign(key);

    const accessTokenHash = createHash('sha256').update(accessToken).digest('hex');

    // Insert worker mới
    const [newWorker] = await db
      .insert(coccocWorkers)
      .values({
        teamId: linkCode.teamId,
        userId: linkCode.userId,
        deviceName: data.deviceName || 'Local Cốc Cốc Worker',
        platform: data.platform || 'windows',
        version: data.version || '1.0.0',
        status: 'online',
        lastSeenAt: new Date(),
        accessTokenHash,
      })
      .returning();

    // Đánh dấu code đã sử dụng
    await db
      .update(extensionLinkCodes)
      .set({ usedAt: new Date() })
      .where(eq(extensionLinkCodes.id, linkCode.id));

    return {
      success: true,
      workerId: newWorker.id,
      accessToken,
      teamId: team.id,
      teamName: team.name,
      expiresAt,
    };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] validateAndPairCoccocWorkerAction error:', error);
    return { success: false, error: 'Lỗi ghép nối worker: ' + error.message };
  }
}

export async function verifyCoccocWorkerToken(bearerToken: string) {
  try {
    const { payload } = await jwtVerify(bearerToken, key, { algorithms: ['HS256'] });

    if (payload.type !== 'coccoc_worker') {
      return { success: false, error: 'Token không hợp lệ' };
    }

    const tokenHash = createHash('sha256').update(bearerToken).digest('hex');
    const [worker] = await db
      .select()
      .from(coccocWorkers)
      .where(eq(coccocWorkers.accessTokenHash, tokenHash))
      .limit(1);

    if (!worker) {
      return { success: false, error: 'Worker không tồn tại hoặc đã bị thu hồi' };
    }

    await db
      .update(coccocWorkers)
      .set({ lastSeenAt: new Date(), status: 'online' })
      .where(eq(coccocWorkers.id, worker.id));

    return {
      success: true,
      workerId: worker.id,
      teamId: worker.teamId,
      userId: worker.userId,
    };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] verifyCoccocWorkerToken error:', error);
    return { success: false, error: 'Token không hợp lệ hoặc đã hết hạn' };
  }
}

export async function pollCoccocPendingTaskAction(workerId: number, teamId: number) {
  try {
    // 1. Tìm task pending, ưu tiên priority = 1 (tải nhanh)
    const [task] = await db
      .select()
      .from(coccocTasks)
      .where(and(eq(coccocTasks.teamId, teamId), eq(coccocTasks.status, 'pending')))
      .orderBy(desc(coccocTasks.priority), coccocTasks.createdAt)
      .limit(1);

    if (!task) {
      return { success: true, task: null };
    }

    // 2. Cập nhật status sang 'scanning', gán workerId
    const [updatedTask] = await db
      .update(coccocTasks)
      .set({
        status: 'scanning',
        workerId: workerId,
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(coccocTasks.id, task.id))
      .returning();

    // 3. Lấy cấu hình Project và Profile tương ứng
    let project = null;
    let profile = null;

    if (task.projectId) {
      [project] = await db
        .select()
        .from(coccocProjects)
        .where(eq(coccocProjects.id, task.projectId))
        .limit(1);
        
      if (project && project.profileId) {
        [profile] = await db
          .select()
          .from(coccocProfiles)
          .where(eq(coccocProfiles.id, project.profileId))
          .limit(1);
      }
    }

    // Cập nhật logs
    await appendCoccocTaskLog(task.id, 'Worker nhận', `Worker ID ${workerId} nhận tác vụ và bắt đầu quét video.`);

    return { 
      success: true, 
      task: {
        ...updatedTask,
        projectConfig: project ? {
          downloadFolder: project.downloadFolder,
          quality: project.quality,
          minDuration: project.minDuration,
          maxDuration: project.maxDuration,
        } : null,
        profileConfig: profile ? {
          userDataPath: profile.userDataPath,
          profileDir: profile.profileDir,
        } : null,
      }
    };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] pollCoccocPendingTaskAction error:', error);
    return { error: 'Lỗi polling task: ' + error.message };
  }
}

export async function pollCoccocProjectsToScanAction(teamId: number) {
  try {
    const allProjects = await db
      .select()
      .from(coccocProjects)
      .where(and(eq(coccocProjects.teamId, teamId), eq(coccocProjects.isActive, true)));

    const now = Date.now();
    const projectsToScan = [];

    for (const proj of allProjects) {
      let shouldScan = false;
      
      // Kích hoạt Scan Ngay lập tức nếu lastScanAt là 1970-01-01 (Force Scan)
      if (proj.lastScanAt && new Date(proj.lastScanAt).getFullYear() === 1970) {
        shouldScan = true;
      } else if (proj.schedule === 'manual') {
        shouldScan = false;
      } else if (!proj.lastScanAt) {
        shouldScan = true;
      } else {
        const lastScan = new Date(proj.lastScanAt).getTime();
        const diffMs = now - lastScan;

        if (proj.schedule === '60m' && diffMs >= 60 * 60 * 1000) {
          shouldScan = true;
        } else if (proj.schedule === '12h' && diffMs >= 12 * 60 * 60 * 1000) {
          shouldScan = true;
        } else if (proj.schedule === '24h' && diffMs >= 24 * 60 * 60 * 1000) {
          shouldScan = true;
        }
      }

      if (shouldScan) {
        const sources = await db
          .select()
          .from(coccocSources)
          .where(eq(coccocSources.projectId, proj.id));

        const [profile] = await db
          .select()
          .from(coccocProfiles)
          .where(eq(coccocProfiles.id, proj.profileId))
          .limit(1);

        projectsToScan.push({
          ...proj,
          sources,
          profileConfig: profile ? {
            userDataPath: profile.userDataPath,
            profileDir: profile.profileDir,
          } : null,
        });
      }
    }

    return { success: true, projects: projectsToScan };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] pollCoccocProjectsToScanAction error:', error);
    return { error: 'Lỗi lấy dự án cần quét: ' + error.message };
  }
}

export async function createTasksFromWorkerAction(
  teamId: number,
  projectId: number,
  videoUrls: string[]
) {
  try {
    const createdTasks = [];
    
    // Cập nhật lastScanAt cho project
    await db
      .update(coccocProjects)
      .set({ lastScanAt: new Date(), updatedAt: new Date() })
      .where(eq(coccocProjects.id, projectId));

    for (const url of videoUrls) {
      // Dedup: Kiểm tra xem URL đã tồn tại trong task của team chưa
      const [existing] = await db
        .select({ id: coccocTasks.id })
        .from(coccocTasks)
        .where(and(eq(coccocTasks.teamId, teamId), eq(coccocTasks.videoUrl, url)))
        .limit(1);

      if (!existing) {
        const [task] = await db
          .insert(coccocTasks)
          .values({
            teamId,
            projectId,
            videoUrl: url,
            status: 'pending',
            priority: 0,
            logs: [
              {
                time: new Date().toISOString(),
                action: 'Khởi tạo',
                message: 'Tác vụ cào tự động sinh từ Worker quét kênh/từ khóa.',
              }
            ]
          })
          .returning();
        createdTasks.push(task);
      }
    }

    return { success: true, createdCount: createdTasks.length };
  } catch (error: any) {
    console.error('[hero-coccoc-actions] createTasksFromWorkerAction error:', error);
    return { error: 'Lỗi tạo tác vụ từ worker: ' + error.message };
  }
}

// ==========================================
// THÊM: Quản lý Tasks & Actions từ Giao diện
// ==========================================

export async function forceScanCoccocProjectAction(projectId: number, teamId: number) {
  try {
    await db.update(coccocProjects)
      .set({ lastScanAt: new Date(0), updatedAt: new Date() })
      .where(and(eq(coccocProjects.id, projectId), eq(coccocProjects.teamId, teamId)));
    revalidatePath(`/hero-coccoc/t/${teamId}/projects`);
    return { success: true };
  } catch (error: any) {
    return { error: 'Lỗi ép quét: ' + error.message };
  }
}

export async function getProjectTasksAction(projectId: number, teamId: number) {
  try {
    const tasks = await db.select()
      .from(coccocTasks)
      .where(and(eq(coccocTasks.projectId, projectId), eq(coccocTasks.teamId, teamId)))
      .orderBy(desc(coccocTasks.createdAt))
      .limit(50);
    return { success: true, tasks };
  } catch (error: any) {
    return { error: 'Lỗi lấy danh sách tải: ' + error.message };
  }
}

export async function retryTaskAction(taskId: number, teamId: number) {
  try {
    await db.update(coccocTasks)
      .set({ status: 'pending', error: null, updatedAt: new Date() })
      .where(and(eq(coccocTasks.id, taskId), eq(coccocTasks.teamId, teamId)));
    return { success: true };
  } catch (error: any) {
    return { error: 'Lỗi tải lại: ' + error.message };
  }
}

export async function stopTaskAction(taskId: number, teamId: number) {
  try {
    await db.update(coccocTasks)
      .set({ status: 'skipped', error: 'Đã dừng bởi người dùng', updatedAt: new Date() })
      .where(and(eq(coccocTasks.id, taskId), eq(coccocTasks.teamId, teamId)));
    return { success: true };
  } catch (error: any) {
    return { error: 'Lỗi dừng tác vụ: ' + error.message };
  }
}

export async function openProjectFolderAction(projectId: number, teamId: number) {
  try {
    const [project] = await db.select({ downloadFolder: coccocProjects.downloadFolder })
      .from(coccocProjects)
      .where(and(eq(coccocProjects.id, projectId), eq(coccocProjects.teamId, teamId)))
      .limit(1);
    
    if (!project || !project.downloadFolder) {
      return { error: 'Không tìm thấy cấu hình thư mục.' };
    }

    const { exec } = await import('child_process');
    const folderPath = project.downloadFolder;
    const command = process.platform === 'win32' ? `start "" "${folderPath}"` : `open "${folderPath}"`;
    
    exec(command, (error) => {
      if (error) {
        console.error('[hero-coccoc-actions] Lỗi mở thư mục:', error);
      }
    });

    return { success: true };
  } catch (error: any) {
    return { error: 'Lỗi thao tác thư mục: ' + error.message };
  }
}
