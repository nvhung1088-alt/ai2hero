import { db } from './db/drizzle';
import { teamMembers } from './db/schema';
import { eq, and } from 'drizzle-orm';
import { getUser } from './db/queries';

import { getActiveTeamCookie } from './team-cookie';

/**
 * Lấy teamId đầu tiên của người dùng hiện tại (dùng cho MVP)
 */
export async function getCurrentTeamId(): Promise<number> {
  const user = await getUser();
  if (!user) {
    throw new Error('Chưa đăng nhập');
  }

  const activeTeamId = await getActiveTeamCookie();
  if (activeTeamId) {
    // Xác thực xem người dùng hiện tại có thuộc team này không
    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, user.id),
          eq(teamMembers.teamId, activeTeamId)
        )
      )
      .limit(1);

    if (membership) {
      return activeTeamId;
    }
  }

  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  if (!membership) {
    throw new Error('Người dùng chưa tham gia nhóm nào');
  }

  return membership.teamId;
}

