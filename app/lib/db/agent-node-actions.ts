'use server';

import { db } from './drizzle';
import { agentNodeTasks, agentNodeResults } from './schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// 1. Tạo task cào mới
export async function createScrapeTaskAction(data: {
  teamId: number;
  userId: number;
  url: string;
  type?: string;
  priority?: number;
  aiConnectionId?: number | null;
}) {
  try {
    const [newTask] = await db.insert(agentNodeTasks).values({
      teamId: data.teamId,
      userId: data.userId,
      url: data.url,
      type: data.type || 'article',
      priority: data.priority || 3,
      aiConnectionId: data.aiConnectionId || null,
      status: 'pending',
    }).returning();

    return { success: true, taskId: newTask.id };
  } catch (error: any) {
    console.error('[agent-node-actions] createScrapeTaskAction error:', error);
    return { error: 'Lỗi tạo task cào: ' + error.message };
  }
}

// 2. Lấy danh sách task (cho dashboard hoặc test, không dùng cho extension polling)
export async function getAgentNodeTasksAction(
  teamId: number,
  status?: string,
  limit?: number
) {
  try {
    let query;

    if (status) {
      query = db
        .select()
        .from(agentNodeTasks)
        .where(and(eq(agentNodeTasks.teamId, teamId), eq(agentNodeTasks.status, status)))
        .orderBy(desc(agentNodeTasks.createdAt));
    } else {
      query = db
        .select()
        .from(agentNodeTasks)
        .where(eq(agentNodeTasks.teamId, teamId))
        .orderBy(desc(agentNodeTasks.createdAt));
    }

    if (limit) {
      query = query.limit(limit) as any;
    }

    const tasks = await query;
    return { success: true, tasks };
  } catch (error: any) {
    console.error('[agent-node-actions] getAgentNodeTasksAction error:', error);
    return { error: 'Lỗi tải danh sách task: ' + error.message };
  }
}

// 3. Cập nhật trạng thái task
export async function updateTaskStatusAction(
  taskId: number,
  teamId: number,
  status: string,
  errorMessage?: string
) {
  try {
    const values: any = { status, updatedAt: new Date() };
    if (status === 'processing' || status === 'assigned') {
      values.assignedAt = new Date();
    } else if (status === 'completed' || status === 'failed') {
      values.completedAt = new Date();
      if (errorMessage) values.errorMessage = errorMessage;
    }

    await db
      .update(agentNodeTasks)
      .set(values)
      .where(and(eq(agentNodeTasks.id, taskId), eq(agentNodeTasks.teamId, teamId)));

    return { success: true };
  } catch (error: any) {
    console.error('[agent-node-actions] updateTaskStatusAction error:', error);
    return { error: 'Lỗi cập nhật trạng thái task: ' + error.message };
  }
}

// 4. Lưu kết quả cào & phân tích AI
export async function saveTaskResultAction(data: {
  taskId: number;
  teamId: number;
  rawTitle?: string;
  rawContent?: string;
  rawMetadata?: any;
  rawLength?: number;
  cleanLength?: number;
  sourceUrl?: string;
  aiSummary?: string;
  aiAnalysis?: any;
  aiModel?: string;
  aiTokensUsed?: number;
  tags?: string[];
  keywords?: string[];
  contentAngles?: string[];
  tone?: string;
  language?: string;
  contentReady?: boolean;
}) {
  try {
    const [result] = await db
      .insert(agentNodeResults)
      .values({
        taskId: data.taskId,
        teamId: data.teamId,
        rawTitle: data.rawTitle || null,
        rawContent: data.rawContent || null,
        rawMetadata: data.rawMetadata || {},
        rawLength: data.rawLength || null,
        cleanLength: data.cleanLength || null,
        sourceUrl: data.sourceUrl || null,
        aiSummary: data.aiSummary || null,
        aiAnalysis: data.aiAnalysis || {},
        aiModel: data.aiModel || null,
        aiTokensUsed: data.aiTokensUsed || null,
        tags: data.tags || [],
        keywords: data.keywords || [],
        contentAngles: data.contentAngles || [],
        tone: data.tone || null,
        language: data.language || 'vi',
        contentReady: data.contentReady || false,
      })
      .returning();

    return { success: true, resultId: result.id };
  } catch (error: any) {
    console.error('[agent-node-actions] saveTaskResultAction error:', error);
    return { error: 'Lỗi lưu kết quả task: ' + error.message };
  }
}

