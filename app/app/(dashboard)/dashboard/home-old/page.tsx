import { redirect } from 'next/navigation';
import { getUser, getFeedPosts, getTeamsForUser, getUserWithTeam } from '@/lib/db/queries';
import { SocialFeedClient } from './social-feed-client';
import { db } from '@/lib/db/drizzle';
import { systemAnnouncements, userAnnouncementReads } from '@/lib/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';

export default async function SocialFeedPage() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const teams = await getTeamsForUser(user.id);
  const userTeamIds = teams.map((t: any) => t.id);
  const posts = await getFeedPosts(userTeamIds);
  const userWithTeam = await getUserWithTeam(user.id);

  const mockPost1 = {
    id: 99991,
    type: 'user_post',
    teamId: 'team-1',
    teamIdNum: 1,
    userId: 1,
    userName: 'Ai2Hero Tester',
    userAvatar: '🦸‍♂️',
    userRole: 'admin',
    timestamp: 'Vừa xong',
    date: new Date().toISOString().split('T')[0],
    message: 'Chào buổi sáng mọi người! Hôm nay chúng ta vừa hoàn thành bản cập nhật giao diện Bảng Tin mới theo phong cách cực xịn mịn. Nhìn sơ qua đã thấy một luồng gió mới rồi! Đây là đoạn văn bản dài để test tính năng See More (Xem thêm). Khi đoạn văn này vượt quá hai trăm năm mươi ký tự, giao diện sẽ tự động cắt bớt và chèn dấu ba chấm. Nó sẽ trông rất gọn gàng và tinh tế. @Sếp hãy vào xem thử nhé! Không biết mọi người thấy sao về cái Photo Grid layout mới này?',
    feeling: 'hào hứng',
    location: 'Trụ sở Ai2Hero',
    taggedUsers: ['Sếp', 'Team Dev'],
    likes: 42,
    likedByMe: false,
    reactionsSummary: { like: 20, love: 15, wow: 7 },
    comments: [],
    mentions: ['@Sếp'],
    attachments: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&q=80&w=800' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=800' }
    ],
    pinned: false
  };

  const mockPost2 = {
    id: 99992,
    type: 'user_post',
    teamId: 'team-1',
    teamIdNum: 1,
    userId: 1,
    userName: 'Đội Thiết Kế',
    userAvatar: '🎨',
    userRole: 'member',
    timestamp: '5 phút trước',
    date: new Date().toISOString().split('T')[0],
    message: 'Test thử layout 3 ảnh xem sao nhé mọi người. Có cả comment mẫu ở dưới nè.',
    feeling: 'sáng tạo',
    location: null,
    taggedUsers: [],
    likes: 12,
    likedByMe: true,
    myReactionType: 'love',
    reactionsSummary: { love: 1, like: 11 },
    comments: [
      {
        id: 8881,
        userId: 2,
        userName: 'Dev Team',
        userAvatar: '💻',
        content: 'Đẹp tuyệt vời! @Đội Thiết Kế tay nghề lên quá',
        timestamp: '1 phút trước',
        likesCount: 1,
        likedByMe: false,
        replies: []
      }
    ],
    mentions: ['@Đội Thiết Kế'],
    attachments: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&q=80&w=800' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&q=80&w=800' }
    ],
    pinned: false
  };

  const allPosts = [mockPost1, mockPost2, ...posts];

  // Lấy thông cáo khẩn cấp (warning/critical)
  const urgentAnnouncements = await db
    .select()
    .from(systemAnnouncements)
    .where(
      inArray(systemAnnouncements.severity, ['warning', 'critical'])
    )
    .orderBy(desc(systemAnnouncements.createdAt));

  // Lấy danh sách ID các thông báo đã đọc bởi user hiện tại
  const readAnnouncements = await db
    .select({ announcementId: userAnnouncementReads.announcementId })
    .from(userAnnouncementReads)
    .where(eq(userAnnouncementReads.userId, user.id));

  const readIds = new Set(readAnnouncements.map(r => r.announcementId));

  // Lọc lấy thông cáo khẩn cấp CHƯA đọc đầu tiên
  const unreadUrgent = urgentAnnouncements.find(a => !readIds.has(a.id)) || null;

  return (
    <SocialFeedClient 
      user={user} 
      initialPosts={allPosts} 
      teams={teams} 
      userWithTeam={userWithTeam} 
      urgentAnnouncement={unreadUrgent}
    />
  );
}
