'use server'

import { db } from './drizzle';
import { socialGroups, socialGroupMembers, feedPosts } from './schema';
import { getUser } from './queries';
import { and, eq, desc, notInArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createGroup(data: { name: string, description?: string, privacy: string, coverUrl?: string }) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  const [newGroup] = await db.insert(socialGroups).values({
    name: data.name,
    description: data.description || '',
    privacy: data.privacy || 'public',
    coverUrl: data.coverUrl || '',
    createdBy: user.id,
    memberCount: 1, // the creator is the first member
  }).returning();

  if (newGroup) {
    await db.insert(socialGroupMembers).values({
      groupId: newGroup.id,
      userId: user.id,
      role: 'admin',
    });
  }

  revalidatePath('/groups');
  return newGroup;
}

export async function updateGroup(groupId: number, data: { name?: string, description?: string, privacy?: string, coverUrl?: string, requireJoinApproval?: boolean, requirePostApproval?: boolean }) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  const member = await db.query.socialGroupMembers.findFirst({
    where: and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.userId, user.id))
  });

  if (!member || member.role !== 'admin') {
    throw new Error('Forbidden: Only admin can update the group');
  }

  const [updated] = await db.update(socialGroups)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(socialGroups.id, groupId))
    .returning();

  revalidatePath(`/groups/${groupId}`);
  revalidatePath('/groups');
  return updated;
}

export async function deleteGroup(groupId: number) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  const member = await db.query.socialGroupMembers.findFirst({
    where: and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.userId, user.id))
  });

  if (!member || member.role !== 'admin') {
    throw new Error('Forbidden: Only admin can delete the group');
  }

  await db.delete(socialGroups).where(eq(socialGroups.id, groupId));
  
  revalidatePath('/groups');
  return { success: true };
}

