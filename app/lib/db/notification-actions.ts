'use server';

import { eq, and, notInArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { notifications, userAnnouncementReads, systemAnnouncements } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { revalidatePath } from 'next/cache';

/**
 * Hàm Server-Side để tự động tạo thông báo (Bell) khi có sự kiện
 */
export async function createNotification(
  userId: number,
  fromUserId: number | null,
  fromUserName: string | null,
  fromUserAvatar: string | null,
  message: string,
  postId: number | null
) {
  try {
    // Không tự gửi thông báo cho chính mình
    if (fromUserId === userId) return { success: true };

    await db.insert(notifications).values({
      userId,
      fromUserId,
      fromUserName: fromUserName || 'Hệ thống',
      fromUserAvatar: fromUserAvatar || '👤',
      message,
      postId,
      read: 0,
      createdAt: new Date(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Lỗi khi tạo thông báo:', error);
    return { error: error.message || 'Lỗi khi tạo thông báo.' };
  }
}

/**
 * Đánh dấu một thông báo Bell cụ thể là đã đọc
 */
export async function markNotificationAsReadAction(id: number) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Chưa đăng nhập' };

    await db
      .update(notifications)
      .set({ read: 1 })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Lỗi khi cập nhật thông báo.' };
  }
}

/**
 * Đánh dấu tất cả thông báo Bell của user hiện tại là đã đọc
 */
export async function markAllNotificationsAsReadAction() {
  try {
    const user = await getUser();
    if (!user) return { error: 'Chưa đăng nhập' };

    await db
      .update(notifications)
      .set({ read: 1 })
      .where(eq(notifications.userId, user.id));

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Lỗi khi cập nhật tất cả thông báo.' };
  }
}

/**
 * Đăng ký tất cả các tin Loa phát thanh chưa đọc vào bảng user_announcement_reads để tắt chấm cam
 */
export async function markAnnouncementsAsReadAction() {
  try {
    const user = await getUser();
    if (!user) return { error: 'Chưa đăng nhập' };

    // Lấy danh sách ID các thông báo hệ thống hiện có
    const allAnnouncements = await db.select({ id: systemAnnouncements.id }).from(systemAnnouncements);
    if (allAnnouncements.length === 0) return { success: true };

    // Lấy danh sách ID các thông báo đã đọc
    const readAnnouncements = await db
      .select({ announcementId: userAnnouncementReads.announcementId })
      .from(userAnnouncementReads)
      .where(eq(userAnnouncementReads.userId, user.id));

    const readIds = readAnnouncements.map(r => r.announcementId);

    // Lọc các thông báo chưa đọc
    const unreadAnnouncements = allAnnouncements.filter(a => !readIds.includes(a.id));

    if (unreadAnnouncements.length > 0) {
      // Insert bulk các thông cáo chưa đọc vào bảng reads
      const insertValues = unreadAnnouncements.map(a => ({
        userId: user.id,
        announcementId: a.id,
        readAt: new Date(),
      }));

      await db.insert(userAnnouncementReads).values(insertValues);
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Lỗi khi cập nhật trạng thái đọc loa phát thanh.' };
  }
}

/**
 * Đánh dấu một tin Loa phát thanh cụ thể là đã đọc
 */
export async function markSingleAnnouncementAsReadAction(announcementId: number) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Chưa đăng nhập' };

    // Kiểm tra xem đã đọc chưa để tránh duplicate key
    const existing = await db
      .select()
      .from(userAnnouncementReads)
      .where(
        and(
          eq(userAnnouncementReads.userId, user.id),
          eq(userAnnouncementReads.announcementId, announcementId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(userAnnouncementReads).values({
        userId: user.id,
        announcementId,
        readAt: new Date()
      });
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Lỗi khi cập nhật trạng thái đọc tin thông cáo.' };
  }
}
