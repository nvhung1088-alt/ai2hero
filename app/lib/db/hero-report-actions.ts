'use server';

import { and, eq, desc, inArray, not, sql } from 'drizzle-orm';
import { db } from './drizzle';
import {
  heroReportSchedules,
  heroReportRuns,
  connectHubConnections,
  teamMembers,
  teams,
  activityLogs
} from './schema';
import { getUser } from './queries';
import { revalidatePath } from 'next/cache';
import { testExecuteReport, executeReportTask } from '../hero-report/engine';
import { z } from 'zod';

/**
 * Kiểu dữ liệu đầu vào khi tạo hoặc cập nhật lịch báo cáo
 */
const CreateScheduleSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống').max(200),
  inputConnectionId: z.number().int().positive('Kết nối nguồn không hợp lệ').optional(),
  inputProvider: z.string().optional(),
  inputSources: z.array(z.object({
    connectionId: z.number().int(),
    provider: z.string(),
    capabilities: z.array(z.string()).default([])
  })).default([]),
  reportSpec: z.record(z.any()),
  outputType: z.string().default('telegram'),
  outputConnectionId: z.number().int().positive('Kết nối đích không hợp lệ'),
  outputConfig: z.record(z.any()),
  scheduleType: z.enum(['manual', 'daily', 'hourly', 'weekly']),
  cronExpression: z.string().optional(),
  timezone: z.string().optional()
});

export type CreateScheduleInput = z.infer<typeof CreateScheduleSchema>;

/**
 * Tính toán thời điểm chạy tiếp theo dựa trên cron expression (GMT+7 cố định cho Việt Nam)
 */
export async function getNextCronOccurrence(cronExpr: string, timezone: string = 'Asia/Ho_Chi_Minh'): Promise<Date> {
  const now = new Date();
  // Asia/Ho_Chi_Minh luôn là UTC+7 cố định (không có giờ mùa hè DST)
  const offset = 7;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const local = new Date(utc + (offset * 3600000));
  
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return new Date(now.getTime() + 3600000); // Mặc định chạy sau 1 giờ nếu cấu hình cron sai
  }
  
  const [minPart, hourPart, domPart, monthPart, dowPart] = parts;
  
  let nextLocal = new Date(local);
  nextLocal.setSeconds(0, 0);
  
  // 1. Chạy hàng giờ: "0 * * * *"
  if (hourPart === '*' && minPart !== '*') {
    const targetMin = parseInt(minPart, 10) || 0;
    nextLocal.setMinutes(targetMin);
    if (nextLocal <= local) {
      nextLocal.setHours(nextLocal.getHours() + 1);
    }
  } 
  // 2. Chạy hàng ngày: "0 8 * * *"
  else if (hourPart !== '*' && minPart !== '*' && domPart === '*' && monthPart === '*' && dowPart === '*') {
    const targetHour = parseInt(hourPart, 10);
    const targetMin = parseInt(minPart, 10);
    nextLocal.setHours(targetHour, targetMin, 0, 0);
    if (nextLocal <= local) {
      nextLocal.setDate(nextLocal.getDate() + 1);
    }
  }
  // 3. Chạy hàng tuần: "0 8 * * 1" (dow: 0-6 hoặc 7 là Chủ Nhật)
  else if (dowPart !== '*' && hourPart !== '*' && minPart !== '*') {
    const targetHour = parseInt(hourPart, 10);
    const targetMin = parseInt(minPart, 10);
    let targetDow = parseInt(dowPart, 10);
    if (targetDow === 7) targetDow = 0;
    
    nextLocal.setHours(targetHour, targetMin, 0, 0);
    
    const currentDow = nextLocal.getDay();
    let daysToAdd = (targetDow - currentDow + 7) % 7;
    
    if (daysToAdd === 0 && nextLocal <= local) {
      daysToAdd = 7;
    }
    nextLocal.setDate(nextLocal.getDate() + daysToAdd);
  } 
  // Mặc định cộng 1 ngày
  else {
    nextLocal.setDate(nextLocal.getDate() + 1);
  }
  
  // Chuyển ngược thời gian GMT+7 địa phương về UTC Epoch thực tế
  const nextUtcTime = nextLocal.getTime() - (offset * 3600000);
  return new Date(nextUtcTime);
}

