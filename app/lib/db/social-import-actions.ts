'use server';

import { db } from './drizzle';
import { connectHubConnections } from './schema';
import { eq, and } from 'drizzle-orm';
import { getUser, getTeamForUser } from './queries';
import { importFacebookPagePosts } from '../social-crosspost/import-engine';

export async function syncSocialContentAction(data: { connectionId: number, platform: string, teamId: number }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Vui lòng đăng nhập.' };
  }

  const { connectionId, platform, teamId } = data;

  // Validate connection
  const [connection] = await db
    .select()
    .from(connectHubConnections)
    .where(
      and(
        eq(connectHubConnections.id, connectionId),
        eq(connectHubConnections.teamId, teamId)
      )
    )
    .limit(1);

  if (!connection) {
    return { error: 'Kết nối không tồn tại hoặc không thuộc về không gian làm việc này.' };
  }

  if (platform === 'facebook') {
    const result = await importFacebookPagePosts(teamId, user.id, connectionId);
    if (!result.success) {
      return { error: result.error };
    }
    return { success: `Đã đồng bộ thành công ${result.importedCount} bài viết từ Facebook Page.` };
  }

  return { error: `Platform ${platform} chưa được hỗ trợ đồng bộ tự động.` };
}
