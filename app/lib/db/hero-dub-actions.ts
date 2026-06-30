'use server';

import { db } from './drizzle';
import { dubTasks, dubWorkers, teams, users, extensionLinkCodes, connectHubConnections, dubProjects, dubScanConfigs } from './schema';
import { decryptField } from '../sim-crypto';
import { eq, and, desc, sql, isNull, gt, inArray, or } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'crypto';
import { getPresignedUploadUrl } from '@/lib/storage/r2';

const authSecret = process.env.AUTH_SECRET;
if (!authSecret) {
  throw new Error('AUTH_SECRET environment variable is required');
}
const key = new TextEncoder().encode(authSecret);

// Token của worker: 90 ngày
const WORKER_TOKEN_EXPIRY_DAYS = 90;

// === HELPER LOGGING ===

export async function appendTaskLog(taskId: number, action: string, message: string, tx?: any) {
  const dbClient = tx || db;
  try {
    const [task] = await dbClient
      .select({ logs: dubTasks.logs })
      .from(dubTasks)
      .where(eq(dubTasks.id, taskId))
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
        .update(dubTasks)
        .set({ logs: newLogs, updatedAt: new Date() })
        .where(eq(dubTasks.id, taskId));
    }
  } catch (err) {
    console.error(`[appendTaskLog] Error logging task ${taskId}:`, err);
  }
}

// === TASK ACTIONS ===

export async function createDubTaskAction(data: {
  teamId: number;
  userId: number;
  sourceUrl: string;
  taskTitle?: string;
  sourceThumbnailUrl?: string;
  sourceLang?: string;
  targetLang?: string;
  asrEngine?: string;
  translateEngine?: string;
  llmModel?: string;
  subtitleMode?: string;
  qualityPreset?: string;
  ttsEnabled?: boolean;
  ttsEngine?: string;
  ttsVoice?: string;
  ttsSpeed?: string;
  bgVolume?: string;
  ttsVolume?: string;
  outputFolder?: string;
  projectId?: number;
  scanConfigId?: number;
  brandingEnabled?: boolean;
  logoUrl?: string;
  logoPosition?: string;
  introVideoUrl?: string;
  outroVideoUrl?: string;
}) {
  try {
    let sourceUrl = data.sourceUrl.trim();
    if ((sourceUrl.startsWith('"') && sourceUrl.endsWith('"')) || (sourceUrl.startsWith("'") && sourceUrl.endsWith("'"))) {
      sourceUrl = sourceUrl.slice(1, -1).trim();
    }
    const targetLang = data.targetLang || 'vi';
    const sourceLang = data.sourceLang || 'zh';

    // Vì MVP chỉ xử lý Local File, mặc định platform là local
    let sourcePlatform = 'local';
    let sourceVideoId = '';

    // Dedupe Key: teamId + url + targetLang
    const dedupeKey = `${data.teamId}:${sourceUrl}:${targetLang}`;

    // Check duplicate (chỉ block khi tác vụ cùng dedupeKey đang trong trạng thái active/xử lý)
    const ACTIVE_STATUSES = ['pending', 'assigned', 'downloading', 'transcribing', 'translating', 'tts', 'burning', 'uploading'];
    const [existing] = await db
      .select()
      .from(dubTasks)
      .where(
        and(
          eq(dubTasks.dedupeKey, dedupeKey),
          inArray(dubTasks.status, ACTIVE_STATUSES)
        )
      )
      .limit(1);

    if (existing) {
      return { success: true, taskId: existing.id, isDuplicate: true };
    }

    const [newTask] = await db
      .insert(dubTasks)
      .values({
        teamId: data.teamId,
        userId: data.userId,
        inputType: 'url',
        sourceUrl,
        sourceTitle: data.taskTitle || null,
        sourcePlatform,
        sourceVideoId: sourceVideoId || null,
        sourceThumbnailUrl: data.sourceThumbnailUrl || null,
        sourceLang,
        targetLang,
        asrEngine: data.asrEngine || 'faster-whisper',
        translateEngine: data.llmModel ? 'connect-hub' : (data.translateEngine || 'google-free'),
        llmModel: data.llmModel || null,
        subtitleMode: data.subtitleMode || 'burn_subtitle',
        qualityPreset: data.qualityPreset || 'balanced',
        ttsEnabled: data.ttsEnabled ?? false,
        ttsEngine: data.ttsEngine || 'edge-tts',
        ttsVoice: data.ttsVoice || null,
        ttsSpeed: data.ttsSpeed || '1.3',
        bgVolume: data.bgVolume,
        ttsVolume: data.ttsVolume,
        outputFolder: data.outputFolder,
        status: 'pending',
        progress: '0',
        dedupeKey,
        projectId: data.projectId,
        scanConfigId: data.scanConfigId,
        brandingEnabled: data.brandingEnabled,
        logoUrl: data.logoUrl,
        logoPosition: data.logoPosition,
        introVideoUrl: data.introVideoUrl,
        outroVideoUrl: data.outroVideoUrl,
        logs: [
          {
            time: new Date().toISOString(),
            action: 'create',
            message: '➕ Khởi tạo tác vụ: Khởi tạo thành công, đang chờ Worker nhận việc.',
          }
        ],
      })
      .returning();

    return { success: true, taskId: newTask.id };
  } catch (error: any) {
    console.error('[hero-dub-actions] createDubTaskAction error:', error);
    return { error: 'Lỗi tạo tác vụ dịch: ' + error.message };
  }
}

