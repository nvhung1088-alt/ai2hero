'use server';

import { db } from './drizzle';
import { simBackupConfigs, teamMembers, activityLogs } from './schema';
import { eq, and } from 'drizzle-orm';
import { getUser } from './queries';
import { executeBackupForTeam } from './sim-backup';
import { revalidatePath } from 'next/cache';

// Helper xác thực quyền Owner nghiêm ngặt cho sao lưu dữ liệu
async function verifyOwnerAccess(targetTeamId: number) {
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

  if (member[0].role !== 'owner') {
    throw new Error('Chỉ có Chủ sở hữu (Owner) mới có quyền thao tác cấu hình sao lưu dữ liệu');
  }

  return { user, member: member[0] };
}

// Lấy cấu hình backup của team
export async function getBackupConfig(teamId: number) {
  try {
    await verifyOwnerAccess(teamId);

    const [config] = await db
      .select()
      .from(simBackupConfigs)
      .where(eq(simBackupConfigs.teamId, teamId))
      .limit(1);

    return { success: true, data: config || null };
  } catch (error: any) {
    console.error('Error fetching backup config:', error);
    return { success: false, error: error.message || 'Lỗi lấy cấu hình sao lưu' };
  }
}

// Lưu cấu hình backup
export async function saveBackupConfigAction(teamId: number, email: string, frequency: 'weekly' | 'monthly' | 'off') {
  try {
    const { user } = await verifyOwnerAccess(teamId);

    if (!email || !email.includes('@')) {
      return { success: false, error: 'Email không hợp lệ' };
    }

    const [existing] = await db
      .select()
      .from(simBackupConfigs)
      .where(eq(simBackupConfigs.teamId, teamId))
      .limit(1);

    let result;
    if (existing) {
      // Update
      [result] = await db
        .update(simBackupConfigs)
        .set({
          backupEmail: email,
          frequency,
          updatedAt: new Date()
        })
        .where(eq(simBackupConfigs.id, existing.id))
        .returning();
    } else {
      // Insert
      [result] = await db
        .insert(simBackupConfigs)
        .values({
          teamId,
          backupEmail: email,
          frequency,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
    }

    // Ghi Log hoạt động
    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã cập nhật cấu hình sao lưu tự động (Tần suất: ${frequency === 'weekly' ? 'Hàng tuần' : frequency === 'monthly' ? 'Hàng tháng' : 'Tắt'}, Email: ${email})`
    });

    revalidatePath('/sim/settings');
    revalidatePath(`/sim/t/${teamId}/settings`, 'layout');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error saving backup config:', error);
    return { success: false, error: error.message || 'Lỗi lưu cấu hình sao lưu' };
  }
}

// Chạy backup thủ công ngay lập tức
export async function triggerManualBackupAction(teamId: number) {
  try {
    const { user } = await verifyOwnerAccess(teamId);

    // Lấy cấu hình email backup đã thiết lập
    const [config] = await db
      .select()
      .from(simBackupConfigs)
      .where(eq(simBackupConfigs.teamId, teamId))
      .limit(1);

    if (!config || !config.backupEmail) {
      return { success: false, error: 'Vui lòng thiết lập và lưu Email nhận sao lưu trước khi kích hoạt gửi.' };
    }

    // Thực hiện backup và gửi mail thật qua Resend
    await executeBackupForTeam(teamId, config.backupEmail);

    // Cập nhật thời gian gửi cuối cùng
    await db
      .update(simBackupConfigs)
      .set({
        lastSentAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(simBackupConfigs.id, config.id));

    // Ghi Log hoạt động
    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã kích hoạt sao lưu dữ liệu thủ công gửi về email: ${config.backupEmail}`
    });

    revalidatePath('/sim/settings');
    revalidatePath(`/sim/t/${teamId}/settings`, 'layout');
    return { success: true, message: 'Đã gửi file sao lưu dữ liệu SIM & Tài khoản về email của bạn thành công!' };
  } catch (error: any) {
    console.error('Error triggering manual backup:', error);
    return { success: false, error: error.message || 'Lỗi thực thi sao lưu dữ liệu' };
  }
}
