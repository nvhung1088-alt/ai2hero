'use server';

import { db } from './drizzle';
import { socialFriends, users, socialProfiles, teamMembers } from './schema';
import { eq, and, or, notInArray } from 'drizzle-orm';
import { getUser } from './queries';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notification-actions';
import { getFriendIds } from './social-queries';

/**
 * Gửi lời mời kết bạn
 */
export async function sendFriendRequestAction(addresseeId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
    }

    if (currentUser.id === addresseeId) {
      return { error: 'Bạn không thể kết bạn với chính mình.' };
    }

    // Kiểm tra xem đã có quan hệ kết bạn / chặn nào chưa
    const existing = await db.query.socialFriends.findFirst({
      where: or(
        and(eq(socialFriends.requesterId, currentUser.id), eq(socialFriends.addresseeId, addresseeId)),
        and(eq(socialFriends.requesterId, addresseeId), eq(socialFriends.addresseeId, currentUser.id))
      )
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return { error: 'Hai bạn đã là bạn bè.' };
      }
      if (existing.status === 'blocked') {
        return { error: 'Mối quan hệ này đang bị chặn.' };
      }
      if (existing.status === 'pending') {
        if (existing.requesterId === currentUser.id) {
          return { error: 'Bạn đã gửi lời mời kết bạn rồi.' };
        } else {
          return { error: 'Người này đã gửi lời mời kết bạn cho bạn trước đó.' };
        }
      }
    }

    // Tạo bản ghi pending
    const [newRequest] = await db
      .insert(socialFriends)
      .values({
        requesterId: currentUser.id,
        addresseeId: addresseeId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Tạo notification
    await createNotification(
      addresseeId,
      currentUser.id,
      currentUser.name,
      currentUser.avatarUrl,
      'đã gửi cho bạn một lời mời kết bạn.',
      null
    );

    revalidatePath('/friends');
    return { data: newRequest };
  } catch (error: any) {
    console.error('Lỗi gửi lời mời kết bạn:', error);
    return { error: error.message || 'Lỗi hệ thống' };
  }
}

/**
 * Chấp nhận lời mời kết bạn
 */
export async function acceptFriendRequestAction(requesterId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) return { error: 'Vui lòng đăng nhập.' };

    const relation = await db.query.socialFriends.findFirst({
      where: and(
        eq(socialFriends.requesterId, requesterId),
        eq(socialFriends.addresseeId, currentUser.id),
        eq(socialFriends.status, 'pending')
      )
    });

    if (!relation) {
      return { error: 'Không tìm thấy lời mời kết bạn.' };
    }

    await db
      .update(socialFriends)
      .set({
        status: 'accepted',
        updatedAt: new Date()
      })
      .where(eq(socialFriends.id, relation.id));

    // Tạo notification cho người gửi
    await createNotification(
      requesterId,
      currentUser.id,
      currentUser.name,
      currentUser.avatarUrl,
      'đã chấp nhận lời mời kết bạn của bạn.',
      null
    );

    revalidatePath('/friends');
    return { success: true };
  } catch (error: any) {
    console.error('Lỗi đồng ý kết bạn:', error);
    return { error: error.message || 'Lỗi hệ thống' };
  }
}

/**
 * Từ chối lời mời kết bạn
 */
export async function rejectFriendRequestAction(requesterId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) return { error: 'Vui lòng đăng nhập.' };

    const relation = await db.query.socialFriends.findFirst({
      where: and(
        eq(socialFriends.requesterId, requesterId),
        eq(socialFriends.addresseeId, currentUser.id),
        eq(socialFriends.status, 'pending')
      )
    });

    if (!relation) {
      return { error: 'Không tìm thấy lời mời kết bạn.' };
    }

    await db.delete(socialFriends).where(eq(socialFriends.id, relation.id));

    revalidatePath('/friends');
    return { success: true };
  } catch (error: any) {
    console.error('Lỗi từ chối kết bạn:', error);
    return { error: error.message || 'Lỗi hệ thống' };
  }
}

/**
 * Hủy kết bạn
 */
export async function unfriendAction(friendId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) return { error: 'Vui lòng đăng nhập.' };

    await db.delete(socialFriends).where(
      or(
        and(eq(socialFriends.requesterId, currentUser.id), eq(socialFriends.addresseeId, friendId)),
        and(eq(socialFriends.requesterId, friendId), eq(socialFriends.addresseeId, currentUser.id))
      )
    );

    revalidatePath('/friends');
    return { success: true };
  } catch (error: any) {
    console.error('Lỗi hủy kết bạn:', error);
    return { error: error.message || 'Lỗi hệ thống' };
  }
}

/**
 * Gợi ý kết bạn
 */
export async function getSuggestionsAction() {
  try {
    const currentUser = await getUser();
    if (!currentUser) return { data: [] };

    // Lấy teamId của user
    const userTeamMember = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, currentUser.id)
    });

    if (!userTeamMember) return { data: [] };

    // Lấy danh sách bạn bè hiện tại để loại trừ
    const friendIds = await getFriendIds(currentUser.id);
    
    // Lấy tất cả mối quan hệ đang pending để loại trừ
    const pendingRelations = await db.query.socialFriends.findMany({
      where: and(
        or(
          eq(socialFriends.requesterId, currentUser.id),
          eq(socialFriends.addresseeId, currentUser.id)
        ),
        eq(socialFriends.status, 'pending')
      )
    });
    
    const pendingUserIds = pendingRelations.map(r => 
      r.requesterId === currentUser.id ? r.addresseeId : r.requesterId
    );

    const excludeIds = [currentUser.id, ...friendIds, ...pendingUserIds];

    // Lấy tất cả members trong cùng team
    const teamMates = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        bio: socialProfiles.bio
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .leftJoin(socialProfiles, eq(users.id, socialProfiles.userId))
      .where(
        and(
          eq(teamMembers.teamId, userTeamMember.teamId),
          excludeIds.length > 0 ? notInArray(users.id, excludeIds) : undefined
        )
      )
      .limit(10);

    return { data: teamMates };
  } catch (error: any) {
    console.error('Lỗi lấy gợi ý kết bạn:', error);
    return { data: [] };
  }
}