export async function getDubTasksAction(
  teamId: number,
  filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
) {
  try {
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    let conditions = [eq(dubTasks.teamId, teamId)];
    if (filters?.status) {
      conditions.push(eq(dubTasks.status, filters.status));
    }

    const tasks = await db
      .select()
      .from(dubTasks)
      .where(and(...conditions))
      .orderBy(
        sql`CASE 
          WHEN ${dubTasks.status} IN ('assigned', 'downloading', 'transcribing', 'translating', 'tts', 'burning', 'uploading') THEN 1
          WHEN ${dubTasks.status} = 'pending' THEN 2
          ELSE 3
        END`,
        desc(dubTasks.createdAt)
      )
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dubTasks)
      .where(and(...conditions));

    return { success: true, tasks, totalCount: countResult?.count || 0 };
  } catch (error: any) {
    console.error('[hero-dub-actions] getDubTasksAction error:', error);
    return { error: 'Lỗi lấy danh sách tác vụ: ' + error.message };
  }
}

export async function getDubTaskDetailAction(taskId: number, teamId: number) {
  try {
    const [task] = await db
      .select()
      .from(dubTasks)
      .where(and(eq(dubTasks.id, taskId), eq(dubTasks.teamId, teamId)))
      .limit(1);

    if (!task) {
      return { error: 'Không tìm thấy tác vụ' };
    }

    let worker = null;
    if (task.workerId) {
      const [workerRecord] = await db
        .select({
          id: dubWorkers.id,
          deviceName: dubWorkers.deviceName,
          platform: dubWorkers.platform,
          status: dubWorkers.status,
        })
        .from(dubWorkers)
        .where(eq(dubWorkers.id, task.workerId))
        .limit(1);
      worker = workerRecord || null;
    }

    return { success: true, task, worker };
  } catch (error: any) {
    console.error('[hero-dub-actions] getDubTaskDetailAction error:', error);
    return { error: 'Lỗi chi tiết tác vụ: ' + error.message };
  }
}