export async function joinGroupAction(groupId: number) {
  try {
    const user = await getUser();
    if (!user) throw new Error('Unauthorized');

    // Kiểm tra đã là thành viên chưa
    const existing = await db.query.socialGroupMembers.findFirst({
      where: and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.userId, user.id))
    });

    if (existing) {
      return { error: 'Bạn đã tham gia nhóm này rồi' };
    }

    const group = await db.query.socialGroups.findFirst({
      where: eq(socialGroups.id, groupId)
    });

    if (!group) {
      return { error: 'Nhóm không tồn tại' };
    }

    const status = group.requireJoinApproval ? 'pending' : 'approved';

    await db.insert(socialGroupMembers).values({
      groupId,
      userId: user.id,
      role: 'member',
      status
    });

    if (status === 'approved') {
      // Cập nhật member count
      await db.update(socialGroups)
        .set({
          memberCount: sql`${socialGroups.memberCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(socialGroups.id, groupId));
    }

    revalidatePath(`/groups/${groupId}`);
    revalidatePath('/groups');
    return { success: true };
  } catch (error: any) {
    console.error('Lỗi khi tham gia nhóm:', error);
    return { error: error.message || 'Lỗi hệ thống' };
  }
}

export async function leaveGroupAction(groupId: number) {
  try {
    const user = await getUser();
    if (!user) throw new Error('Unauthorized');

    const existing = await db.query.socialGroupMembers.findFirst({
      where: and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.userId, user.id))
    });

    if (!existing) {
      return { error: 'Bạn không phải thành viên nhóm này' };
    }

    if (existing.role === 'admin') {
      const admins = await db.query.socialGroupMembers.findMany({
        where: and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.role, 'admin'))
      });
      if (admins.length === 1) {
        return { error: 'Bạn là Admin duy nhất của nhóm. Hãy chỉ định Admin khác trước khi rời nhóm.' };
      }
    }

    await db.delete(socialGroupMembers).where(
      and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.userId, user.id))
    );

    // Cập nhật member count
    await db.update(socialGroups)
      .set({
        memberCount: sql`${socialGroups.memberCount} - 1`,
        updatedAt: new Date()
      })
      .where(eq(socialGroups.id, groupId));

    revalidatePath(`/groups/${groupId}`);
    revalidatePath('/groups');
    return { success: true };
  } catch (error: any) {
    console.error('Lỗi khi rời nhóm:', error);
    return { error: error.message || 'Lỗi hệ thống' };
  }
}

export async function setGroupMemberRole(groupId: number, userId: number, role: 'admin' | 'moderator' | 'member') {
  try {
    const user = await getUser();
    if (!user) throw new Error('Unauthorized');

    const myMembership = await db.query.socialGroupMembers.findFirst({
      where: and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.userId, user.id))
    });

    if (!myMembership || myMembership.role !== 'admin') {
      throw new Error('Forbidden: Only admin can change roles');
    }

    await db.update(socialGroupMembers)
      .set({ role })
      .where(and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.userId, userId)));

    revalidatePath(`/groups/${groupId}/admin`);
    revalidatePath(`/groups/${groupId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Lỗi thay đổi quyền:', error);
    return { error: error.message || 'Lỗi hệ thống' };
  }
}

/**
 * Lấy danh sách các nhóm mà user đã tham gia
 */
export async function getMyGroups(userId: number) {
  try {
    const memberships = await db.query.socialGroupMembers.findMany({
      where: eq(socialGroupMembers.userId, userId),
      with: {
        group: true
      }
    });
    return memberships.map(m => m.group).filter(Boolean);
  } catch (error) {
    console.error('Lỗi lấy danh sách nhóm của tôi:', error);
    return [];
  }
}

/**
 * Lấy danh sách nhóm chưa tham gia để gợi ý khám phá
 */
export async function discoverGroups(userId: number) {
  try {
    const memberships = await db.query.socialGroupMembers.findMany({
      where: eq(socialGroupMembers.userId, userId)
    });
    const myGroupIds = memberships.map(m => m.groupId);

    if (myGroupIds.length > 0) {
      return await db.query.socialGroups.findMany({
        where: notInArray(socialGroups.id, myGroupIds),
        orderBy: [desc(socialGroups.memberCount)],
        limit: 20
      });
    } else {
      return await db.query.socialGroups.findMany({
        orderBy: [desc(socialGroups.memberCount)],
        limit: 20
      });
    }
  } catch (error) {
    console.error('Lỗi lấy danh sách nhóm gợi ý:', error);
    return [];
  }
}

/**
 * Lấy chi tiết nhóm theo ID
 */
export async function getGroupById(groupId: number) {
  try {
    return await db.query.socialGroups.findFirst({
      where: eq(socialGroups.id, groupId)
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin nhóm:', error);
    return null;
  }
}

export async function checkGroupMembership(groupId: number, userId: number) {
  try {
    return await db.query.socialGroupMembers.findFirst({
      where: and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.userId, userId))
    });
  } catch (error) {
    console.error('Lỗi kiểm tra thành viên:', error);
    return null;
  }
}

export async function approveGroupMemberAction(groupId: number, userId: number, status: 'approved' | 'rejected') {
  try {
    const user = await getUser();
    if (!user) throw new Error('Unauthorized');

    const adminCheck = await db.query.socialGroupMembers.findFirst({
      where: and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.userId, user.id))
    });

    if (!adminCheck || adminCheck.role !== 'admin') {
      throw new Error('Forbidden: Only admin can approve members');
    }

    if (status === 'rejected') {
      await db.delete(socialGroupMembers).where(
        and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.userId, userId))
      );
    } else {
      await db.update(socialGroupMembers)
        .set({ status: 'approved' })
        .where(and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.userId, userId)));
      
      await db.update(socialGroups)
        .set({
          memberCount: sql`${socialGroups.memberCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(socialGroups.id, groupId));
    }

    revalidatePath(`/groups/${groupId}/admin`);
    revalidatePath(`/groups/${groupId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Lỗi duyệt thành viên:', error);
    return { error: error.message || 'Lỗi hệ thống' };
  }
}

export async function approveGroupPostAction(postId: number, status: 'approved' | 'rejected') {
  try {
    const user = await getUser();
    if (!user) throw new Error('Unauthorized');

    const post = await db.query.feedPosts.findFirst({
      where: eq(feedPosts.id, postId)
    });

    if (!post || !post.groupId) throw new Error('Bài viết không hợp lệ');

    const adminCheck = await db.query.socialGroupMembers.findFirst({
      where: and(eq(socialGroupMembers.groupId, post.groupId), eq(socialGroupMembers.userId, user.id))
    });

    if (!adminCheck || adminCheck.role !== 'admin') {
      throw new Error('Forbidden: Only admin can approve posts');
    }

    if (status === 'rejected') {
      await db.delete(feedPosts).where(eq(feedPosts.id, postId));
    } else {
      await db.update(feedPosts).set({ status: 'approved' }).where(eq(feedPosts.id, postId));
    }

    revalidatePath(`/groups/${post.groupId}/admin`);
    revalidatePath(`/groups/${post.groupId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Lỗi duyệt bài viết:', error);
    return { error: error.message || 'Lỗi hệ thống' };
  }
}

/**
 * Lấy danh sách thành viên nhóm
 */
export async function getGroupMembers(groupId: number) {
  try {
    return await db.query.socialGroupMembers.findMany({
      where: eq(socialGroupMembers.groupId, groupId),
      with: {
        user: {
          columns: { id: true, name: true, email: true, avatarUrl: true }
        }
      }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách thành viên nhóm:', error);
    return [];
  }
}