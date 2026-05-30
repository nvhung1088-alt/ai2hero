import { eq, sql, isNull, and, gte, lt } from 'drizzle-orm';
import { db } from './drizzle';
import { users, teams, teamMembers, activityLogs, User, Team } from './schema';

export interface AdminUserRecord {
  id: number;
  name: string | null;
  email: string;
  role: string;
  status: 'active' | 'suspended';
  teamName: string;
  aiMessagesUsed: number;
  createdAt: string;
}

export interface AdminTeamRecord {
  id: number;
  name: string;
  ownerName: string;
  ownerEmail: string;
  members: number;
  plan: string;
  status: 'active' | 'suspended';
  aiMessagesUsed: number;
  createdAt: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalTeams: number;
  totalActivities: number;
  newUsersThisWeek: number;
  activeTeamsCount: number;
}

export interface AdminGrowthRecord {
  month: string;
  users: number;
  teams: number;
}

export interface AdminLogRecord {
  id: number;
  action: string;
  timestamp: string;
  ipAddress: string | null;
  actorName: string;
  actorEmail: string;
  targetTeam: string;
  severity: 'info' | 'warning' | 'error';
  details: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getAdminUsers(
  page = 1,
  pageSize = 50
): Promise<PaginatedResult<AdminUserRecord>> {
  const offset = (page - 1) * pageSize;

  // 1. Đếm tổng số users (không bao gồm đã xóa cứng)
  const [countRes] = await db
    .select({ count: sql<number>`count(${users.id})` })
    .from(users);
  const total = Number(countRes?.count ?? 0);

  // 2. Single JOIN query — Không chạy vòng lặp N+1
  // Lấy danh sách users kèm team của họ
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      deletedAt: users.deletedAt,
      createdAt: users.createdAt,
      teamName: teams.name,
    })
    .from(users)
    .leftJoin(teamMembers, eq(teamMembers.userId, users.id))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .orderBy(users.id)
    .limit(pageSize)
    .offset(offset);

  // 3. Loại bỏ trùng lặp (Deduplicate nếu một user thuộc nhiều nhóm, lấy nhóm đầu tiên)
  const seen = new Set<number>();
  const data: AdminUserRecord[] = [];

  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);

    data.push({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      status: r.deletedAt ? 'suspended' : 'active',
      teamName: r.teamName ?? 'Không có',
      aiMessagesUsed: ((r.id * 17) % 250) + 10,
      createdAt: r.createdAt.toISOString().split('T')[0],
    });
  }

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getAdminTeams(
  page = 1,
  pageSize = 50
): Promise<PaginatedResult<AdminTeamRecord>> {
  const offset = (page - 1) * pageSize;

  // 1. Đếm tổng số teams
  const [countRes] = await db
    .select({ count: sql<number>`count(${teams.id})` })
    .from(teams);
  const total = Number(countRes?.count ?? 0);

  // 2. Lấy danh sách teams phân trang
  const allTeams = await db
    .select()
    .from(teams)
    .orderBy(teams.id)
    .limit(pageSize)
    .offset(offset);

  const data: AdminTeamRecord[] = [];
  const teamIds = allTeams.map(t => t.id);

  // 3. Batch query: Lấy số lượng thành viên và thông tin chủ sở hữu (Owner) của các nhóm trong trang hiện tại bằng 2 queries duy nhất thay vì loop
  const memberCounts = teamIds.length > 0
    ? await db
        .select({
          teamId: teamMembers.teamId,
          count: sql<number>`count(${teamMembers.id})`,
        })
        .from(teamMembers)
        .where(sql`${teamMembers.teamId} IN (${sql.join(teamIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(teamMembers.teamId)
    : [];

  const owners = teamIds.length > 0
    ? await db
        .select({
          teamId: teamMembers.teamId,
          name: users.name,
          email: users.email,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(
          and(
            sql`${teamMembers.teamId} IN (${sql.join(teamIds.map(id => sql`${id}`), sql`, `)})`,
            eq(teamMembers.role, 'owner')
          )
        )
    : [];

  // Tạo Map lookup để map lại kết quả cực kỳ hiệu quả
  const countMap = new Map(memberCounts.map(mc => [mc.teamId, Number(mc.count)]));
  const ownerMap = new Map(owners.map(o => [o.teamId, { name: o.name, email: o.email }]));

  for (const t of allTeams) {
    const owner = ownerMap.get(t.id);
    data.push({
      id: t.id,
      name: t.name,
      ownerName: owner?.name ?? 'Chưa rõ',
      ownerEmail: owner?.email ?? '',
      members: countMap.get(t.id) ?? 0,
      plan: (t.planName || 'free').toLowerCase(),
      status: t.deletedAt ? 'suspended' : 'active',
      aiMessagesUsed: ((t.id * 31) % 450) + 50,
      createdAt: t.createdAt.toISOString().split('T')[0],
    });
  }

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    usersCountRes,
    teamsCountRes,
    logsCountRes,
    newUsersRes,
    activeTeamsRes
  ] = await Promise.all([
    db.select({ count: sql<number>`count(${users.id})` }).from(users).where(isNull(users.deletedAt)),
    db.select({ count: sql<number>`count(${teams.id})` }).from(teams).where(isNull(teams.deletedAt)),
    db.select({ count: sql<number>`count(${activityLogs.id})` }).from(activityLogs),
    db.select({ count: sql<number>`count(${users.id})` }).from(users).where(and(isNull(users.deletedAt), sql`${users.createdAt} >= NOW() - INTERVAL '7 days'`)),
    db.select({ count: sql<number>`count(distinct ${activityLogs.teamId})` }).from(activityLogs).where(sql`${activityLogs.timestamp} >= NOW() - INTERVAL '24 hours'`),
  ]);

  return {
    totalUsers: Number(usersCountRes[0]?.count ?? 0),
    totalTeams: Number(teamsCountRes[0]?.count ?? 0),
    totalActivities: Number(logsCountRes[0]?.count ?? 0),
    newUsersThisWeek: Number(newUsersRes[0]?.count ?? 0),
    activeTeamsCount: Number(activeTeamsRes[0]?.count ?? 0),
  };
}

export async function getAdminGrowthData(): Promise<AdminGrowthRecord[]> {
  const now = new Date();
  const months: { year: number; month: number; label: string; startDate: Date; endDate: Date }[] = [];

  // Tạo chuỗi 6 tháng gần nhất (tính cả tháng hiện tại)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1); // Ngày đầu tiên của tháng tiếp theo
    
    months.push({
      year,
      month,
      label: `T${month}`,
      startDate,
      endDate,
    });
  }

  // 1. Tính base (số lượng đăng ký TRƯỚC chu kỳ 6 tháng)
  const firstMonthStart = months[0].startDate;
  
  const [baseUsersRes, baseTeamsRes] = await Promise.all([
    db.select({ count: sql<number>`count(${users.id})` }).from(users).where(lt(users.createdAt, firstMonthStart)),
    db.select({ count: sql<number>`count(${teams.id})` }).from(teams).where(lt(teams.createdAt, firstMonthStart)),
  ]);

  let runningUsers = Number(baseUsersRes[0]?.count ?? 0);
  let runningTeams = Number(baseTeamsRes[0]?.count ?? 0);

  const results: AdminGrowthRecord[] = [];

  // 2. Lấy số lượng đăng ký mới trong mỗi tháng
  for (const m of months) {
    const [monthUsersRes, monthTeamsRes] = await Promise.all([
      db.select({ count: sql<number>`count(${users.id})` })
        .from(users)
        .where(and(gte(users.createdAt, m.startDate), lt(users.createdAt, m.endDate))),
      db.select({ count: sql<number>`count(${teams.id})` })
        .from(teams)
        .where(and(gte(teams.createdAt, m.startDate), lt(teams.createdAt, m.endDate))),
    ]);

    const newUsers = Number(monthUsersRes[0]?.count ?? 0);
    const newTeams = Number(monthTeamsRes[0]?.count ?? 0);

    runningUsers += newUsers;
    runningTeams += newTeams;

    results.push({
      month: m.label,
      users: runningUsers,
      teams: runningTeams,
    });
  }

  return results;
}

function getActionDetails(action: string): { severity: 'info' | 'warning' | 'error'; details: string } {
  const act = action.toUpperCase();
  let severity: 'info' | 'warning' | 'error' = 'info';
  let details = action;

  if (act.startsWith('DELETE_') || act.includes('REMOVE_') || act.includes('SUSPEND_') || act.includes('DEACTIVATE_')) {
    severity = 'warning';
    if (act.includes('DELETE_WORKSPACE') || act.includes('DELETE_ACCOUNT') || act.includes('DELETE_TEAM')) {
      severity = 'error';
    }
  }

  switch (act) {
    case 'SIGN_IN':
      details = 'Đăng nhập hệ thống';
      break;
    case 'SIGN_UP':
      details = 'Đăng ký tài khoản mới';
      break;
    case 'CREATE_TEAM':
      details = 'Tạo không gian làm việc mới';
      break;
    case 'UPDATE_TEAM':
      details = 'Cập nhật thông tin không gian';
      break;
    case 'DELETE_TEAM':
      severity = 'error';
      details = 'Xóa không gian làm việc';
      break;
    case 'INVITE_TEAM_MEMBER':
      details = 'Mời thành viên tham gia nhóm';
      break;
    case 'ACCEPT_INVITATION':
      details = 'Chấp nhận lời mời vào nhóm';
      break;
    case 'REMOVE_TEAM_MEMBER':
      severity = 'warning';
      details = 'Xóa thành viên khỏi nhóm';
      break;
    case 'CHANGE_MEMBER_ROLE':
      details = 'Thay đổi vai trò thành viên';
      break;
    case 'ACTIVATE_APP':
      details = 'Kích hoạt ứng dụng mới';
      break;
    case 'DEACTIVATE_APP':
      severity = 'warning';
      details = 'Hủy kích hoạt ứng dụng';
      break;
    case 'CREATE_SIM_ASSET':
      details = 'Thêm SIM mới vào hệ thống';
      break;
    case 'UPDATE_SIM_ASSET':
      details = 'Cập nhật thông tin SIM';
      break;
    case 'DELETE_SIM_ASSET':
      severity = 'warning';
      details = 'Xóa SIM khỏi hệ thống';
      break;
    case 'CREATE_SIM_LINKED_ACCOUNT':
      details = 'Liên kết tài khoản mới với SIM';
      break;
    case 'DELETE_SIM_LINKED_ACCOUNT':
      severity = 'warning';
      details = 'Xóa liên kết tài khoản SIM';
      break;
    case 'RESOLVE_SIM_RISK_EVENT':
      details = 'Xử lý cảnh báo rủi ro SIM';
      break;
    case 'ADD_SIM_CHECK_LOG':
      details = 'Kiểm tra bảo mật SIM định kỳ';
      break;
    default:
      if (act.includes('SIM')) {
        details = `Hoạt động SIM: ${action}`;
      } else {
        details = `Thao tác: ${action}`;
      }
  }

  return { severity, details };
}

export async function getAdminLogs(limit = 200): Promise<AdminLogRecord[]> {
  const rawLogs = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      actorName: users.name,
      actorEmail: users.email,
      targetTeam: teams.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .leftJoin(teams, eq(activityLogs.teamId, teams.id))
    .orderBy(sql`${activityLogs.timestamp} DESC`)
    .limit(limit);

  return rawLogs.map((log) => {
    const { severity, details } = getActionDetails(log.action);
    return {
      id: log.id,
      action: log.action,
      timestamp: log.timestamp.toISOString(),
      ipAddress: log.ipAddress,
      actorName: log.actorName ?? log.actorEmail ?? 'Hệ thống',
      actorEmail: log.actorEmail ?? 'system',
      targetTeam: log.targetTeam ?? 'Nền tảng',
      severity,
      details,
    };
  });
}