export async function retryDubTaskAction(taskId: number, teamId: number) {
  try {
    const [task] = await db
      .select()
      .from(dubTasks)
      .where(and(eq(dubTasks.id, taskId), eq(dubTasks.teamId, teamId)))
      .limit(1);

    if (!task) {
      return { error: 'Không tìm thấy tác vụ' };
    }

    await db
      .update(dubTasks)
      .set({
        status: 'pending',
        progress: '0',
        error: null,
        workerId: null,
        retryCount: task.retryCount + 1,
        updatedAt: new Date(),
        dedupeKey: `${task.teamId}:${task.sourceUrl}:${task.targetLang}`,
      })
      .where(eq(dubTasks.id, taskId));

    await appendTaskLog(
      taskId,
      'retry',
      `🔄 Thử lại tác vụ: Người dùng yêu cầu chạy lại tác vụ (Thử lại lần thứ ${task.retryCount + 1}).`
    );

    return { success: true };
  } catch (error: any) {
    console.error('[hero-dub-actions] retryDubTaskAction error:', error);
    return { error: 'Lỗi chạy lại tác vụ: ' + error.message };
  }
}

export async function updateAndRetryDubTaskAction(taskId: number, teamId: number, data: any) {
  try {
    const [task] = await db
      .select()
      .from(dubTasks)
      .where(and(eq(dubTasks.id, taskId), eq(dubTasks.teamId, teamId)))
      .limit(1);

    if (!task) {
      return { error: 'Không tìm thấy tác vụ' };
    }

    const updateData: any = {
      status: 'pending',
      progress: '0',
      error: null,
      workerId: null,
      retryCount: task.retryCount + 1,
      updatedAt: new Date(),
    };

    if (data.asrEngine !== undefined) updateData.asrEngine = data.asrEngine;
    if (data.translateEngine !== undefined) updateData.translateEngine = data.translateEngine;
    if (data.llmModel !== undefined) updateData.llmModel = data.llmModel;
    if (data.subtitleMode !== undefined) updateData.subtitleMode = data.subtitleMode;
    if (data.qualityPreset !== undefined) updateData.qualityPreset = data.qualityPreset;
    if (data.ttsEnabled !== undefined) updateData.ttsEnabled = data.ttsEnabled;
    if (data.ttsEngine !== undefined) updateData.ttsEngine = data.ttsEngine;
    if (data.ttsVoice !== undefined) updateData.ttsVoice = data.ttsVoice;
    if (data.ttsSpeed !== undefined) updateData.ttsSpeed = data.ttsSpeed;
    if (data.bgVolume !== undefined) updateData.bgVolume = data.bgVolume;
    if (data.ttsVolume !== undefined) updateData.ttsVolume = data.ttsVolume;

    await db
      .update(dubTasks)
      .set(updateData)
      .where(eq(dubTasks.id, taskId));

    await appendTaskLog(
      taskId,
      'retry',
      `🔄 Thử lại tác vụ (Cập nhật cấu hình): Người dùng cập nhật cài đặt và chạy lại.`
    );

    return { success: true };
  } catch (error: any) {
    console.error('[hero-dub-actions] updateAndRetryDubTaskAction error:', error);
    return { error: 'Lỗi cập nhật và chạy lại tác vụ: ' + error.message };
  }
}

export async function deleteDubTaskAction(taskId: number, teamId: number) {
  try {
    await db
      .delete(dubTasks)
      .where(and(eq(dubTasks.id, taskId), eq(dubTasks.teamId, teamId)));

    return { success: true };
  } catch (error: any) {
    console.error('[hero-dub-actions] deleteDubTaskAction error:', error);
    return { error: 'Lỗi xóa tác vụ: ' + error.message };
  }
}

// === WORKER ACTIONS ===

export async function getDubWorkersAction(teamId: number) {
  try {
    const workers = await db
      .select()
      .from(dubWorkers)
      .where(eq(dubWorkers.teamId, teamId))
      .orderBy(desc(dubWorkers.createdAt));

    return { success: true, workers };
  } catch (error: any) {
    console.error('[hero-dub-actions] getDubWorkersAction error:', error);
    return { error: 'Lỗi lấy danh sách máy xử lý: ' + error.message };
  }
}

export async function deleteDubWorkerAction(workerId: number, teamId: number) {
  try {
    await db
      .delete(dubWorkers)
      .where(and(eq(dubWorkers.id, workerId), eq(dubWorkers.teamId, teamId)));

    return { success: true };
  } catch (error: any) {
    console.error('[hero-dub-actions] deleteDubWorkerAction error:', error);
    return { error: 'Lỗi xóa máy xử lý: ' + error.message };
  }
}

