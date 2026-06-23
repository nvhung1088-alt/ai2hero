'use server';

import { db } from './drizzle';
import { socialReports, feedPosts, feedComments, users } from './schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUser } from './queries';

export async function getAdminSocialReportsAction(status: 'pending' | 'resolved' | 'dismissed' = 'pending') {
  try {
    const currentUser = await getUser();
    if (!currentUser || currentUser.role !== 'owner') { // Giả sử owner hoặc admin
      throw new Error('Quyền truy cập bị từ chối');
    }

    const reports = await db
      .select({
        id: socialReports.id,
        reason: socialReports.reason,
        description: socialReports.description,
        status: socialReports.status,
        createdAt: socialReports.createdAt,
        reporterName: users.name,
        reporterEmail: users.email,
        postId: socialReports.postId,
        commentId: socialReports.commentId,
      })
      .from(socialReports)
      .leftJoin(users, eq(socialReports.reporterId, users.id))
      .where(eq(socialReports.status, status))
      .orderBy(desc(socialReports.createdAt));

    return { data: reports };
  } catch (error: any) {
    console.error('Lỗi lấy danh sách báo cáo:', error);
    return { error: 'Không thể tải danh sách báo cáo' };
  }
}

export async function resolveAdminReportAction(reportId: number, action: 'dismiss' | 'delete_post' | 'delete_comment') {
  try {
    const currentUser = await getUser();
    if (!currentUser || currentUser.role !== 'owner') {
      throw new Error('Quyền truy cập bị từ chối');
    }

    const report = await db.query.socialReports.findFirst({
      where: eq(socialReports.id, reportId)
    });

    if (!report) {
      return { error: 'Không tìm thấy báo cáo' };
    }

    // Xử lý action
    if (action === 'delete_post' && report.postId) {
      await db.delete(feedPosts).where(eq(feedPosts.id, report.postId));
      // Cập nhật tất cả báo cáo liên quan đến bài viết này
      await db
        .update(socialReports)
        .set({ status: 'resolved' })
        .where(eq(socialReports.postId, report.postId));
    } else if (action === 'delete_comment' && report.commentId) {
      await db.delete(feedComments).where(eq(feedComments.id, report.commentId));
      // Cập nhật tất cả báo cáo liên quan đến bình luận này
      await db
        .update(socialReports)
        .set({ status: 'resolved' })
        .where(eq(socialReports.commentId, report.commentId));
    } else if (action === 'dismiss') {
      // Chỉ bỏ qua báo cáo hiện tại
      await db
        .update(socialReports)
        .set({ status: 'dismissed' })
        .where(eq(socialReports.id, reportId));
    }

    revalidatePath('/admin/social-reports');
    return { success: true };
  } catch (error: any) {
    console.error('Lỗi khi giải quyết báo cáo:', error);
    return { error: error.message || 'Không thể thực hiện thao tác' };
  }
}