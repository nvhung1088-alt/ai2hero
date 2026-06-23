'use server'

import { db } from './drizzle';
import { socialPages, socialPageFollowers } from './schema';
import { getUser } from './queries';
import { and, eq, desc, notInArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createPageAction(data: { name: string, username: string, category?: string, description?: string }) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  // Check unique username
  const existing = await db.query.socialPages.findFirst({
    where: eq(socialPages.username, data.username)
  });
  if (existing) {
    throw new Error('Username (Tên định danh) đã được sử dụng');
  }

  const [newPage] = await db.insert(socialPages).values({
    name: data.name,
    username: data.username,
    category: data.category || 'Khác',
    description: data.description || '',
    ownerId: user.id,
    followersCount: 0,
    likesCount: 0,
  }).returning();

  revalidatePath('/pages');
  return newPage;
}

export async function updatePageAction(pageId: number, data: { name?: string, description?: string, category?: string, website?: string, email?: string, phone?: string, address?: string, avatarUrl?: string, coverUrl?: string }) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  const page = await db.query.socialPages.findFirst({
    where: eq(socialPages.id, pageId)
  });

  if (!page || page.ownerId !== user.id) {
    throw new Error('Forbidden: Bạn không phải quản trị viên của trang này');
  }

  const [updated] = await db.update(socialPages)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(socialPages.id, pageId))
    .returning();

  revalidatePath(`/pages/${pageId}`);
  revalidatePath('/pages');
  return updated;
}

export async function toggleFollowPageAction(pageId: number) {
  try {
    const user = await getUser();
    if (!user) throw new Error('Unauthorized');

    const existing = await db.query.socialPageFollowers.findFirst({
      where: and(eq(socialPageFollowers.pageId, pageId), eq(socialPageFollowers.userId, user.id))
    });

    if (existing) {
      // Unfollow
      await db.delete(socialPageFollowers).where(
        and(eq(socialPageFollowers.pageId, pageId), eq(socialPageFollowers.userId, user.id))
      );
      await db.update(socialPages)
        .set({
          followersCount: sql`${socialPages.followersCount} - 1`,
          updatedAt: new Date()
        })
        .where(eq(socialPages.id, pageId));
    } else {
      // Follow
      await db.insert(socialPageFollowers).values({
        pageId,
        userId: user.id,
      });
      await db.update(socialPages)
        .set({
          followersCount: sql`${socialPages.followersCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(socialPages.id, pageId));
    }

    revalidatePath(`/pages/${pageId}`);
    return { success: true, following: !existing };
  } catch (error: any) {
    console.error('Lỗi khi theo dõi trang:', error);
    return { error: error.message || 'Lỗi hệ thống' };
  }
}

export async function getMyPages(userId: number) {
  try {
    return await db.query.socialPages.findMany({
      where: eq(socialPages.ownerId, userId),
      orderBy: [desc(socialPages.createdAt)]
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách trang của tôi:', error);
    return [];
  }
}

export async function getFollowedPages(userId: number) {
  try {
    const follows = await db.query.socialPageFollowers.findMany({
      where: eq(socialPageFollowers.userId, userId),
      with: {
        page: true
      }
    });
    return follows.map(f => f.page).filter(Boolean);
  } catch (error) {
    console.error('Lỗi lấy danh sách trang theo dõi:', error);
    return [];
  }
}

export async function getPageById(pageId: number) {
  try {
    return await db.query.socialPages.findFirst({
      where: eq(socialPages.id, pageId)
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin trang:', error);
    return null;
  }
}

export async function checkPageFollowStatus(pageId: number, userId: number) {
  try {
    const follow = await db.query.socialPageFollowers.findFirst({
      where: and(eq(socialPageFollowers.pageId, pageId), eq(socialPageFollowers.userId, userId))
    });
    return !!follow;
  } catch (error) {
    return false;
  }
}

export async function discoverPages(userId: number) {
  try {
    const follows = await db.query.socialPageFollowers.findMany({
      where: eq(socialPageFollowers.userId, userId)
    });
    const followedIds = follows.map(f => f.pageId);

    if (followedIds.length > 0) {
      return await db.query.socialPages.findMany({
        where: notInArray(socialPages.id, followedIds),
        orderBy: [desc(socialPages.followersCount)],
        limit: 20
      });
    } else {
      return await db.query.socialPages.findMany({
        orderBy: [desc(socialPages.followersCount)],
        limit: 20
      });
    }
  } catch (error) {
    console.error('Lỗi lấy danh sách gợi ý trang:', error);
    return [];
  }
}
