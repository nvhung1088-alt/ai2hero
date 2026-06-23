'use server';

import { db } from './drizzle';
import { socialProfiles, users, feedComments, feedPosts } from './schema';
import { eq, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUser } from './queries';
import { getSocialProfile } from './social-queries';

/**
 * Cập nhật thông tin chi tiết của Social Profile.
 */
export async function updateSocialProfileAction(data: {
  name?: string;
  bio?: string;
  location?: string;
  birthday?: string;
  website?: string;
  relationship?: string;
  visibility?: string;
}) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
    }

    // Đảm bảo profile đã tồn tại trước khi update
    await getSocialProfile(user.id);

    // Cập nhật tên nếu có
    if (data.name !== undefined && data.name.trim() !== '') {
      await db
        .update(users)
        .set({ name: data.name.trim() })
        .where(eq(users.id, user.id));
    }

    // Cập nhật profile
    await db
      .update(socialProfiles)
      .set({
        bio: data.bio !== undefined ? data.bio : undefined,
        location: data.location !== undefined ? data.location : undefined,
        birthday: data.birthday !== undefined ? data.birthday : undefined,
        website: data.website !== undefined ? data.website : undefined,
        relationship: data.relationship !== undefined ? data.relationship : undefined,
        visibility: data.visibility !== undefined ? data.visibility : undefined,
        updatedAt: new Date()
      })
      .where(eq(socialProfiles.userId, user.id));

    revalidatePath(`/profile/${user.id}`);
    revalidatePath('/');
    return { success: 'Cập nhật hồ sơ thành công!' };
  } catch (error: any) {
    console.error('Lỗi khi cập nhật social profile:', error);
    return { error: 'Đã xảy ra lỗi hệ thống khi cập nhật hồ sơ.' };
  }
}

/**
 * Cập nhật ảnh đại diện (avatarUrl) của User.
 */
export async function updateAvatarAction(url: string) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
    }

    await db
      .update(users)
      .set({
        avatarUrl: url
      })
      .where(eq(users.id, user.id));

    revalidatePath(`/profile/${user.id}`);
    revalidatePath('/');
    return { success: 'Cập nhật ảnh đại diện thành công!' };
  } catch (error: any) {
    console.error('Lỗi khi cập nhật avatar:', error);
    return { error: 'Đã xảy ra lỗi hệ thống.' };
  }
}

/**
 * Cập nhật ảnh bìa (coverUrl) của User.
 */
export async function updateCoverAction(url: string) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
    }

    await getSocialProfile(user.id);

    await db
      .update(socialProfiles)
      .set({
        coverUrl: url,
        updatedAt: new Date()
      })
      .where(eq(socialProfiles.userId, user.id));

    revalidatePath(`/profile/${user.id}`);
    revalidatePath('/');
    return { success: 'Cập nhật ảnh bìa thành công!' };
  } catch (error: any) {
    console.error('Lỗi khi cập nhật cover:', error);
    return { error: 'Đã xảy ra lỗi hệ thống.' };
  }
}

/**
 * Ping heartbeat để cập nhật thời gian hoạt động của người dùng (Active Status).
 */
export async function pingHeartbeatAction() {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Quyền truy cập bị từ chối.' };
    }

    await db
      .update(socialProfiles)
      .set({
        lastActiveAt: new Date()
      })
      .where(eq(socialProfiles.userId, user.id));

    return { success: true };
  } catch (error: any) {
    console.error('Lỗi ping heartbeat:', error);
    return { error: 'Lỗi hệ thống.' };
  }
}

/**
 * Lấy danh sách bình luận của bài viết Feed
 */
export async function getFeedCommentsAction(postId: number) {
  try {
    const comments = await db.query.feedComments.findMany({
      where: eq(feedComments.postId, postId),
      with: {
        user: {
          columns: { id: true, name: true, avatarUrl: true, role: true }
        }
      },
      orderBy: [desc(feedComments.createdAt)]
    });

    return { success: true, comments };
  } catch (error: any) {
    console.error('Lỗi lấy bình luận:', error);
    return { success: false, error: 'Lỗi hệ thống' };
  }
}

/**
 * Thêm bình luận vào bài viết Feed
 */
export async function addFeedCommentAction(data: { postId: number, content: string }) {
  try {
    const user = await getUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    if (!data.content || data.content.trim() === '') {
      return { success: false, error: 'Nội dung không hợp lệ' };
    }

    const post = await db.query.feedPosts.findFirst({
      where: eq(feedPosts.id, data.postId)
    });
    if (!post) return { success: false, error: 'Bài viết không tồn tại' };

    const [newComment] = await db.insert(feedComments).values({
      postId: data.postId,
      userId: user.id,
      userName: user.name || 'Anonymous',
      content: data.content.trim(),
    }).returning();

    // Lấy lại comment với user info để trả về UI
    const commentWithUser = await db.query.feedComments.findFirst({
      where: eq(feedComments.id, newComment.id),
      with: {
        user: {
          columns: { id: true, name: true, avatarUrl: true, role: true }
        }
      }
    });

    revalidatePath(`/p/${data.postId}`);
    return { success: true, comment: commentWithUser };
  } catch (error: any) {
    console.error('Lỗi đăng bình luận:', error);
    return { success: false, error: 'Lỗi hệ thống' };
  }
}
