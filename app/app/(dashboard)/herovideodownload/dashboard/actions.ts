'use server';

import { db } from '@/lib/db/drizzle';
import { videoAssets, teamMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { revalidatePath } from 'next/cache';

export async function deleteVideoAction(videoId: number, teamId: number) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Bạn phải đăng nhập để thực hiện hành động này.' };
    }

    // Xác thực quyền team
    const member = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.userId, user.id),
        eq(teamMembers.teamId, teamId)
      )
    });

    if (!member) {
      return { error: 'Bạn không có quyền trong không gian làm việc này.' };
    }

    // Xóa video
    await db
      .delete(videoAssets)
      .where(
        and(
          eq(videoAssets.id, videoId),
          eq(videoAssets.teamId, teamId)
        )
      );

    revalidatePath('/herovideodownload/dashboard');
    return { success: true };
  } catch (error) {
    console.error('[deleteVideoAction] Error:', error);
    return { error: 'Lỗi hệ thống khi xóa video.' };
  }
}