// Ghép nối worker qua pair code
export async function validateAndPairDubWorkerAction(data: {
  code: string;
  deviceName: string;
  platform: string;
  version: string;
}) {
  try {
    const code = data.code.toUpperCase().trim();

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
      type: 'dub_worker',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${WORKER_TOKEN_EXPIRY_DAYS}d`)
      .sign(key);

    const accessTokenHash = createHash('sha256').update(accessToken).digest('hex');

    // Insert worker
    const [newWorker] = await db
      .insert(dubWorkers)
      .values({
        teamId: linkCode.teamId,
        userId: linkCode.userId,
        deviceName: data.deviceName || 'Local Worker',
        platform: data.platform || 'windows',
        version: data.version || '1.0.0',
        status: 'online',
        lastSeenAt: new Date(),
        accessTokenHash,
      })
      .returning();

    // Đánh dấu code đã dùng
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
    console.error('[hero-dub-actions] validateAndPairDubWorkerAction error:', error);
    return { success: false, error: 'Lỗi ghép nối worker: ' + error.message };
  }
}

// Xác thực JWT từ header
export async function verifyDubWorkerToken(bearerToken: string) {
  try {
    const { payload } = await jwtVerify(bearerToken, key, { algorithms: ['HS256'] });

    if (payload.type !== 'dub_worker') {
      return { success: false, error: 'Token không hợp lệ' };
    }

    const tokenHash = createHash('sha256').update(bearerToken).digest('hex');
    const [worker] = await db
      .select()
      .from(dubWorkers)
      .where(eq(dubWorkers.accessTokenHash, tokenHash))
      .limit(1);

    if (!worker) {
      return { success: false, error: 'Worker không tồn tại hoặc đã bị thu hồi' };
    }

    await db
      .update(dubWorkers)
      .set({ lastSeenAt: new Date(), status: 'online' })
      .where(eq(dubWorkers.id, worker.id));

    return {
      success: true,
      workerId: worker.id,
      teamId: worker.teamId,
      userId: worker.userId,
    };
  } catch (error: any) {
    console.error('[hero-dub-actions] verifyDubWorkerToken error:', error);
    return { success: false, error: 'Token không hợp lệ hoặc đã hết hạn' };
  }
}

// === WORKER POLL & UPDATE ACTIONS ===

export async function pollPendingTaskAction(workerId: number, teamId: number) {
  try {
    // 1. Ưu tiên tìm task đang làm dở của worker này
    let [task] = await db
      .select()
      .from(dubTasks)
      .where(
        and(
          eq(dubTasks.teamId, teamId),
          eq(dubTasks.workerId, workerId),
          inArray(dubTasks.status, [
            'assigned',
            'downloading',
            'transcribing',
            'translating',
            'tts',
            'burning',
            'uploading',
          ])
        )
      )
      .orderBy(dubTasks.updatedAt)
      .limit(1);

    // 2. Nếu không có task dở dang, lấy task pending mới
    if (!task) {
      const [pendingTaskResult] = await db
        .select({ task: dubTasks })
        .from(dubTasks)
        .leftJoin(dubScanConfigs, eq(dubTasks.scanConfigId, dubScanConfigs.id))
        .where(
          and(
            eq(dubTasks.status, 'pending'),
            eq(dubTasks.teamId, teamId),
            or(
              isNull(dubTasks.scanConfigId),
              eq(dubScanConfigs.isActive, true)
            )
          )
        )
        .orderBy(dubTasks.createdAt)
        .limit(1);
      task = pendingTaskResult?.task;
    }

    if (!task) {
      return { success: true, task: null };
    }

    const [updatedTask] = await db
      .update(dubTasks)
      .set({
        status: task.status === 'pending' ? 'assigned' : task.status,
        workerId,
        startedAt: task.startedAt || new Date(),
        updatedAt: new Date(),
      })
      .where(eq(dubTasks.id, task.id))
      .returning();

    // Lấy thông tin worker để ghi log trực quan
    const [worker] = await db
      .select({ deviceName: dubWorkers.deviceName })
      .from(dubWorkers)
      .where(eq(dubWorkers.id, workerId))
      .limit(1);
    
    const workerName = worker?.deviceName || `Worker #${workerId}`;
    await appendTaskLog(
      task.id,
      'assigned',
      `💻 Worker nhận việc: Worker [${workerName}] đã nhận tác vụ xử lý.`
    );

    return { success: true, task: updatedTask };
  } catch (error: any) {
    console.error('[hero-dub-actions] pollPendingTaskAction error:', error);
    return { error: 'Lỗi poll task: ' + error.message };
  }
}

