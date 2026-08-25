'use server';

import { db } from './drizzle';
import { dubTasks, dubWorkers, teams, users, extensionLinkCodes, connectHubConnections, dubProjects, dubScanConfigs, dubResourceLocks } from './schema';
import { decryptField } from '../sim-crypto';
import { eq, and, desc, sql, isNull, gt, lt, inArray, notInArray, or } from 'drizzle-orm';
import { executeAction } from '@/lib/connect-hub/connectors/engine';
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
  videoSlowdown?: string;
  outputFolder?: string;
  translateContext?: string;
  redesignThumbnailEnabled?: boolean;
  thumbnailLogoSource?: string;
  customThumbnailLogoUrl?: string;
  thumbnailAiAppSlug?: string;
  thumbnailAiModel?: string;
  publishingPackEnabled?: boolean;
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

    const [existing] = await db
      .select()
      .from(dubTasks)
      .where(
        and(
          eq(dubTasks.teamId, data.teamId),
          eq(dubTasks.dedupeKey, dedupeKey)
        )
      )
      .limit(1);

    if (existing) {
      const updatePayload: Record<string, any> = {};
      if (data.scanConfigId && existing.scanConfigId !== data.scanConfigId) {
        updatePayload.scanConfigId = data.scanConfigId;
      }
      if (data.sourceThumbnailUrl && existing.sourceThumbnailUrl !== data.sourceThumbnailUrl) {
        updatePayload.sourceThumbnailUrl = data.sourceThumbnailUrl;
      }
      if (data.taskTitle && existing.sourceTitle !== data.taskTitle) {
        updatePayload.sourceTitle = data.taskTitle;
      }
      if (data.translateContext && existing.translateContext !== data.translateContext) {
        updatePayload.translateContext = data.translateContext;
      }
      if (data.videoSlowdown && existing.videoSlowdown !== data.videoSlowdown) {
        updatePayload.videoSlowdown = data.videoSlowdown;
      }
      if (data.publishingPackEnabled !== undefined && existing.publishingPackEnabled !== data.publishingPackEnabled) {
        updatePayload.publishingPackEnabled = data.publishingPackEnabled;
      }
      if (Object.keys(updatePayload).length > 0) {
        await db
          .update(dubTasks)
          .set(updatePayload)
          .where(eq(dubTasks.id, existing.id));
      }
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
        ttsSpeed: data.ttsSpeed || '1.2',
        bgVolume: data.bgVolume,
        ttsVolume: data.ttsVolume,
        videoSlowdown: data.videoSlowdown || '1.0',
        outputFolder: data.outputFolder,
        translateContext: data.translateContext || null,
        redesignThumbnailEnabled: data.redesignThumbnailEnabled ?? false,
        thumbnailLogoSource: data.thumbnailLogoSource || 'project',
        customThumbnailLogoUrl: data.customThumbnailLogoUrl || null,
        thumbnailAiAppSlug: data.thumbnailAiAppSlug || null,
        thumbnailAiModel: data.thumbnailAiModel || null,
        publishingPackEnabled: data.publishingPackEnabled ?? true,
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
    scanConfigId?: number | null;
    limit?: number;
    offset?: number;
  }
) {
  try {
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    // 1. Base conditions (chỉ lọc theo Team & Dự án Quét - dùng để tính TaskStats cố định cho toàn bộ dự án)
    let baseConditions = [eq(dubTasks.teamId, teamId)];
    if (filters?.scanConfigId !== undefined) {
      const parsedId = filters.scanConfigId === null ? null : typeof filters.scanConfigId === 'string' ? parseInt(filters.scanConfigId) : filters.scanConfigId;
      if (parsedId === null || parsedId === 0 || isNaN(parsedId)) {
        baseConditions.push(isNull(dubTasks.scanConfigId));
      } else {
        baseConditions.push(or(eq(dubTasks.scanConfigId, parsedId), eq(dubTasks.projectId, parsedId))!);
      }
    }

    // 2. List conditions (thêm lọc theo nhóm trạng thái status nếu người dùng đang dùng Bộ Lọc)
    let listConditions = [...baseConditions];
    if (filters?.status && filters.status !== 'all') {
      const s = filters.status;
      if (s === 'processing') {
        listConditions.push(inArray(dubTasks.status, ['assigned', 'downloading', 'transcribing', 'translating', 'tts', 'burning', 'uploading', 'processing', 'dubbing', 'running', 'active']));
      } else if (s === 'completed') {
        listConditions.push(inArray(dubTasks.status, ['completed', 'done', 'finished', 'success']));
      } else if (s === 'failed') {
        listConditions.push(inArray(dubTasks.status, ['failed', 'error', 'cancelled', 'paused']));
      } else if (s === 'pending') {
        listConditions.push(
          or(
            inArray(dubTasks.status, ['pending', 'queued', 'created', 'ready']),
            isNull(dubTasks.status),
            notInArray(dubTasks.status, [
              'assigned', 'downloading', 'transcribing', 'translating', 'tts', 'burning', 'uploading', 'processing', 'dubbing', 'running', 'active',
              'completed', 'done', 'finished', 'success',
              'failed', 'error', 'cancelled', 'paused'
            ])
          )!
        );
      } else {
        listConditions.push(eq(dubTasks.status, s));
      }
    }

    // Query danh sách tác vụ phân trang kèm tên Worker
    const rawTasks = await db
      .select({
        task: dubTasks,
        workerName: dubWorkers.deviceName,
      })
      .from(dubTasks)
      .leftJoin(dubWorkers, eq(dubTasks.workerId, dubWorkers.id))
      .where(and(...listConditions))
      .orderBy(
        sql`CASE 
          WHEN ${dubTasks.status} IN ('assigned', 'downloading', 'transcribing', 'translating', 'tts', 'burning', 'uploading', 'processing', 'dubbing', 'running', 'active') THEN 1
          WHEN ${dubTasks.status} = 'pending' THEN 2
          ELSE 3
        END`,
        desc(dubTasks.createdAt)
      )
      .limit(limit)
      .offset(offset);

    const tasks = rawTasks.map(r => ({
      ...r.task,
      workerName: r.workerName || null,
    }));

    // Query tổng số lượng cho danh sách đang hiển thị theo bộ lọc
    const [filteredCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dubTasks)
      .where(and(...listConditions));

    // Query TaskStats tổng thể cho TOÀN BỘ DỰ ÁN (dựa trên baseConditions)
    const [countResult] = await db
      .select({
        total: sql<number>`count(*)::int`,
        processing: sql<number>`count(*) filter (where ${dubTasks.status} in ('assigned', 'downloading', 'transcribing', 'translating', 'tts', 'burning', 'uploading', 'processing', 'dubbing', 'running', 'active'))::int`,
        completed: sql<number>`count(*) filter (where ${dubTasks.status} in ('completed', 'done', 'finished', 'success'))::int`,
        failed: sql<number>`count(*) filter (where ${dubTasks.status} in ('failed', 'error', 'cancelled', 'paused'))::int`,
        pending: sql<number>`count(*) filter (where ${dubTasks.status} in ('pending', 'queued', 'created', 'ready') or ${dubTasks.status} is null or ${dubTasks.status} not in ('assigned', 'downloading', 'transcribing', 'translating', 'tts', 'burning', 'uploading', 'processing', 'dubbing', 'running', 'active', 'completed', 'done', 'finished', 'success', 'failed', 'error', 'cancelled', 'paused'))::int`,
      })
      .from(dubTasks)
      .where(and(...baseConditions));

    const total = countResult?.total || 0;
    const processing = countResult?.processing || 0;
    const completed = countResult?.completed || 0;
    const failed = countResult?.failed || 0;
    const pending = countResult?.pending || (total - processing - completed - failed);

    return {
      success: true,
      tasks,
      totalCount: filteredCountRes?.count || tasks.length,
      taskStats: {
        total,
        processing,
        pending: pending < 0 ? 0 : pending,
        completed,
        failed,
      }
    };
  } catch (error: any) {
    console.error('[hero-dub-actions] getDubTasksAction error:', error);
    return { error: 'Lỗi lấy danh sách tác vụ: ' + error.message };
  }
}

