'use server';

import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { heroSocialSchedules } from '@/lib/db/schema';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { revalidatePath } from 'next/cache';
import { desc, eq, and } from 'drizzle-orm';

const createScheduleSchema = z.object({
  content: z.string().min(1, "Nội dung không được để trống"),
  scheduledAt: z.string().min(1, "Vui lòng chọn thời gian đăng"),
  targetPlatforms: z.array(z.string()).min(1, "Vui lòng chọn ít nhất 1 nền tảng"),
  mediaAttachments: z.array(z.string()).optional() // Array of media URLs
});

export async function createSchedule(data: z.infer<typeof createScheduleSchema>) {
  const user = await getUser();
  const team = await getTeamForUser();

  if (!user || !team) {
    return { error: 'Unauthorized' };
  }

  const parsed = createScheduleSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  try {
    const scheduledDate = new Date(parsed.data.scheduledAt);
    
    await db.insert(heroSocialSchedules).values({
      teamId: team.id,
      userId: user.id,
      content: parsed.data.content,
      scheduledAt: scheduledDate,
      targetPlatforms: parsed.data.targetPlatforms,
      mediaAttachments: parsed.data.mediaAttachments || [],
      status: 'pending'
    });

    revalidatePath(`/hero-social/t/${team.id}/scheduler`);
    return { success: true };
  } catch (error) {
    console.error('Error creating schedule:', error);
    return { error: 'Đã xảy ra lỗi khi tạo lịch đăng' };
  }
}

export async function getSchedules(teamId: number) {
  const user = await getUser();
  if (!user) return [];

  const schedules = await db.query.heroSocialSchedules.findMany({
    where: eq(heroSocialSchedules.teamId, teamId),
    orderBy: [desc(heroSocialSchedules.scheduledAt)],
    with: {
      user: {
        columns: {
          name: true,
          email: true,
          avatarUrl: true
        }
      }
    }
  });

  return schedules;
}
