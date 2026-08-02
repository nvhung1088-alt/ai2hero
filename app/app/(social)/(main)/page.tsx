import { redirect } from 'next/navigation';
import { getUser, getFeedPosts, getTeamsForUser, getUserWithTeam, getFeedStories } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { systemAnnouncements, userAnnouncementReads } from '@/lib/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { SocialFeedClient } from './social-feed-client';
import { getActiveTeamCookie } from '@/lib/team-cookie';

export const revalidate = 0;

export default async function SocialFeedPage() {
  try {
    const user = await getUser();

    const teams = user ? await getTeamsForUser(user.id) : [];
    const userTeamIds = teams.map((t: any) => t.id);
    
    let posts: any[] = [];
    let stories: any[] = [];
    
    const dbPosts = await getFeedPosts(userTeamIds);
    posts = [...dbPosts];
    
    const userWithTeam = user ? await getUserWithTeam(user.id) : null;
    
    let activeTeamId = await getActiveTeamCookie();
    if (!activeTeamId && teams.length > 0) {
      activeTeamId = teams[0].id;
    }

    // Lấy thông cáo khẩn cấp (warning/critical)
    let unreadUrgent = null;
    if (user) {
      const urgentAnnouncements = await db
        .select()
        .from(systemAnnouncements)
        .where(
          inArray(systemAnnouncements.severity, ['warning', 'critical'])
        )
        .orderBy(desc(systemAnnouncements.createdAt));

      const readAnnouncements = await db
        .select({ announcementId: userAnnouncementReads.announcementId })
        .from(userAnnouncementReads)
        .where(eq(userAnnouncementReads.userId, user.id));

      const readIds = new Set(readAnnouncements.map(r => r.announcementId));
      unreadUrgent = urgentAnnouncements.find(a => !readIds.has(a.id)) || null;
      
      if (activeTeamId) {
        stories = await getFeedStories(activeTeamId);
      }
    }

    // Serialize props to avoid RSC Date serialization issues
    const safeUser = user ? JSON.parse(JSON.stringify(user)) : null;
    const safePosts = JSON.parse(JSON.stringify(posts));
    const safeStories = JSON.parse(JSON.stringify(stories));
    const safeTeams = JSON.parse(JSON.stringify(teams));
    const safeUserWithTeam = userWithTeam ? JSON.parse(JSON.stringify(userWithTeam)) : null;
    const safeUrgentAnnouncement = unreadUrgent ? JSON.parse(JSON.stringify(unreadUrgent)) : null;

    return (
      <SocialFeedClient 
        user={safeUser} 
        initialPosts={safePosts} 
        initialStories={safeStories}
        teams={safeTeams} 
        userWithTeam={safeUserWithTeam} 
        urgentAnnouncement={safeUrgentAnnouncement}
        activeTeamId={activeTeamId || (userTeamIds[0] ?? 0)}
      />
    );
  } catch (error: any) {
    return (
      <div className="p-8 text-red-500 bg-red-500/10 rounded-xl border border-red-500/20 m-6 mt-20 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-2">Lỗi tải dữ liệu Trang Chủ</h2>
        <pre className="text-sm overflow-auto whitespace-pre-wrap font-mono">{error.message || String(error)}</pre>
        {error.stack && (
          <pre className="text-xs text-red-400/70 mt-4 overflow-auto max-h-96 whitespace-pre-wrap font-mono">{error.stack}</pre>
        )}
      </div>
    );
  }
}
