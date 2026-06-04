'use server';

import { and, eq, desc, inArray } from 'drizzle-orm';
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

/**
 * Kiểu dữ liệu đầu vào khi tạo hoặc cập nhật lịch báo cáo
 */
export interface CreateScheduleInput {
  name: string;
  inputConnectionId: number;
  inputProvider: string;
  reportSpec: Record<string, any>;
  outputType: string;
  outputConnectionId: number;
  outputConfig: Record<string, any>;
  scheduleType: 'manual' | 'daily' | 'hourly' | 'weekly';
  cronExpression?: string;
  timezone?: string;
}

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
      .where(eq(heroReportSchedules.teamId, teamId))
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
    
    let nextRunAt: Date | null = null;
    if (data.scheduleType !== 'manual' && data.cronExpression) {
      nextRunAt = await getNextCronOccurrence(data.cronExpression, data.timezone);
    }
    
    const [inserted] = await db
      .insert(heroReportSchedules)
      .values({
        teamId,
        userId: user.id,
        name: data.name,
        status: 'active',
        inputConnectionId: data.inputConnectionId,
        inputProvider: data.inputProvider,
        reportSpec: data.reportSpec,
        outputType: data.outputType || 'telegram',
        outputConnectionId: data.outputConnectionId,
        outputConfig: data.outputConfig || {},
        scheduleType: data.scheduleType,
        cronExpression: data.cronExpression || null,
        timezone: data.timezone || 'Asia/Ho_Chi_Minh',
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
    const scheduleType = data.scheduleType ?? existing.scheduleType;
    const cronExpression = data.cronExpression ?? existing.cronExpression;
    const timezone = data.timezone ?? existing.timezone ?? 'Asia/Ho_Chi_Minh';
    
    if (scheduleType === 'manual') {
      nextRunAt = null;
    } else if (cronExpression) {
      nextRunAt = await getNextCronOccurrence(cronExpression, timezone);
    }
    
    const [updated] = await db
      .update(heroReportSchedules)
      .set({
        name: data.name ?? existing.name,
        inputConnectionId: data.inputConnectionId ?? existing.inputConnectionId,
        inputProvider: data.inputProvider ?? existing.inputProvider,
        reportSpec: data.reportSpec ?? existing.reportSpec,
        outputType: data.outputType ?? existing.outputType,
        outputConnectionId: data.outputConnectionId ?? existing.outputConnectionId,
        outputConfig: data.outputConfig ?? existing.outputConfig,
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
 * Xóa một cấu hình lịch báo cáo tự động (cascade tự xóa Runs tương ứng)
 */
export async function deleteReportScheduleAction(teamId: number, scheduleId: number) {
  try {
    const { user } = await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager']);
    
    const [deleted] = await db
      .delete(heroReportSchedules)
      .where(
        and(
          eq(heroReportSchedules.id, scheduleId),
          eq(heroReportSchedules.teamId, teamId)
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
 * Lấy danh sách kết nối POS (Pancake, KiotViet) hợp lệ
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
          inArray(connectHubConnections.appSlug, ['pancake-pos', 'kiotviet'])
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

/**
 * Chạy thử báo cáo trực tiếp với cấu hình chưa lưu (Gửi thử ngay)
 */
export async function testRunReportAction(
  teamId: number,
  data: CreateScheduleInput
) {
  try {
    await verifyHeroReportAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
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