export async function retryTasksByScanConfigAction(scanConfigId: number, teamId: number) {
  try {
    const updated = await db
      .update(dubTasks)
      .set({
        status: 'pending',
        error: null,
        progress: '0%',
        retryCount: sql`${dubTasks.retryCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dubTasks.teamId, teamId),
          eq(dubTasks.scanConfigId, scanConfigId),
          eq(dubTasks.status, 'failed')
        )
      )
      .returning({ id: dubTasks.id });

    return { success: true, retriedCount: updated.length };
  } catch (error: any) {
    console.error('[hero-dub-actions] retryTasksByScanConfigAction error:', error);
    return { error: 'Lỗi thử lại tác vụ: ' + error.message };
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
    if (data.videoSlowdown !== undefined) updateData.videoSlowdown = data.videoSlowdown;
    if (data.translateContext !== undefined) updateData.translateContext = data.translateContext;

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

export async function resetDubWorkerAction(workerId: number, teamId: number) {
  try {
    // 1. Tìm tất cả task đang bị kẹt/xử lý bởi worker này
    const stuckTasks = await db
      .select({ id: dubTasks.id })
      .from(dubTasks)
      .where(
        and(
          eq(dubTasks.workerId, workerId),
          eq(dubTasks.teamId, teamId),
          inArray(dubTasks.status, ['assigned', 'downloading', 'transcribing', 'translating', 'tts', 'burning', 'uploading', 'processing', 'dubbing', 'running', 'active'])
        )
      );

    // 2. Reset tất cả task về pending và giải phóng workerId
    for (const t of stuckTasks) {
      await db
        .update(dubTasks)
        .set({
          status: 'pending',
          workerId: null,
          progress: '0',
          updatedAt: new Date(),
        })
        .where(eq(dubTasks.id, t.id));

      await appendTaskLog(t.id, 'reset', '🔄 Gỡ lỗi: Admin đã giải phóng tác vụ về hàng đợi.');
    }

    // 3. Giải phóng resource locks nếu có
    await db
      .delete(dubResourceLocks)
      .where(and(eq(dubResourceLocks.workerId, workerId), eq(dubResourceLocks.teamId, teamId)));

    return { success: true, releasedCount: stuckTasks.length };
  } catch (error: any) {
    console.error('[hero-dub-actions] resetDubWorkerAction error:', error);
    return { error: 'Lỗi gỡ lỗi worker: ' + error.message };
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
    // 0. AUTO ZOMBIE RECOVERY (Toàn cục cho Team)
    // Tìm các worker offline (lastSeenAt < 3 phút trước)
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const stuckTasks = await db
      .select({ id: dubTasks.id, workerName: dubWorkers.deviceName, stuckWorkerId: dubTasks.workerId })
      .from(dubTasks)
      .leftJoin(dubWorkers, eq(dubTasks.workerId, dubWorkers.id))
      .where(
        and(
          eq(dubTasks.teamId, teamId),
          inArray(dubTasks.status, [
            'assigned', 'downloading', 'transcribing', 'translating', 'tts', 'burning', 'uploading', 'processing', 'dubbing', 'running', 'active'
          ]),
          or(
            lt(dubWorkers.lastSeenAt, threeMinutesAgo),
            isNull(dubWorkers.id)
          )
        )
      );

    if (stuckTasks.length > 0) {
      for (const t of stuckTasks) {
        await db
          .update(dubTasks)
          .set({
            status: 'pending',
            workerId: null,
            progress: '0',
            updatedAt: new Date(),
          })
          .where(eq(dubTasks.id, t.id));
        
        await appendTaskLog(
          t.id, 
          'reset', 
          `🔄 Tự động gỡ lỗi: Worker [${t.workerName || 'Offline Worker'}] mất kết nối, hệ thống giải phóng tác vụ về hàng đợi.`
        );

        if (t.stuckWorkerId) {
          await db
            .delete(dubResourceLocks)
            .where(and(eq(dubResourceLocks.teamId, teamId), eq(dubResourceLocks.workerId, t.stuckWorkerId)));
        }
      }
    }

    // 1. Ưu tiên tìm task đang làm dở của CHÍNH worker này
    let [task] = await db
      .select()
      .from(dubTasks)
      .where(
        and(
          eq(dubTasks.teamId, teamId),
          eq(dubTasks.workerId, workerId),
          inArray(dubTasks.status, [
            'assigned', 'downloading', 'transcribing', 'translating', 'tts', 'burning', 'uploading', 'processing', 'dubbing', 'running', 'active'
          ])
        )
      )
      .orderBy(dubTasks.updatedAt)
      .limit(1);

    // 2. Nếu không có task dở dang, lấy task pending ưu tiên nhất
    let isNewTask = false;
    if (!task) {
      const [pendingTaskResult] = await db
        .select({ task: dubTasks })
        .from(dubTasks)
        .where(
          and(
            eq(dubTasks.teamId, teamId),
            eq(dubTasks.status, 'pending')
          )
        )
        .orderBy(dubTasks.createdAt)
        .limit(1);
      
      if (pendingTaskResult?.task) {
        task = pendingTaskResult.task;
        isNewTask = true;
      }
    }

    if (!task) {
      return { success: true, task: null };
    }

    if (isNewTask) {
      const [updatedTask] = await db
        .update(dubTasks)
        .set({
          status: 'assigned',
          workerId,
          startedAt: task.startedAt || new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(dubTasks.id, task.id), eq(dubTasks.status, 'pending')))
        .returning();

      if (!updatedTask) {
        return { success: true, task: null };
      }
      task = updatedTask;
      
      // Ghi log chỉ khi mới nhận task
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
    }

    let finalOutputFolder = task.outputFolder;
    if (!finalOutputFolder && task.scanConfigId) {
      const [scanConf] = await db
        .select({ outputFolder: dubScanConfigs.outputFolder })
        .from(dubScanConfigs)
        .where(eq(dubScanConfigs.id, task.scanConfigId))
        .limit(1);
      if (scanConf?.outputFolder) {
        finalOutputFolder = scanConf.outputFolder;
      }
    }

    const taskPayload = {
      ...task,
      outputFolder: finalOutputFolder || undefined,
      output_folder: finalOutputFolder || undefined,
    };

    return { success: true, task: taskPayload };
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
    resultThumbnailUrl?: string;
    translatedTitle?: string;
    videoDescription?: string;
    videoHashtags?: string;
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
        resultThumbnailUrl: data.resultThumbnailUrl || undefined,
        translatedTitle: data.translatedTitle || undefined,
        videoDescription: data.videoDescription || undefined,
        videoHashtags: data.videoHashtags || undefined,
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

// === PAUSE / RESUME & CLEAR ACTIONS ===

export async function pauseDubTaskAction(taskId: number, teamId: number) {
  try {
    const [task] = await db
      .select({ id: dubTasks.id, status: dubTasks.status })
      .from(dubTasks)
      .where(and(eq(dubTasks.id, taskId), eq(dubTasks.teamId, teamId)))
      .limit(1);

    if (!task) {
      return { error: 'Tác vụ không tồn tại hoặc không có quyền' };
    }

    await db
      .update(dubTasks)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(eq(dubTasks.id, taskId));

    await appendTaskLog(taskId, 'paused', '⏸️ Đã tạm dừng tác vụ theo yêu cầu người dùng.');
    return { success: true };
  } catch (error: any) {
    console.error('[hero-dub-actions] pauseDubTaskAction error:', error);
    return { error: 'Lỗi tạm dừng tác vụ: ' + error.message };
  }
}

export async function resumeDubTaskAction(taskId: number, teamId: number) {
  try {
    const [task] = await db
      .select({ id: dubTasks.id, status: dubTasks.status })
      .from(dubTasks)
      .where(and(eq(dubTasks.id, taskId), eq(dubTasks.teamId, teamId)))
      .limit(1);

    if (!task) {
      return { error: 'Tác vụ không tồn tại hoặc không có quyền' };
    }

    await db
      .update(dubTasks)
      .set({ status: 'pending', error: null, updatedAt: new Date() })
      .where(eq(dubTasks.id, taskId));

    await appendTaskLog(taskId, 'resumed', '▶️ Đã kích hoạt lại tác vụ. Đang chờ Worker xử lý.');
    return { success: true };
  } catch (error: any) {
    console.error('[hero-dub-actions] resumeDubTaskAction error:', error);
    return { error: 'Lỗi tiếp tục tác vụ: ' + error.message };
  }
}

export async function clearAllDubDataAction(teamId: number) {
  try {
    // 1. Xóa toàn bộ tác vụ của team
    await db.delete(dubTasks).where(eq(dubTasks.teamId, teamId));

    // 2. Xóa toàn bộ scan configs của team
    await db.delete(dubScanConfigs).where(eq(dubScanConfigs.teamId, teamId));

    return { success: true };
  } catch (error: any) {
    console.error('[hero-dub-actions] clearAllDubDataAction error:', error);
    return { error: 'Lỗi dọn dẹp dữ liệu: ' + error.message };
  }
}

export async function clearUnassignedDubTasksAction(teamId: number) {
  try {
    await db.delete(dubTasks).where(and(eq(dubTasks.teamId, teamId), isNull(dubTasks.scanConfigId)));
    return { success: true };
  } catch (error: any) {
    console.error('[hero-dub-actions] clearUnassignedDubTasksAction error:', error);
    return { error: 'Lỗi xóa tác vụ lẻ: ' + error.message };
  }
}

export async function pauseAllDubTasksAction(teamId: number, scanConfigId?: number | null) {
  try {
    const condition = scanConfigId !== undefined && scanConfigId !== null
      ? and(eq(dubTasks.teamId, teamId), eq(dubTasks.scanConfigId, scanConfigId), inArray(dubTasks.status, ['pending', 'running']))
      : and(eq(dubTasks.teamId, teamId), isNull(dubTasks.scanConfigId), inArray(dubTasks.status, ['pending', 'running']));

    await db
      .update(dubTasks)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(condition);

    return { success: true };
  } catch (error: any) {
    console.error('[hero-dub-actions] pauseAllDubTasksAction error:', error);
    return { error: 'Lỗi tạm dừng tất cả: ' + error.message };
  }
}

export async function resumeAllDubTasksAction(teamId: number, scanConfigId?: number | null) {
  try {
    const condition = scanConfigId !== undefined && scanConfigId !== null
      ? and(eq(dubTasks.teamId, teamId), eq(dubTasks.scanConfigId, scanConfigId), eq(dubTasks.status, 'paused'))
      : and(eq(dubTasks.teamId, teamId), isNull(dubTasks.scanConfigId), eq(dubTasks.status, 'paused'));

    await db
      .update(dubTasks)
      .set({ status: 'pending', error: null, updatedAt: new Date() })
      .where(condition);

    return { success: true };
  } catch (error: any) {
    console.error('[hero-dub-actions] resumeAllDubTasksAction error:', error);
    return { error: 'Lỗi tiếp tục tất cả: ' + error.message };
  }
}

// === RESOURCE LOCKING ACTIONS ===

export async function acquireResourceLockAction(
  teamId: number,
  workerId: number,
  taskId: number,
  resourceKey: string
) {
  try {
    const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 phút timeout
    const now = new Date();

    const [existingLock] = await db
      .select()
      .from(dubResourceLocks)
      .where(
        and(
          eq(dubResourceLocks.teamId, teamId),
          eq(dubResourceLocks.resourceKey, resourceKey)
        )
      )
      .limit(1);

    if (existingLock) {
      if (existingLock.lockedByTask === taskId) {
        await db
          .update(dubResourceLocks)
          .set({ lockedAt: now, workerId })
          .where(eq(dubResourceLocks.id, existingLock.id));
        return { success: true, acquired: true };
      }

      const lockAge = now.getTime() - new Date(existingLock.lockedAt).getTime();
      if (lockAge < LOCK_TIMEOUT_MS) {
        return {
          success: true,
          acquired: false,
          holderTaskId: existingLock.lockedByTask,
          message: `Resource '${resourceKey}' đang được sử dụng bởi Task #${existingLock.lockedByTask}`,
        };
      }

      // Timeout > 30 min -> Override lock
      await db
        .update(dubResourceLocks)
        .set({
          lockedByTask: taskId,
          workerId,
          lockedAt: now,
        })
        .where(eq(dubResourceLocks.id, existingLock.id));

      return { success: true, acquired: true, note: 'Override stale lock' };
    }

    await db.insert(dubResourceLocks).values({
      teamId,
      resourceKey,
      lockedByTask: taskId,
      workerId,
      lockedAt: now,
    });

    return { success: true, acquired: true };
  } catch (error: any) {
    console.error('Error acquiring resource lock:', error);
    return { success: false, acquired: false, error: error.message };
  }
}

