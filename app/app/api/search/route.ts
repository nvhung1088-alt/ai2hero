import { db } from '@/lib/db/drizzle';
import { 
  users, feedPosts, teamMembers, filmSeries, 
  marketplaceProducts, marketplaceShops, 
  socialGroups, socialPages, systemAnnouncements 
} from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, and, ilike, or, inArray, isNull, sql, desc } from 'drizzle-orm';
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
    const scope = searchParams.get('scope') || 'team'; // 'team' or 'all'
    const category = searchParams.get('category') || null;

    const getLimit = (cat: string) => category === cat ? 50 : (category ? 0 : 5);

    if (!query) {
      return Response.json({ success: true, query: '', apps: [], members: [], posts: [], films: [], products: [], groups: [], pages: [], announcements: [] });
    }

    // Escape character for ILIKE query
    const safeQuery = query.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const pattern = `%${safeQuery}%`;

    // 1. Lấy activeTeamId từ cookie (nếu dùng scope team)
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

    // Prepare queries array for Promise.all
    // Apps (In-memory search)
    const matchedApps = PLATFORM_APPS.filter(
      app =>
        app.name.toLowerCase().includes(query.toLowerCase()) ||
        app.desc.toLowerCase().includes(query.toLowerCase())
    );

    // Dynamic queries
    const queries = [];

    // 1. MEMBERS
    if (scope === 'team' && teamId) {
      queries.push(
        db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: teamMembers.role,
          avatarUrl: users.avatarUrl
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(
          and(
            eq(teamMembers.teamId, teamId),
            or(ilike(users.name, pattern), ilike(users.email, pattern))
          )
        )
        .orderBy(desc(users.id))
        .limit(getLimit('members'))
      );
    } else {
      queries.push(
        db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: sql`'member'`,
          avatarUrl: users.avatarUrl
        })
        .from(users)
        .where(
          and(
            isNull(users.deletedAt),
            or(ilike(users.name, pattern), ilike(users.email, pattern))
          )
        )
        .orderBy(desc(users.id))
        .limit(getLimit('members'))
      );
    }

    // 2. POSTS
    const postConditions = [];
    postConditions.push(or(ilike(feedPosts.message, pattern), ilike(feedPosts.taskTitle, pattern), ilike(feedPosts.taskAssignee, pattern)));
    
    if (scope === 'team' && teamId) {
      postConditions.push(eq(feedPosts.teamId, teamId));
    } else {
      postConditions.push(
        and(
          eq(feedPosts.status, 'approved'),
          or(eq(feedPosts.visibility, 'public'), eq(feedPosts.userId, user.id))
        )
      );
    }

    queries.push(
      db.select({
        id: feedPosts.id,
        message: feedPosts.message,
        type: feedPosts.type,
        taskTitle: feedPosts.taskTitle,
        createdAt: feedPosts.createdAt,
        authorName: users.name
      })
      .from(feedPosts)
      .leftJoin(users, eq(feedPosts.userId, users.id))
      .where(and(...postConditions))
      .orderBy(desc(feedPosts.createdAt))
      .limit(getLimit('posts'))
    );

    // 3. FILMS
    queries.push(
      db.select({
        id: filmSeries.id,
        title: filmSeries.title,
        slug: filmSeries.slug,
        coverUrl: filmSeries.coverUrl,
        genre: filmSeries.genre,
        status: filmSeries.status,
        totalEpisodes: filmSeries.totalEpisodes
      })
      .from(filmSeries)
      .where(
        and(
          inArray(filmSeries.status, ['publishing', 'completed']),
          or(ilike(filmSeries.title, pattern), ilike(filmSeries.genre, pattern))
        )
      )
      .orderBy(desc(filmSeries.createdAt))
      .limit(getLimit('films'))
    );

    // 4. PRODUCTS
    queries.push(
      db.select({
        id: marketplaceProducts.id,
        name: marketplaceProducts.name,
        price: marketplaceProducts.price,
        images: marketplaceProducts.images,
        shopName: marketplaceShops.name
      })
      .from(marketplaceProducts)
      .innerJoin(marketplaceShops, eq(marketplaceProducts.shopId, marketplaceShops.id))
      .where(
        and(
          eq(marketplaceProducts.status, 'active'),
          eq(marketplaceShops.status, 'active'),
          ilike(marketplaceProducts.name, pattern)
        )
      )
      .orderBy(desc(marketplaceProducts.createdAt))
      .limit(getLimit('products'))
    );

    // 5. GROUPS
    queries.push(
      db.select({
        id: socialGroups.id,
        name: socialGroups.name,
        coverUrl: socialGroups.coverUrl,
        memberCount: socialGroups.memberCount,
        privacy: socialGroups.privacy
      })
      .from(socialGroups)
      .where(
        and(
          eq(socialGroups.privacy, 'public'),
          ilike(socialGroups.name, pattern)
        )
      )
      .orderBy(desc(socialGroups.createdAt))
      .limit(getLimit('groups'))
    );

    // 6. PAGES
    queries.push(
      db.select({
        id: socialPages.id,
        name: socialPages.name,
        username: socialPages.username,
        avatarUrl: socialPages.avatarUrl,
        followersCount: socialPages.followersCount
      })
      .from(socialPages)
      .where(
        or(ilike(socialPages.name, pattern), ilike(socialPages.username, pattern))
      )
      .orderBy(desc(socialPages.createdAt))
      .limit(getLimit('pages'))
    );

    // 7. ANNOUNCEMENTS
    queries.push(
      db.select({
        id: systemAnnouncements.id,
        title: systemAnnouncements.title,
        content: systemAnnouncements.content,
        severity: systemAnnouncements.severity,
        createdAt: systemAnnouncements.createdAt
      })
      .from(systemAnnouncements)
      .where(
        or(ilike(systemAnnouncements.title, pattern), ilike(systemAnnouncements.content, pattern))
      )
      .orderBy(desc(systemAnnouncements.createdAt))
      .limit(getLimit('announcements'))
    );

    // Execute all queries in parallel
    const [dbMembers, dbPosts, dbFilms, dbProducts, dbGroups, dbPages, dbAnnouncements] = await Promise.all(queries);

    // Format results
    const matchedMembers = (dbMembers as any[]).map(m => ({
      id: m.id,
      name: m.name || 'Thành viên mới',
      email: m.email,
      role: m.role === 'owner' ? 'Trưởng nhóm' : m.role === 'admin' ? 'Quản trị' : 'Thành viên',
      avatar: m.avatarUrl ? '' : (m.name || m.email || '?').charAt(0).toUpperCase(),
      avatarUrl: m.avatarUrl
    }));

    const matchedPosts = (dbPosts as any[]).map(p => ({
      id: p.id,
      message: p.message,
      type: p.type,
      taskTitle: p.taskTitle,
      createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : '',
      authorName: p.authorName
    }));

    return Response.json({
      success: true,
      query,
      apps: matchedApps,
      members: matchedMembers,
      posts: matchedPosts,
      films: dbFilms,
      products: dbProducts,
      groups: dbGroups,
      pages: dbPages,
      announcements: dbAnnouncements
    });

  } catch (error: any) {
    return Response.json({ error: error.message || 'Lỗi hệ thống khi tìm kiếm.' }, { status: 500 });
  }
}