// 5. Lấy danh sách kết quả cào
export async function getTaskResultsAction(teamId: number, limit?: number) {
  try {
    let query = db
      .select()
      .from(agentNodeResults)
      .where(eq(agentNodeResults.teamId, teamId))
      .orderBy(desc(agentNodeResults.createdAt));

    if (limit) {
      query = query.limit(limit) as any;
    }

    const results = await query;
    return { success: true, results };
  } catch (error: any) {
    console.error('[agent-node-actions] getTaskResultsAction error:', error);
    return { error: 'Lỗi tải danh sách kết quả: ' + error.message };
  }
}

// 6. Thống kê số lượng task
export async function getAgentNodeStatsAction(teamId: number) {
  try {
    const stats = await db
      .select({
        status: agentNodeTasks.status,
        count: sql<number>`count(*)::int`,
      })
      .from(agentNodeTasks)
      .where(eq(agentNodeTasks.teamId, teamId))
      .groupBy(agentNodeTasks.status);

    const result = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const stat of stats) {
      if (stat.status === 'pending') result.pending = stat.count;
      else if (stat.status === 'processing' || stat.status === 'assigned') result.processing += stat.count;
      else if (stat.status === 'completed') result.completed = stat.count;
      else if (stat.status === 'failed') result.failed = stat.count;
    }

    return { success: true, stats: result };
  } catch (error: any) {
    console.error('[agent-node-actions] getAgentNodeStatsAction error:', error);
    return { error: 'Lỗi lấy thống kê task: ' + error.message };
  }
}

// 7. CONTENT PIPELINE API (cho MVP Content Creator dùng sau này)
export async function getContentReadyResultsAction(
  teamId: number,
  filters?: {
    tags?: string[];
    language?: string;
    limit?: number;
  }
) {
  try {
    let conditions = [
      eq(agentNodeResults.teamId, teamId),
      eq(agentNodeResults.contentReady, true)
    ];

    if (filters?.language) {
      conditions.push(eq(agentNodeResults.language, filters.language));
    }

    if (filters?.tags && filters.tags.length > 0) {
      const tagsArrayStr = `ARRAY[${filters.tags.map(t => `'${t}'`).join(',')}]`;
      conditions.push(sql`${agentNodeResults.tags} ?| ${sql.raw(tagsArrayStr)}`);
    }

    let query = db
      .select()
      .from(agentNodeResults)
      .where(and(...conditions))
      .orderBy(desc(agentNodeResults.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    const results = await query;
    return { success: true, results };
  } catch (error: any) {
    console.error('[agent-node-actions] getContentReadyResultsAction error:', error);
    return { error: 'Lỗi tải content-ready results: ' + error.message };
  }
}

// Lọc kết quả theo danh sách tags cụ thể
export async function getResultsByTagsAction(teamId: number, tags: string[]) {
  return getContentReadyResultsAction(teamId, { tags });
}

// Đánh dấu kết quả đã được sử dụng
export async function markResultUsedAction(
  resultId: number,
  teamId: number,
  usedByModule: string
) {
  try {
    const [existing] = await db
      .select({ rawMetadata: agentNodeResults.rawMetadata })
      .from(agentNodeResults)
      .where(and(eq(agentNodeResults.id, resultId), eq(agentNodeResults.teamId, teamId)))
      .limit(1);

    if (!existing) {
      return { error: 'Kết quả không tồn tại' };
    }

    const metadata = (existing.rawMetadata as any) || {};
    const usedBy = metadata.usedBy || [];
    if (!usedBy.includes(usedByModule)) {
      usedBy.push(usedByModule);
    }
    metadata.usedBy = usedBy;

    await db
      .update(agentNodeResults)
      .set({ rawMetadata: metadata })
      .where(eq(agentNodeResults.id, resultId));

    return { success: true };
  } catch (error: any) {
    console.error('[agent-node-actions] markResultUsedAction error:', error);
    return { error: 'Lỗi đánh dấu kết quả đã dùng: ' + error.message };
  }
}
