'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users, teams, systemSettings } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { revalidatePath } from 'next/cache';

// Helper function to check if the current user is a super_admin
async function checkSuperAdmin() {
  const user = await getUser();
  if (!user || user.role !== 'super_admin') {
    throw new Error('Không có quyền truy cập. Yêu cầu quyền Super Admin.');
  }
  return user;
}

export async function toggleUserRoleAction(userId: number) {
  try {
    const adminUser = await checkSuperAdmin();
    
    // Ngăn chặn tự thay đổi vai trò của chính mình
    if (adminUser.id === userId) {
      return { error: 'Bạn không thể tự thay đổi vai trò của chính mình.' };
    }

    // Lấy user mục tiêu
    const targetUserRes = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (targetUserRes.length === 0) {
      return { error: 'Không tìm thấy người dùng.' };
    }

    const targetUser = targetUserRes[0];
    const newRole = targetUser.role === 'super_admin' ? 'member' : 'super_admin';

    await db
      .update(users)
      .set({
        role: newRole,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    revalidatePath('/admin/users');
    return { success: true, message: `Đã thay đổi vai trò của ${targetUser.email} thành ${newRole}.` };
  } catch (error: any) {
    return { error: error.message || 'Lỗi hệ thống khi cập nhật vai trò.' };
  }
}

export async function toggleUserStatusAction(userId: number) {
  try {
    const adminUser = await checkSuperAdmin();
    
    // Ngăn chặn tự khóa chính mình
    if (adminUser.id === userId) {
      return { error: 'Bạn không thể tự khóa tài khoản của chính mình.' };
    }

    // Lấy user mục tiêu
    const targetUserRes = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (targetUserRes.length === 0) {
      return { error: 'Không tìm thấy người dùng.' };
    }

    const targetUser = targetUserRes[0];
    const isSuspended = !!targetUser.deletedAt;
    const newDeletedAt = isSuspended ? null : new Date();

    await db
      .update(users)
      .set({
        deletedAt: newDeletedAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    revalidatePath('/admin/users');
    return {
      success: true,
      message: isSuspended
        ? `Đã mở khóa tài khoản cho ${targetUser.email}.`
        : `Đã khóa tài khoản của ${targetUser.email}.`
    };
  } catch (error: any) {
    return { error: error.message || 'Lỗi hệ thống khi cập nhật trạng thái tài khoản.' };
  }
}

export async function changeTeamPlanAction(teamId: number, planName: string) {
  try {
    await checkSuperAdmin();

    const allowedPlans = ['free', 'pro', 'enterprise'];
    const normalizedPlan = planName.toLowerCase();
    
    if (!allowedPlans.includes(normalizedPlan)) {
      return { error: 'Gói dịch vụ không hợp lệ.' };
    }

    const teamRes = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (teamRes.length === 0) {
      return { error: 'Không tìm thấy tổ chức.' };
    }

    await db
      .update(teams)
      .set({
        planName: normalizedPlan,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));

    revalidatePath('/admin/teams');
    return { success: true, message: `Đã nâng cấp/đổi gói của tổ chức sang ${planName.toUpperCase()} thành công.` };
  } catch (error: any) {
    return { error: error.message || 'Lỗi hệ thống khi thay đổi gói cước.' };
  }
}

export async function toggleTeamStatusAction(teamId: number) {
  try {
    await checkSuperAdmin();

    const teamRes = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (teamRes.length === 0) {
      return { error: 'Không tìm thấy tổ chức.' };
    }

    const team = teamRes[0];
    const isSuspended = !!team.deletedAt;
    const newDeletedAt = isSuspended ? null : new Date();

    await db
      .update(teams)
      .set({
        deletedAt: newDeletedAt,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));

    revalidatePath('/admin/teams');
    return {
      success: true,
      message: isSuspended
        ? `Đã kích hoạt lại tổ chức ${team.name}.`
        : `Đã tạm khóa tổ chức ${team.name}.`
    };
  } catch (error: any) {
    return { error: error.message || 'Lỗi hệ thống khi cập nhật trạng thái tổ chức.' };
  }
}

import { systemAnnouncements } from '@/lib/db/schema';

export async function createAnnouncementAction(title: string, content: string, version: string, severity: string) {
  try {
    const adminUser = await checkSuperAdmin();

    if (!title || !content || !version) {
      return { error: 'Vui lòng nhập đầy đủ Tiêu đề, Nội dung và Phiên bản.' };
    }

    await db.insert(systemAnnouncements).values({
      title,
      content,
      version,
      severity: severity || 'info',
      createdBy: adminUser.id,
      createdAt: new Date(),
    });

    revalidatePath('/admin/announcements');
    return { success: true, message: 'Đã phát hành bản cập nhật hệ thống thành công!' };
  } catch (error: any) {
    return { error: error.message || 'Lỗi hệ thống khi tạo thông báo cập nhật.' };
  }
}

export async function deleteAnnouncementAction(id: number) {
  try {
    await checkSuperAdmin();

    await db.delete(systemAnnouncements).where(eq(systemAnnouncements.id, id));

    revalidatePath('/admin/announcements');
    return { success: true, message: 'Đã xóa bản cập nhật hệ thống thành công!' };
  } catch (error: any) {
    return { error: error.message || 'Lỗi hệ thống khi xóa bản cập nhật.' };
  }
}

export interface TrafficConfig {
  mode: 'normal' | 'eco' | 'emergency';
  pollIntervalMs: number;
  idleTimeoutMinutes: number;
  maxBackoffMinutes: number;
  pauseOnBackground: boolean;
  updatedAt?: string;
}

export async function getGlobalPollingModeAction(): Promise<TrafficConfig> {
  try {
    const settingRes = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'global_polling_mode'))
      .limit(1);

    if (settingRes.length > 0 && settingRes[0].value) {
      const val = settingRes[0].value as any;
      const mode = (val?.mode as 'normal' | 'eco' | 'emergency') || 'normal';
      const pollIntervalMs = val?.pollIntervalMs || (mode === 'emergency' ? 60000 : mode === 'eco' ? 30000 : 15000);
      const idleTimeoutMinutes = typeof val?.idleTimeoutMinutes === 'number' ? val.idleTimeoutMinutes : 15;
      const maxBackoffMinutes = typeof val?.maxBackoffMinutes === 'number' ? val.maxBackoffMinutes : 5;
      const pauseOnBackground = typeof val?.pauseOnBackground === 'boolean' ? val.pauseOnBackground : true;

      return {
        mode,
        pollIntervalMs,
        idleTimeoutMinutes,
        maxBackoffMinutes,
        pauseOnBackground,
        updatedAt: val?.updatedAt || settingRes[0].updatedAt?.toISOString(),
      };
    }
  } catch (error) {
    console.error('Error fetching global_polling_mode:', error);
  }
  return {
    mode: 'normal',
    pollIntervalMs: 15000,
    idleTimeoutMinutes: 15,
    maxBackoffMinutes: 5,
    pauseOnBackground: true,
  };
}

export async function setGlobalPollingModeAction(config: Partial<TrafficConfig>) {
  try {
    await checkSuperAdmin();

    const current = await getGlobalPollingModeAction();
    const mode = config.mode || current.mode;
    const pollIntervalMs = config.pollIntervalMs || (mode === 'emergency' ? 60000 : mode === 'eco' ? 30000 : 15000);
    const idleTimeoutMinutes = config.idleTimeoutMinutes ?? current.idleTimeoutMinutes;
    const maxBackoffMinutes = config.maxBackoffMinutes ?? current.maxBackoffMinutes;
    const pauseOnBackground = config.pauseOnBackground ?? current.pauseOnBackground;

    const newValue: TrafficConfig = {
      mode,
      pollIntervalMs,
      idleTimeoutMinutes,
      maxBackoffMinutes,
      pauseOnBackground,
      updatedAt: new Date().toISOString(),
    };

    await db
      .insert(systemSettings)
      .values({
        key: 'global_polling_mode',
        value: newValue,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: newValue,
          updatedAt: new Date(),
        },
      });

    revalidatePath('/admin/traffic');
    return { success: true, config: newValue, message: `Đã cập nhật cấu hình Traffic Management thành công!` };
  } catch (error: any) {
    return { error: error.message || 'Lỗi khi cập nhật cấu hình Traffic.' };
  }
}