export async function releaseResourceLockAction(
  teamId: number,
  workerId: number,
  taskId: number,
  resourceKey: string
) {
  try {
    await db
      .delete(dubResourceLocks)
      .where(
        and(
          eq(dubResourceLocks.teamId, teamId),
          eq(dubResourceLocks.resourceKey, resourceKey),
          eq(dubResourceLocks.lockedByTask, taskId)
        )
      );
    return { success: true };
  } catch (error: any) {
    console.error('Error releasing resource lock:', error);
    return { success: false, error: error.message };
  }
}


export async function testTranslateConnectionAction(
  teamId: number,
  appSlug: string,
  modelName: string
) {
  try {
    const [connection] = await db
      .select()
      .from(connectHubConnections)
      .where(and(eq(connectHubConnections.teamId, teamId), eq(connectHubConnections.appSlug, appSlug)))
      .limit(1);

    if (!connection) {
      return { success: false, error: 'Chưa cài đặt kết nối cho Ứng dụng AI này. Vui lòng kết nối trước.' };
    }

    const decryptedJson = decryptField(connection.encryptedCredentials) || '{}';
    const credentials = JSON.parse(decryptedJson);

    const testPrompt = `Hãy dịch câu sau sang tiếng Việt: "Hello, this is a test connection from HeroDub."`;
    
    // Tạo giả một jobId test ngẫu nhiên để nó không trùng lặp và không bị block
    const testJobId = crypto.randomUUID();

    const result = await executeAction(appSlug, credentials, 'chat_completion', {
      jobId: testJobId,
      model: modelName,
      teamId: teamId,
      connectionId: connection.id,
      messages: [
        { role: 'user', content: testPrompt }
      ],
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Test failed' };
    }

    // Kết quả thường nằm trong result.data.choices[0].message.content hoặc result.data.content
    let responseText = '';
    if (result.data.choices && result.data.choices.length > 0) {
      responseText = result.data.choices[0].message?.content || '';
    } else if (result.data.content) {
      responseText = result.data.content;
    } else {
      responseText = JSON.stringify(result.data);
    }

    return { success: true, result: responseText };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi không xác định khi test.' };
  }
}

export async function testImageAiConnectionAction(
  teamId: number,
  appSlug: string,
  modelName: string,
  sampleImageUrl?: string
) {
  try {
    const [connection] = await db
      .select()
      .from(connectHubConnections)
      .where(and(eq(connectHubConnections.teamId, teamId), eq(connectHubConnections.appSlug, appSlug)))
      .limit(1);

    if (!connection) {
      return { success: false, error: 'Chưa cài đặt kết nối cho Ứng dụng Image AI này. Vui lòng kết nối trước.' };
    }

    const decryptedJson = decryptField(connection.encryptedCredentials) || '{}';
    const credentials = JSON.parse(decryptedJson);

    // Ảnh đính kèm mẫu mặc định nếu người dùng chưa chọn ảnh
    const defaultSampleImage = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80";
    const imageUrlToTest = sampleImageUrl && sampleImageUrl.startsWith('http') ? sampleImageUrl : defaultSampleImage;

    const testPrompt = `Hãy thiết kế lại hình ảnh thumbnail này sang phiên bản Tiếng Việt Nam chuyên nghiệp. Giữ nguyên 100% hình dạng, màu sắc và tỷ lệ logo gốc từ ảnh đính kèm. Đảm bảo giữ nguyên tỷ lệ khung hình gốc, phong cách đẹp mắt và ấn tượng.`;
    const testJobId = crypto.randomUUID();

    const result = await executeAction(appSlug, credentials, 'generate_image', {
      jobId: testJobId,
      model: modelName,
      teamId: teamId,
      connectionId: connection.id,
      prompt: testPrompt,
      attachments: [imageUrlToTest],
      width: 1280,
      height: 720
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Test sinh ảnh thất bại' };
    }

    let imageUrl = '';
    if (typeof result.data === 'string') {
      imageUrl = result.data;
    } else if (result.data.url) {
      imageUrl = result.data.url;
    } else if (result.data.image_url) {
      imageUrl = result.data.image_url;
    } else if (result.data.data && result.data.data[0]?.url) {
      imageUrl = result.data.data[0].url;
    } else if (result.data.choices && result.data.choices[0]?.message?.content) {
      imageUrl = result.data.choices[0].message.content;
    } else {
      imageUrl = JSON.stringify(result.data);
    }

    // Trích xuất URL ảnh từ markdown ![...](https://...)
    const imgMatch = imageUrl.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
    if (imgMatch) {
      imageUrl = imgMatch[1];
    }

    return { success: true, result: imageUrl };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi không xác định khi test Image AI.' };
  }
}

export async function testPublishingSuiteAction(
  teamId: number,
  appSlug?: string,
  modelName?: string
) {
  try {
    const effectiveAppSlug = appSlug || 'browser-ai-bridge';
    const effectiveModel = modelName || 'gemini';

    const [connection] = await db
      .select()
      .from(connectHubConnections)
      .where(and(eq(connectHubConnections.teamId, teamId), eq(connectHubConnections.appSlug, effectiveAppSlug)))
      .limit(1);

    if (!connection) {
      return { success: false, error: `Chưa cài đặt kết nối cho Ứng dụng ${effectiveAppSlug}. Vui lòng kiểm tra Connect Hub.` };
    }

    const decryptedJson = decryptField(connection.encryptedCredentials) || '{}';
    const credentials = JSON.parse(decryptedJson);

    const testPrompt = `[HỆ THỐNG: BẮT BUỘC CHỈ TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON. KHÔNG CHÀO HỎI, KHÔNG GIẢI THÍCH, KHÔNG HỎI LẠI]

Hãy đóng vai Giám đốc Sáng tạo Nội dung Phim. Dưới đây là thông tin video mẫu:
- Tiêu đề gốc: 1270_ai_co_the_tu_choi_xem_xay_nha_trong_mua_bao
- Các câu thoại tiêu biểu:
- Ai có thể từ chối việc trước khi đi ngủ lướt qua một video xây dựng giữa rừng mưa
- Tiếng ồn trắng tự nhiên này lập tức khiến thần kinh căng thẳng được thư giãn
- Ăn uống no nê, anh ấy nằm vào chiếc chăn ấm áp lắng nghe tiếng mưa rơi

Nhiệm vụ của bạn:
1. "new_title": Đặt lại Tiêu đề Tiếng Việt cực kỳ giật tít, hấp dẫn, chuẩn SEO YouTube/TikTok (dưới 80 ký tự, khơi gợi tò mò).
2. "description": Viết đoạn mô tả ngắn 3-4 câu tóm tắt tình huống kịch tính nhất của video để khán giả xem hết.
3. "hashtags": Tạo bộ 6-8 hashtag xu hướng (bắt đầu bằng dấu #).

CHỈ TRẢ VỀ MÃ JSON THEO ĐÚNG CẤU TRÚC SAU (KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO KHÁC):
{
  "new_title": "Tiêu đề tiếng Việt giật tít tại đây",
  "description": "Đoạn mô tả ngắn 3-4 câu tại đây...",
  "hashtags": "#phimngan #reviewphim #tomtatphim #xuhuong #phimhay"
}`;

    const testJobId = crypto.randomUUID();

    const result = await executeAction(effectiveAppSlug, credentials, 'chat_completion', {
      jobId: testJobId,
      model: effectiveModel,
      teamId: teamId,
      connectionId: connection.id,
      prompt: testPrompt,
      attachments: [],
      messages: [{ role: 'user', content: testPrompt }]
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Test sinh tư liệu thất bại' };
    }

    let rawOut = '';
    if (typeof result.data === 'string') {
      rawOut = result.data;
    } else if (result.data?.choices && result.data.choices[0]?.message?.content) {
      rawOut = result.data.choices[0].message.content;
    } else if (result.data?.content) {
      rawOut = result.data.content;
    } else if (result.data?.result) {
      rawOut = result.data.result;
    } else {
      rawOut = JSON.stringify(result.data);
    }

    return { success: true, result: rawOut };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi không xác định khi test Tư Liệu Đăng Bài.' };
  }
}


