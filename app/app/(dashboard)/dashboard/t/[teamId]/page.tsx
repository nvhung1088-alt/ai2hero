import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { getTeamWithMembers, getFeedPosts, getUser } from '@/lib/db/queries';
import { activityLogs, users } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import TeamDetailClient from './team-detail-client';

export default async function TeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const teamIdNum = parseInt(teamId, 10);

  if (isNaN(teamIdNum)) {
    return <TeamNotFound reason="invalid_id" />;
  }

  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamWithMembers(teamIdNum);

  if (!team) {
    return <TeamNotFound reason="not_found" />;
  }

  // KIỂM TRA BẢO MẬT (TENANT ISOLATION)
  const isMember = team.teamMembers.some(tm => tm.user.id === user.id);

  if (!isMember && user.role !== 'super_admin') {
    return (
      <TeamNotFound
        reason="tenant_isolation"
        userDiagnostics={{ email: user.email, role: user.role, userId: user.id }}
      />
    );
  }

  // Lấy danh sách thành viên chuẩn hóa
  const members = team.teamMembers.map(tm => ({
    id: tm.user.id,
    name: tm.user.name || tm.user.email || 'Hero',
    role: tm.role
  }));

  // Lấy các bài đăng trên bảng tin từ database
  const allPosts = await getFeedPosts([teamIdNum]);
  const initialTasks = allPosts.filter(p => p.type === 'task_assignment');

  // Lấy lịch sử hoạt động thực tế từ database
  const activitiesDb = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.teamId, teamIdNum))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);

  const activities = activitiesDb.map(act => {
    let appId: string | undefined = undefined;
    let formattedMessage = '';
    
    if (act.action.startsWith('ACTIVATE_APP:')) {
      appId = act.action.split(':')[1];
      formattedMessage = `đã kích hoạt ứng dụng ${appId}`;
    } else if (act.action.startsWith('DEACTIVATE_APP:')) {
      appId = act.action.split(':')[1];
      formattedMessage = `đã hủy kích hoạt ứng dụng ${appId}`;
    } else if (act.action.startsWith('CREATE_FEED_POST:')) {
      formattedMessage = `đã đăng bài viết mới trên bảng tin`;
    } else if (act.action === 'INVITE_TEAM_MEMBER') {
      formattedMessage = `đã mời một thành viên mới`;
    } else if (act.action === 'REMOVE_TEAM_MEMBER') {
      formattedMessage = `đã xóa thành viên khỏi nhóm`;
    } else if (act.action === 'CREATE_TEAM') {
      formattedMessage = `đã tạo không gian làm việc này`;
    } else {
      formattedMessage = `đã thực hiện hành động: ${act.action}`;
    }
    
    return {
      id: act.id,
      action: act.action,
      timestamp: new Date(act.timestamp).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      userName: act.userName || 'Hero',
      appId,
      message: formattedMessage
    };
  });

  const normalizedTeam = {
    id: team.id,
    name: team.name,
    avatar: team.avatar || '💼',
    plan: (team.planName || 'free') as 'free' | 'pro' | 'enterprise',
    members,
    activatedApps: Array.isArray(team.activatedApps) ? (team.activatedApps as string[]) : [],
    createdAt: new Date(team.createdAt).toLocaleDateString('vi-VN')
  };

  return (
    <TeamDetailClient
      team={normalizedTeam}
      initialTasks={initialTasks as any[]}
      feedPosts={allPosts as any[]}
      activities={activities}
    />
  );
}

function TeamNotFound({
  reason,
  userDiagnostics
}: {
  reason?: 'invalid_id' | 'not_found' | 'tenant_isolation';
  userDiagnostics?: { email: string; role: string; userId: number };
}) {
  return (
    <div className="flex-1 p-6 lg:p-10 flex flex-col items-center justify-center min-h-[60vh] space-y-5">
      <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 text-2xl font-bold">
        !
      </div>
      <h1 className="text-xl font-bold text-white">Không tìm thấy không gian này</h1>
      
      {reason === 'tenant_isolation' ? (
        <div className="text-center space-y-3 max-w-md">
          <p className="text-sm text-gray-400">
            Bạn không có quyền truy cập không gian làm việc này. Bảo mật Tenant Isolation đã chặn yêu cầu của bạn.
          </p>
          {userDiagnostics && (
            <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl text-[11px] text-gray-500 text-left font-mono space-y-1">
              <div>• Tài khoản: {userDiagnostics.email}</div>
              <div>• Vai trò: {userDiagnostics.role}</div>
              <div>• Gợi ý: Hãy đăng nhập bằng tài khoản thành viên của Workspace này, hoặc liên hệ Quản trị viên để được cấp quyền.</div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center max-w-sm">
          Đường dẫn không hợp lệ, không gian làm việc đã bị xóa mềm, hoặc tài khoản của bạn chưa có quyền truy cập.
        </p>
      )}

      <Link href="/dashboard" className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white hover:bg-white/10 transition-colors">
        Quay lại Bảng điều khiển
      </Link>
    </div>
  );
}
