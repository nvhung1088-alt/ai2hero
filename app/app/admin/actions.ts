'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users, teams } from '@/lib/db/schema';
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
