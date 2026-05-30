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
      initialPosts={posts} 
      teams={teams} 
      userWithTeam={userWithTeam} 
      urgentAnnouncement={unreadUrgent}
    />
  );
}
