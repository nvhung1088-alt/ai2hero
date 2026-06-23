import { db } from '@/lib/db/drizzle';
import { notifications } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ success: false, unreadCount: 0, notifications: [], error: 'Unauthorized' }, { status: 200 });
    }

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(20);

    const unreadCount = userNotifications.filter(n => n.read === 0).length;

    return Response.json({
      success: true,
      notifications: userNotifications.map(n => ({
        id: n.id,
        fromUser: n.fromUserName || 'Hệ thống',
        fromAvatar: n.fromUserAvatar || '👤',
        content: n.message,
        url: n.postId ? `/post/${n.postId}` : n.invitationId ? `/groups` : '#',
        timestamp: n.createdAt ? new Date(n.createdAt).toLocaleDateString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '',
        read: n.read === 1,
        postId: n.postId,
        type: n.type || null,
        invitationId: n.invitationId || null,
      })),
      unreadCount,
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Lỗi hệ thống khi tải thông báo.' }, { status: 500 });
  }
}