export async function updateTaskProgressAction(
  taskId: number,
  workerId: number,
  data: {
    status: string;
    progress: number;
    error?: string;
    sourceTitle?: string;
    durationSec?: number;
  }
) {
  try {
    const updateData: any = {
      status: data.status,
      progress: String(data.progress),
      updatedAt: new Date(),
    };

    if (data.error) {
      updateData.error = data.error;
    }
    if (data.sourceTitle) {
      updateData.sourceTitle = data.sourceTitle;
    }
    if (data.durationSec) {
      updateData.durationSec = data.durationSec;
    }
    if (data.status === 'failed') {
      updateData.completedAt = new Date();
      updateData.dedupeKey = null;
    }

    // Lấy task hiện tại để kiểm tra thay đổi status
    const [existingTask] = await db
      .select({ status: dubTasks.status })
      .from(dubTasks)
      .where(eq(dubTasks.id, taskId))
      .limit(1);

    await db
      .update(dubTasks)
      .set(updateData)
      .where(and(eq(dubTasks.id, taskId), eq(dubTasks.workerId, workerId)));

    // Log khi thay đổi trạng thái hoặc gặp lỗi
    if (existingTask && existingTask.status !== data.status) {
      let message = '';
      switch (data.status) {
        case 'downloading':
          message = `📥 Đang tải video: Worker bắt đầu tải video nguồn.`;
          break;
        case 'transcribing':
          message = `🎙️ Nhận dạng Whisper: Bắt đầu chạy module AI Whisper nhận dạng giọng nói gốc.`;
          break;
        case 'translating':
          message = `🤖 Dịch thuật AI: Đang gọi ConnectHub API dịch phụ đề sang tiếng Việt.`;
          break;
        case 'tts':
          message = `🗣️ Lồng tiếng AI (TTS): Đang sinh giọng lồng tiếng bằng AI.`;
          break;
        case 'burning':
          message = `🎬 Burn Subtitles & Mix: Đang burn cứng phụ đề vào video và trộn nhạc nền.`;
          break;
        case 'uploading':
          message = `🚀 Tải lên máy chủ: Đang tải video thành phẩm lên máy chủ lưu trữ.`;
          break;
        case 'failed':
          message = `❌ Tác vụ thất bại: Gặp lỗi trong quá trình xử lý. Chi tiết: ${data.error || 'Lỗi không xác định'}`;
          break;
        default:
          message = `🔄 Cập nhật trạng thái: Chuyển sang bước [${data.status}].`;
      }
      
      await appendTaskLog(taskId, data.status, message);
    } else if (data.status === 'failed' && data.error) {
      // Trường hợp status không đổi (đã failed từ trước) nhưng có log error mới
      await appendTaskLog(taskId, 'failed', `❌ Gặp lỗi: ${data.error}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('[hero-dub-actions] updateTaskProgressAction error:', error);
    return { error: 'Lỗi cập nhật tiến độ: ' + error.message };
  }
}

// === PROJECTS ===

export async function getDubProjectsAction(teamId: number) {
  try {
    const projectsList = await db
      .select()
      .from(dubProjects)
      .where(eq(dubProjects.teamId, teamId))
      .orderBy(desc(dubProjects.createdAt));
    return { success: true, projects: projectsList };
  } catch (error) {
    console.error('getDubProjectsAction error:', error);
    return { error: 'Failed to get projects' };
  }
}

export async function createDubProjectAction(data: {
  teamId: number;
  name: string;
  logoUrl?: string;
  logoPosition?: string;
  introVideoUrl?: string;
  outroVideoUrl?: string;
}) {
  try {
    const [project] = await db
      .insert(dubProjects)
      .values({
        teamId: data.teamId,
        name: data.name,
        logoUrl: data.logoUrl,
        logoPosition: data.logoPosition || 'top-left',
        introVideoUrl: data.introVideoUrl,
        outroVideoUrl: data.outroVideoUrl,
      })
      .returning();
    return { success: true, project };
  } catch (error) {
    console.error('createDubProjectAction error:', error);
    return { error: 'Failed to create project' };
  }
}

export async function updateDubProjectAction(id: number, teamId: number, data: {
  name?: string;
  logoUrl?: string;
  logoPosition?: string;
  introVideoUrl?: string;
  outroVideoUrl?: string;
}) {
  try {
    const [project] = await db
      .update(dubProjects)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(dubProjects.id, id), eq(dubProjects.teamId, teamId)))
      .returning();
    return { success: true, project };
  } catch (error) {
    console.error('updateDubProjectAction error:', error);
    return { error: 'Failed to update project' };
  }
}

export async function deleteDubProjectAction(id: number, teamId: number) {
  try {
    await db
      .delete(dubProjects)
      .where(and(eq(dubProjects.id, id), eq(dubProjects.teamId, teamId)));
    return { success: true };
  } catch (error) {
    console.error('deleteDubProjectAction error:', error);
    return { error: 'Failed to delete project' };
  }
}


export async function completeTaskAction(
  taskId: number,
  workerId: number,
  data: {
    resultVideoUrl: string;
    resultSrtUrl: string;
    preview?: any;
    actualCost?: number;
  }
) {
  try {
    await db
      .update(dubTasks)
      .set({
        status: 'completed',
        progress: '100',
        resultVideoUrl: data.resultVideoUrl,
        resultSrtUrl: data.resultSrtUrl,
        resultPreview: data.preview || null,
        actualCost: data.actualCost || 0,
        completedAt: new Date(),
        updatedAt: new Date(),
        dedupeKey: null,
      })
      .where(and(eq(dubTasks.id, taskId), eq(dubTasks.workerId, workerId)));

    await appendTaskLog(
      taskId,
      'completed',
      `✅ Hoàn thành: Video đã được xử lý xong và sẵn sàng phát hoặc tải về máy.`
    );

    return { success: true };
  } catch (error: any) {
    console.error('[hero-dub-actions] completeTaskAction error:', error);
    return { error: 'Lỗi hoàn thành tác vụ: ' + error.message };
  }
}

// === R2 PRESIGNED ACTIONS ===

export async function getPresignedUploadUrlAction(taskId: number, teamId: number, fileType: 'video' | 'srt') {
  try {
    // 🔐 SECURITY: Verify taskId belongs to teamId (chống IDOR)
    const [task] = await db
      .select({ id: dubTasks.id })
      .from(dubTasks)
      .where(and(eq(dubTasks.id, taskId), eq(dubTasks.teamId, teamId)))
      .limit(1);

    if (!task) {
      return { error: 'Tác vụ không tồn tại hoặc không thuộc quyền truy cập của bạn' };
    }

    const ext = fileType === 'video' ? 'mp4' : 'srt';
    const contentType = fileType === 'video' ? 'video/mp4' : 'text/plain';
    const key = `hero-dub/${teamId}/${taskId}/result.${ext}`;

    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);
    return { success: true, uploadUrl, publicUrl };
  } catch (error: any) {
    console.error('[hero-dub-actions] getPresignedUploadUrlAction error:', error);
    return { error: 'Lỗi tạo presigned URL: ' + error.message };
  }
}