/**
 * Helper kiểm tra quyền truy cập không gian làm việc và xem app Hero Report đã được kích hoạt chưa
 */
async function verifyHeroReportAccess(targetTeamId: number, requireRole?: string[]) {
  const user = await getUser();
  if (!user) {
    throw new Error('Chưa đăng nhập');
  }

  const member = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, targetTeamId), eq(teamMembers.userId, user.id)))
    .limit(1);

  if (member.length === 0) {
    throw new Error('Không có quyền truy cập Không gian làm việc này');
  }

  if (requireRole && !requireRole.includes(member[0].role)) {
    throw new Error('Bạn không có quyền thực hiện hành động này');
  }

  // App activation check
  const team = await db
    .select()
    .from(teams)
    .where(eq(teams.id, targetTeamId))
    .limit(1);

  if (team.length === 0 || team[0].deletedAt) {
    throw new Error('Không gian làm việc không tồn tại hoặc đã bị xóa');
  }

  const activatedApps = (team[0].activatedApps as string[]) || [];
  if (!activatedApps.includes('hero-report')) {
    throw new Error(`Ứng dụng Hero Report chưa được kích hoạt trong Không gian này`);
  }

  return { user, role: member[0].role };
}

function sanitizeError(error: any): string {
  return error?.message || 'Đã xảy ra sự cố kỹ thuật';
}

/**
 * Lấy danh sách toàn bộ cấu hình lịch báo cáo
 */
