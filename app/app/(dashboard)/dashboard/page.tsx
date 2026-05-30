import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser, getTeamsForUser, getActivityLogs } from '@/lib/db/queries';
import { getAppById } from '@/lib/apps-registry';
import { 
  Layers, 
  ArrowRight, 
  Sparkles, 
  Clock
} from 'lucide-react';
import { PLAN_ICON } from '@/lib/shared-constants';
import { getPlanLabel, getPlanBadgeClass } from '@/lib/shared-constants';
import { CreateWorkspaceModal } from './create-workspace-modal';

function getActivityMessage(action: string): string {
  switch (action) {
    case 'SIGN_UP':
      return 'đã đăng ký tài khoản mới';
    case 'SIGN_IN':
      return 'đã đăng nhập vào hệ thống';
    case 'SIGN_OUT':
      return 'đã đăng xuất khỏi hệ thống';
    case 'UPDATE_PASSWORD':
      return 'đã cập nhật mật khẩu bảo mật';
    case 'DELETE_ACCOUNT':
      return 'đã xóa tài khoản vĩnh viễn';
    case 'UPDATE_ACCOUNT':
      return 'đã cập nhật thông tin cá nhân';
    case 'CREATE_TEAM':
      return 'đã tạo một không gian làm việc mới';
    case 'REMOVE_TEAM_MEMBER':
      return 'đã xóa thành viên khỏi nhóm';
    case 'INVITE_TEAM_MEMBER':
      return 'đã gửi lời mời tham gia nhóm';
    case 'ACCEPT_INVITATION':
      return 'đã đồng ý tham gia vào nhóm';
    default:
      return `đã thực hiện thao tác ${action}`;
  }
}

export default async function BoardOverviewPage() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const teams = await getTeamsForUser(user.id);
  const activities = await getActivityLogs();

  const totalMembers = teams.reduce((acc, t) => acc + (t.memberCount || 0), 0);
  const totalApps = teams.reduce(
    (acc, t) => acc + (Array.isArray(t.activatedApps) ? t.activatedApps.length : 0),
    0
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <section className="flex-1 p-6 lg:p-10 space-y-8 animate-fade-in">
      {/* Welcome & Stats Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border border-white/5 rounded-3xl p-6 lg:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-gradient-to-tr from-orange-500 to-pink-500 blur-3xl opacity-20 pointer-events-none" />
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-orange-400 font-medium text-sm">
            <Sparkles className="h-4 w-4" />
            <span>Trung tâm chỉ huy AI2Hero</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {greeting},{' '}
            <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              {user.name || 'Hero'}
            </span>
            !
          </h1>
          <p className="text-gray-400 text-sm max-w-xl">
            Chào mừng quay trở lại! Bạn có toàn quyền quản trị tất cả các không gian làm việc và kích hoạt các MVP AI cực nhanh.
          </p>
        </div>

        {/* Macro Stats */}
        <div className="flex flex-wrap gap-4 lg:gap-6 w-full lg:w-auto">
          <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 min-w-[100px] flex-1 lg:flex-none">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Không gian</p>
            <p className="text-xl lg:text-2xl font-black text-white mt-1">{teams.length}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 min-w-[100px] flex-1 lg:flex-none">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Ứng dụng chạy</p>
            <p className="text-xl lg:text-2xl font-black text-white mt-1">{totalApps}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 min-w-[100px] flex-1 lg:flex-none">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Thành viên</p>
            <p className="text-xl lg:text-2xl font-black text-white mt-1">{totalMembers}</p>
          </div>
        </div>
      </div>

      {/* Boards Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-gray-400" />
            <span>Không gian làm việc (Workspaces)</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {teams.map((team, index) => {
            const plan = team.planName || 'free';
            const PlanIcon = PLAN_ICON[plan] || PLAN_ICON['free'];
            const activatedApps = Array.isArray(team.activatedApps) ? team.activatedApps : [];
            const avatar = team.avatar || '💼';

            return (
              <div 
                key={team.id}
                style={{ animationDelay: `${Math.min(index * 100, 600)}ms` }}
                className="group relative bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-orange-500/30 hover:bg-gray-900/80 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 transform hover:-translate-y-1 animate-fade-up"
              >
                {/* Header Card */}
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl select-none leading-none">{avatar}</span>
                      <div>
                        <h3 className="font-extrabold text-white text-base leading-snug group-hover:text-orange-400 transition-colors">
                          {team.name}
                        </h3>
                        <span className="text-[11px] text-gray-500">
                          Tạo: {new Date(team.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border uppercase font-mono tracking-wider ${getPlanBadgeClass(plan)}`}>
                      <PlanIcon className="h-2.5 w-2.5 shrink-0" />
                      <span>{getPlanLabel(plan)}</span>
                    </div>
                  </div>

                  {/* App Chips list */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ứng dụng đã kích hoạt</p>
                    {activatedApps.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Chưa kích hoạt app nào</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {activatedApps.map((appId: string) => {
                          const app = getAppById(appId);
                          if (!app) return null;
                          return (
                            <span 
                              key={appId} 
                              className="text-[10px] bg-white/5 border border-white/5 text-gray-300 px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-white/10 transition-colors"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {app.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Card */}
                <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                  {/* Members count */}
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-gray-700 to-gray-800 border-2 border-gray-950 flex items-center justify-center text-[9px] font-bold text-white uppercase shrink-0">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {team.memberCount || 1} thành viên
                    </span>
                  </div>

                  {/* Open Button */}
                  <Link href={`/dashboard/t/${team.id}`} className="flex items-center gap-1 text-xs font-bold text-orange-400 group-hover:text-white transition-colors">
                    <span>Mở</span>
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Create Board Card (Client Modal Component) */}
          <CreateWorkspaceModal />
        </div>
      </div>

      {/* Compact Activity Feed */}
      <div className="bg-gray-950/50 border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Hoạt động cá nhân gần đây</span>
          </h2>
        </div>

        <div className="divide-y divide-white/5">
          {activities.length === 0 ? (
            <p className="text-xs text-gray-500 py-3 italic">Chưa có hoạt động nào được ghi nhận</p>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-sm shrink-0 shadow-inner">
                    👤
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-300 leading-normal">
                      <span className="font-bold text-white mr-1">{act.userName || 'Hệ thống'}</span>
                      {getActivityMessage(act.action)}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                      <span>{new Date(act.timestamp).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
