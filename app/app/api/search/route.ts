import { db } from '@/lib/db/drizzle';
import { users, feedPosts, teamMembers } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, and, like, or } from 'drizzle-orm';
import { getActiveTeamCookie } from '@/lib/team-cookie';

// Định nghĩa registry của các ứng dụng để tìm kiếm
const PLATFORM_APPS = [
  { id: 'sim', name: 'HeroSim', desc: 'Quản lý SIM và đồng bộ bảo mật SimGuard', path: '/sim/dashboard', icon: '📱' },
  { id: 'ai_chat', name: 'Trợ lý AI Chat', desc: 'Hỗ trợ CSKH tự động thông minh', path: '/dashboard/store', icon: '💬', comingSoon: true },
  { id: 'api_hub', name: 'API Hub Integration', desc: 'Quản lý kết nối API Gateway', path: '/dashboard/store', icon: '🔌', comingSoon: true },
];

export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    if (!query) {
      return Response.json({ success: true, posts: [], members: [], apps: [] });
    }

    // 1. Lấy activeTeamId từ cookie (Không gian làm việc đang hoạt động)
    const cookieTeamId = await getActiveTeamCookie();

    let teamId: number | undefined;

    if (cookieTeamId) {
      // Xác thực người dùng thực sự thuộc nhóm này (Ngăn chặn tấn công IDOR)
      const [membership] = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, user.id),
            eq(teamMembers.teamId, cookieTeamId)
          )
        )
        .limit(1);
      teamId = membership?.teamId;
    }

    // Fallback: Nếu không có cookie hoặc người dùng không có quyền truy cập nhóm trong cookie, lấy nhóm đầu tiên của họ
    if (!teamId) {
      const [fallbackTeam] = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, user.id))
        .limit(1);
      teamId = fallbackTeam?.teamId;
    }

    // 2. Tìm kiếm ứng dụng khớp tên trong Registry
    const matchedApps = PLATFORM_APPS.filter(
      app =>
        app.name.toLowerCase().includes(query.toLowerCase()) ||
        app.desc.toLowerCase().includes(query.toLowerCase())
    );

    // 3. Tìm kiếm thành viên trong DB (trong cùng Team)
    let matchedMembers: any[] = [];
    if (teamId) {
      const dbMembers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: teamMembers.role,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(
          and(
            eq(teamMembers.teamId, teamId),
            or(
              like(users.name, `%${query}%`),
              like(users.email, `%${query}%`)
            )
          )
        )
        .limit(5);

      matchedMembers = dbMembers.map(m => ({
        id: m.id,
        name: m.name || 'Thành viên mới',
        email: m.email,
        role: m.role === 'owner' ? 'Trưởng nhóm' : m.role === 'admin' ? 'Quản trị' : 'Thành viên',
        avatar: (m.name || m.email || '?').charAt(0).toUpperCase(),
      }));
    }

    // 4. Tìm kiếm bài viết Social Feed khớp nội dung
    let matchedPosts: any[] = [];
    if (teamId) {
      const dbPosts = await db
        .select()
        .from(feedPosts)
        .where(
          and(
            eq(feedPosts.teamId, teamId),
            or(
              like(feedPosts.message, `%${query}%`),
              like(feedPosts.taskTitle, `%${query}%`),
              like(feedPosts.taskAssignee, `%${query}%`)
            )
          )
        )
        .limit(5);

      matchedPosts = dbPosts.map(p => ({
        id: p.id,
        message: p.message,
        type: p.type,
        taskTitle: p.taskTitle,
        createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : '',
      }));
    }

    return Response.json({
      success: true,
      query,
      apps: matchedApps,
      members: matchedMembers,
      posts: matchedPosts,
    });

  } catch (error: any) {
    return Response.json({ error: error.message || 'Lỗi hệ thống khi tìm kiếm.' }, { status: 500 });
  }
}