export async function getReportSchedulesAction(teamId: number) {
  try {
    await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const schedules = await db
      .select()
      .from(heroReportSchedules)
      .where(
        and(
          eq(heroReportSchedules.teamId, teamId),
          not(eq(heroReportSchedules.status, 'deleted'))
        )
      )
      .orderBy(desc(heroReportSchedules.createdAt));
      
    return { success: true, data: schedules };
  } catch (error: any) {
    console.error('Error fetching report schedules:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Tạo mới một cấu hình lịch báo cáo
 */
export async function createReportScheduleAction(
  teamId: number,
  data: CreateScheduleInput
) {
  try {
    const { user } = await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager']);
    
    const parsed = CreateScheduleSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }
    const validData = parsed.data;

    let nextRunAt: Date | null = null;
    if (validData.scheduleType !== 'manual' && validData.cronExpression) {
      nextRunAt = await getNextCronOccurrence(validData.cronExpression, validData.timezone);
    }
    
    const [inserted] = await db
      .insert(heroReportSchedules)
      .values({
        teamId,
        userId: user.id,
        name: validData.name,
        status: 'active',
        inputConnectionId: validData.inputConnectionId ?? (validData.inputSources.length > 0 ? validData.inputSources[0].connectionId : 1),
        inputProvider: validData.inputProvider ?? (validData.inputSources.length > 0 ? validData.inputSources[0].provider : 'unknown'),
        inputSources: validData.inputSources,
        reportSpec: validData.reportSpec,
        outputType: validData.outputType || 'telegram',
        outputConnectionId: validData.outputConnectionId,
        outputConfig: validData.outputConfig || {},
        scheduleType: validData.scheduleType,
        cronExpression: validData.cronExpression || null,
        timezone: validData.timezone || 'Asia/Ho_Chi_Minh',
        nextRunAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
      
    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã tạo cấu hình lịch báo cáo tự động: ${data.name}`
    });
    
    revalidatePath('/hero-report/dashboard');
    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Error creating report schedule:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Cập nhật cấu hình lịch báo cáo
 */
export async function updateReportScheduleAction(
  teamId: number,
  scheduleId: number,
  data: Partial<CreateScheduleInput>
) {
  try {
    const { user } = await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager']);
    
    const parsed = CreateScheduleSchema.partial().safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }
    const validData = parsed.data;

    const [existing] = await db
      .select()
      .from(heroReportSchedules)
      .where(
        and(
          eq(heroReportSchedules.id, scheduleId),
          eq(heroReportSchedules.teamId, teamId)
        )
      )
      .limit(1);
      
    if (!existing) {
      return { success: false, error: 'Không tìm thấy cấu hình lịch báo cáo' };
    }
    
    let nextRunAt = existing.nextRunAt;
    const scheduleType = validData.scheduleType ?? existing.scheduleType;
    const cronExpression = validData.cronExpression ?? existing.cronExpression;
    const timezone = validData.timezone ?? existing.timezone ?? 'Asia/Ho_Chi_Minh';
    
    if (scheduleType === 'manual') {
      nextRunAt = null;
    } else if (cronExpression) {
      nextRunAt = await getNextCronOccurrence(cronExpression, timezone);
    }
    
    const [updated] = await db
      .update(heroReportSchedules)
      .set({
        name: validData.name ?? existing.name,
        inputConnectionId: validData.inputConnectionId ?? existing.inputConnectionId,
        inputProvider: validData.inputProvider ?? existing.inputProvider,
        inputSources: validData.inputSources ?? existing.inputSources,
        reportSpec: validData.reportSpec ?? existing.reportSpec,
        outputType: validData.outputType ?? existing.outputType,
        outputConnectionId: validData.outputConnectionId ?? existing.outputConnectionId,
        outputConfig: validData.outputConfig ?? existing.outputConfig,
        scheduleType,
        cronExpression: cronExpression ?? null,
        timezone,
        nextRunAt,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(heroReportSchedules.id, scheduleId),
          eq(heroReportSchedules.teamId, teamId)
        )
      )
      .returning();
      
    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã cập nhật lịch báo cáo tự động: ${updated.name}`
    });
    
    revalidatePath('/hero-report/dashboard');
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating report schedule:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Tạm dừng hoặc tiếp tục chạy lịch báo cáo tự động
 */
export async function toggleReportScheduleAction(
  teamId: number,
  scheduleId: number,
  newStatus: 'active' | 'paused'
) {
  try {
    const { user } = await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const [existing] = await db
      .select()
      .from(heroReportSchedules)
      .where(
        and(
          eq(heroReportSchedules.id, scheduleId),
          eq(heroReportSchedules.teamId, teamId)
        )
      )
      .limit(1);
      
    if (!existing) {
      return { success: false, error: 'Không tìm thấy cấu hình lịch báo cáo' };
    }
    
    let nextRunAt = existing.nextRunAt;
    if (newStatus === 'active') {
      if (existing.scheduleType !== 'manual' && existing.cronExpression) {
        nextRunAt = await getNextCronOccurrence(existing.cronExpression, existing.timezone ?? 'Asia/Ho_Chi_Minh');
      }
    } else {
      nextRunAt = null;
    }
    
    const [updated] = await db
      .update(heroReportSchedules)
      .set({
        status: newStatus,
        nextRunAt,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(heroReportSchedules.id, scheduleId),
          eq(heroReportSchedules.teamId, teamId)
        )
      )
      .returning();
      
    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã ${newStatus === 'active' ? 'bật lại' : 'tạm dừng'} lịch báo cáo tự động: ${updated.name}`
    });
    
    revalidatePath('/hero-report/dashboard');
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error toggling report schedule status:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Xóa một cấu hình lịch báo cáo tự động (Chuyển thành Soft Delete)
 */
export async function deleteReportScheduleAction(teamId: number, scheduleId: number) {
  try {
    const { user } = await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager']);
    
    const [deleted] = await db
      .update(heroReportSchedules)
      .set({
        status: 'deleted',
        nextRunAt: null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(heroReportSchedules.id, scheduleId),
          eq(heroReportSchedules.teamId, teamId),
          not(eq(heroReportSchedules.status, 'deleted'))
        )
      )
      .returning();
      
    if (!deleted) {
      return { success: false, error: 'Không tìm thấy cấu hình lịch báo cáo hoặc không có quyền xóa' };
    }
    
    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã xóa lịch báo cáo tự động: ${deleted.name}`
    });
    
    revalidatePath('/hero-report/dashboard');
    return { success: true, data: deleted };
  } catch (error: any) {
    console.error('Error deleting report schedule:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Lấy lịch sử thực thi báo cáo
 */
export async function getReportRunsAction(teamId: number, scheduleId?: number, limit: number = 50) {
  try {
    await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const query = db
      .select()
      .from(heroReportRuns)
      .where(
        scheduleId 
          ? and(eq(heroReportRuns.teamId, teamId), eq(heroReportRuns.scheduleId, scheduleId))
          : eq(heroReportRuns.teamId, teamId)
      )
      .orderBy(desc(heroReportRuns.startedAt))
      .limit(limit);
      
    const runs = await query;
    return { success: true, data: runs };
  } catch (error: any) {
    console.error('Error fetching report runs:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Lấy danh sách kết nối nguồn báo cáo hợp lệ (đã được bật trong Connect Hub)
 */
export async function getInputConnectionsAction(teamId: number) {
  try {
    await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const connections = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.teamId, teamId),
          eq(connectHubConnections.status, 'connected'),
          sql`${connectHubConnections.usedByModules} @> '["hero-report"]'::jsonb`
        )
      )
      .orderBy(desc(connectHubConnections.updatedAt));
      
    return { success: true, data: connections };
  } catch (error: any) {
    console.error('Error fetching input connections:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Lấy danh sách kết nối AI (chiasegpu, openai) hợp lệ
 */
export async function getAiConnectionsAction(teamId: number) {
  try {
    await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const connections = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.teamId, teamId),
          eq(connectHubConnections.status, 'connected'),
          inArray(connectHubConnections.appSlug, ['chiasegpu', 'openai'])
        )
      )
      .orderBy(desc(connectHubConnections.updatedAt));
      
    return { success: true, data: connections };
  } catch (error: any) {
    console.error('Error fetching AI connections:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Bật/tắt vai trò nguồn báo cáo cho một kết nối trong Connect Hub
 */
export async function toggleReportSourceAction(teamId: number, connectionId: number) {
  try {
    const { user } = await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager']);
    
    const [connection] = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.id, connectionId),
          eq(connectHubConnections.teamId, teamId)
        )
      )
      .limit(1);

    if (!connection) {
      return { success: false, error: 'Không tìm thấy kết nối' };
    }

    let modules = (connection.usedByModules as string[]) || [];
    if (!Array.isArray(modules)) {
      modules = [];
    }

    const hasHeroReport = modules.includes('hero-report');
    if (hasHeroReport) {
      modules = modules.filter((m) => m !== 'hero-report');
    } else {
      modules = [...modules, 'hero-report'];
    }

    const [updated] = await db
      .update(connectHubConnections)
      .set({
        usedByModules: modules,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(connectHubConnections.id, connectionId),
          eq(connectHubConnections.teamId, teamId)
        )
      )
      .returning();

    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã ${hasHeroReport ? 'tắt' : 'bật'} tính năng nguồn báo cáo cho kết nối: ${connection.connectionName}`
    });

    revalidatePath('/connect-hub/connections');
    revalidatePath('/hero-report/dashboard');
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error toggling report source:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Lấy danh sách kết nối Telegram đầu ra hợp lệ
 */
export async function getOutputConnectionsAction(teamId: number) {
  try {
    await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const connections = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.teamId, teamId),
          eq(connectHubConnections.status, 'connected'),
          eq(connectHubConnections.appSlug, 'telegram')
        )
      )
      .orderBy(desc(connectHubConnections.updatedAt));
      
    return { success: true, data: connections };
  } catch (error: any) {
    console.error('Error fetching output connections:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// Rate limit memory đơn giản: Map<teamId, timestamp>
const testRunRateLimits = new Map<number, number>();

/**
 * Chạy thử báo cáo trực tiếp với cấu hình chưa lưu (Gửi thử ngay)
 */
export async function testRunReportAction(
  teamId: number,
  data: CreateScheduleInput
) {
  try {
    await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    // Rate limit 30 giây cho mỗi team
    const now = Date.now();
    const lastRun = testRunRateLimits.get(teamId) || 0;
    if (now - lastRun < 30000) {
      return { success: false, error: 'Vui lòng đợi 30 giây giữa các lần chạy thử để tránh spam' };
    }
    testRunRateLimits.set(teamId, now);
    
    const res = await testExecuteReport(teamId, data);
    if (!res.success) {
      return { success: false, error: res.error || 'Lỗi khi gửi báo cáo thử nghiệm' };
    }
    
    return { 
      success: true, 
      message: 'Gửi thử báo cáo thành công!',
      data: {
        reportText: res.reportText
      }
    };
  } catch (error: any) {
    console.error('Error test running report:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Thực thi ngay một lịch báo cáo đã lưu (Chạy ngay)
 */
export async function triggerReportRunAction(
  teamId: number,
  scheduleId: number
) {
  try {
    await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const res = await executeReportTask(scheduleId);
    if (!res.success) {
      return { success: false, error: res.error || 'Thực thi báo cáo thất bại' };
    }
    
    return { success: true, message: 'Đã kích hoạt gửi báo cáo thành công!' };
  } catch (error: any) {
    console.error('Error triggering report run:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Xem trước dữ liệu gốc (Chỉ kéo data, không chạy AI, không gửi Telegram)
 */
export async function previewReportDataAction(
  teamId: number,
  data: any // using any for quick preview args (inputSources, reportSpec, name)
) {
  try {
    await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    // Import dynamically to avoid circular dependency if any, or just call buildReportContent
    const { buildReportContent } = await import('../hero-report/engine');

    const reportSpec = data.reportSpec || {};
    
    // Ensure skipAi is true for preview
    const scheduleData = {
      ...data,
      reportSpec: {
        ...reportSpec,
        skipAi: true
      }
    };

    // Gọi hàm buildReportContent để kéo dữ liệu và tổng hợp
    const reportData = await buildReportContent(
      teamId,
      scheduleData,
      true
    );

    return { 
      success: true, 
      data: {
        metricsJson: reportData.metricsJson,
        reportText: reportData.reportText 
      }
    };
  } catch (error: any) {
    console.error('Error previewing report data:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Test AI Commentary using the metrics fetched from preview.
 */
export async function testAiCommentaryAction(
  teamId: number,
  aiModel: string,
  customPrompt: string,
  metricsJson: any
) {
  try {
    await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    // Find AI connection
    const [aiConnection] = await db
      .select()
      .from(connectHubConnections)
      .where(and(
        eq(connectHubConnections.teamId, teamId),
        eq(connectHubConnections.status, 'connected'),
        inArray(connectHubConnections.appSlug, ['chiasegpu', 'openai'])
      ))
      .limit(1);

    if (!aiConnection) {
      return { success: false, error: 'Chưa cấu hình kết nối AI (ChiaSeGPU hoặc OpenAI) trong Connect Hub.' };
    }

    const { runConnectorAction } = await import('../connect-hub/connector-service');
    const { REPORT_SYSTEM_PROMPT, maskPII } = await import('../hero-report/engine');

    const safeMetricsJson = maskPII(metricsJson || {});
    const aiInput = {
      model: aiModel,
      messages: [
        { role: 'system', content: REPORT_SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: `Metrics JSON:\n${JSON.stringify(safeMetricsJson, null, 2)}\nYêu cầu thêm của chủ shop: ${customPrompt || 'Không có'}` 
        }
      ],
      temperature: 0.7
    };

    const aiRes = await runConnectorAction({
      teamId,
      connectionId: aiConnection.id,
      actionSlug: 'chat_completion',
      input: aiInput,
      callerModule: 'hero-report',
      isTest: true
    });

    if (aiRes && aiRes.success && aiRes.data) {
      const chatData = aiRes.data;
      const aiText = chatData.choices?.[0]?.message?.content?.trim() || '';
      return { success: true, data: { aiText } };
    } else {
      return { success: false, error: aiRes.error || 'Lỗi gọi AI từ Connect Hub' };
    }
  } catch (error: any) {
    console.error('Error testing AI commentary:', error);
    return { success: false, error: sanitizeError(error) };
  }
}
