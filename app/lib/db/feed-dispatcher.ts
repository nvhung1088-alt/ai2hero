'use server';

import { db } from './drizzle';
import { feedPosts, teamMembers, users } from './schema';
import { eq, and } from 'drizzle-orm';
import { createNotification } from './notification-actions';

export interface DispatchFeedParams {
  teamId: number;
  userId: number;
  type: 'mvp_result' | 'system_activity' | 'marketplace_product' | 'heroweb_publish' | 'film_publish';
  appId: string;
  message: string;
  resultPreview?: string;
  resultMetrics?: { label: string; value: string }[];
  mentions?: string[];
  attachments?: { type: 'image' | 'video' | 'file'; url: string; fileName?: string; caption?: string }[];
  pageId?: number;
  groupId?: number;
  visibility?: 'public' | 'private' | 'team';
}

/**
 * Cổng kết nối MVP duy nhất.
 * Mọi MVP (SIM, AI Chat, API Hub...) BẮT BUỘC gọi hàm này để đẩy bài viết lên Social Feed.
 * Hàm này tự động:
 * 1. Validate & chuẩn hóa dữ liệu JSONB an toàn.
 * 2. Chèn vào bảng feed_posts.
 * 3. Gửi notification cho toàn bộ thành viên trong workspace.
 */
export async function dispatchMvpFeedPost(params: DispatchFeedParams) {
  const {
    teamId,
    userId,
    type,
    appId,
    message,
    resultPreview,
    resultMetrics,
    mentions,
    attachments,
    pageId,
    groupId,
    visibility
  } = params;

  // 1. Validate dữ liệu cơ bản
  if (!teamId && !pageId && !groupId) {
    return { success: false, error: 'Thiếu định danh nơi đăng (teamId, pageId hoặc groupId).' };
  }
  if (!userId) {
    return { success: false, error: 'Thiếu userId bắt buộc.' };
  }

  // 1b. Verify user thuộc workspace (Tenant Isolation) nếu đăng vào team
  if (teamId) {
    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .limit(1);
    if (!membership && !pageId) {
      return { success: false, error: 'Người dùng không thuộc không gian làm việc này.' };
    }
  }

  if (!message || !message.trim()) {
    return { success: false, error: 'Nội dung thông báo (message) không được để trống.' };
  }

  // 2. Chuẩn hóa JSONB an toàn (Drizzle PostgreSQL yêu cầu object chuẩn, tránh null/undefined)
  const safeMentions = Array.isArray(mentions) ? mentions : [];
  const safeAttachments = Array.isArray(attachments) ? attachments : [];
  const safeMetrics = Array.isArray(resultMetrics) ? resultMetrics : [];

  try {
    // Lấy thông tin user gửi tin để lấy tên
    const [userRecord] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const displayName = userRecord ? (userRecord.name || userRecord.email) : 'Hệ thống';

    // 3. Chèn tự động vào Postgres qua Drizzle
    const [newPost] = await db
      .insert(feedPosts)
      .values({
        teamId: teamId || null,
        userId,
        type: type || 'mvp_result',
        message: message.trim(),
        likes: 0,
        mentions: safeMentions,
        attachments: safeAttachments,
        appId: appId || 'system',
        resultPreview: resultPreview || null,
        resultMetrics: safeMetrics,
        pinned: 0,
        pageId: pageId || null,
        groupId: groupId || null,
        visibility: visibility || 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    if (!newPost) {
      return { success: false, error: 'Không thể chèn bài viết vào cơ sở dữ liệu feed_posts.' };
    }

    // 4. Trigger notifications cho tất cả thành viên trong nhóm (trừ chính userId) nếu là post team
    if (teamId) {
      const workspaceMembers = await db
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));

      for (const member of workspaceMembers) {
        if (member.userId !== userId) {
          // Gửi thông báo Bell thời gian thực
          await createNotification(
            member.userId,
            userId,
            displayName,
            displayName.charAt(0).toUpperCase(),
            `🤖 Cập nhật mới từ MVP [${appId}]: "${message.slice(0, 40)}${message.length > 40 ? '...' : ''}"`,
            newPost.id
          );
        }
      }
    }

    return { success: true, postId: newPost.id };
  } catch (error: any) {
    console.error('[FeedDispatcher] Lỗi hệ thống khi đẩy bài viết:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống khi phân phối hoạt động MVP.' };
  }
}
