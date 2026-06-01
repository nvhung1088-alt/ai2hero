'use server';

import { db } from './drizzle';
import { videoAssets } from './schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getTeamForUser, getUser } from './queries';

export async function deleteVideoAction(videoId: number) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Chưa đăng nhập' };
    }

    const teamData = await getTeamForUser();
    if (!teamData) {
      return { error: 'Không tìm thấy Workspace' };
    }

    // Xóa video khỏi DB
    await db
      .delete(videoAssets)
      .where(
        and(
          eq(videoAssets.id, videoId),
          eq(videoAssets.teamId, teamData.id)
        )
      );

    revalidatePath('/herovideodownload/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Lỗi khi xóa video:', err);
    return { error: 'Đã có lỗi hệ thống xảy ra.' };
  }
}
