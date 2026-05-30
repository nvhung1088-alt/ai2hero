import { db } from '@/lib/db/drizzle';
import { systemAnnouncements, userAnnouncementReads } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Lấy toàn bộ các thông cáo hệ thống, sắp xếp giảm dần theo thời gian tạo
    const announcements = await db
      .select()
      .from(systemAnnouncements)
      .orderBy(desc(systemAnnouncements.createdAt));

    // 2. Lấy danh sách ID các thông cáo đã đọc bởi user hiện tại
    const readRecords = await db
      .select({ announcementId: userAnnouncementReads.announcementId })
      .from(userAnnouncementReads)
      .where(eq(userAnnouncementReads.userId, user.id));

    const readIds = new Set(readRecords.map(r => r.announcementId));

    // 3. Map thuộc tính `unread` động và tính số lượng chưa đọc
    const mappedAnnouncements = announcements.map(a => ({
      id: a.id,
      title: a.title,
      content: a.content,
      version: a.version,
      severity: a.severity || 'info',
      timestamp: a.createdAt ? new Date(a.createdAt).toLocaleDateString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      }) : '',
      unread: !readIds.has(a.id),
    }));

    const unreadCount = mappedAnnouncements.filter(a => a.unread).length;

    return Response.json({
      success: true,
      announcements: mappedAnnouncements,
      unreadCount,
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Lỗi hệ thống khi tải bản cập nhật.' }, { status: 500 });
  }
}
