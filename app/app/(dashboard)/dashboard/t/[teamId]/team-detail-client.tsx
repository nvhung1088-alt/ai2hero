'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  getPlanLabel, 
  getPlanBadgeClass,
  getRoleByKey
} from '@/lib/shared-constants';
import { getAppById, APPS } from '@/lib/apps-registry';
import { useRouter } from 'next/navigation';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { setActiveTeamCookie } from '@/lib/team-cookie';
import { 
  ArrowLeft, Users, Settings, Store, Sparkles, Clock, ExternalLink,
  Plus, Zap, Cpu, Calendar, CheckSquare, ListTodo, BarChart3, TrendingUp,
  MessageSquare, Heart, MessageCircle, Pin, ArrowRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { APP_ICON_MAP, PLAN_ICON } from '@/lib/shared-constants';
import { changeTaskStatusAction, toggleFeedLikeAction, deactivateAppAction } from '@/app/(login)/actions';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

interface Member {
  id: number;
  name: string;
  role: string;
}

interface TeamDetail {
  id: number;
  name: string;
  avatar: string;
  plan: 'free' | 'pro' | 'enterprise';
  members: Member[];
  activatedApps: string[];
  createdAt: string;
}

interface FeedPost {
  id: number;
  type: string;
  userName: string;
  userAvatar: string;
  timestamp: string;
  message: string;
  likes: number;
  comments: any[];
  pinned: boolean;
  pinnedBy?: string;
  taskTitle?: string;
  taskAssignee?: string;
  taskDueDate?: string;
  taskStatus?: 'pending' | 'in_progress' | 'completed';
  appId?: string;
}

interface ActivityLog {
  id: number;
  action: string;
  timestamp: string;
  userName: string;
  appId?: string;
  message: string;
}

interface TeamDetailClientProps {
  team: TeamDetail;
  initialTasks: FeedPost[];
  feedPosts: FeedPost[];
  activities: ActivityLog[];
}

export default function TeamDetailClient({
  team,
  initialTasks,
  feedPosts,
  activities
}: TeamDetailClientProps) {
  const teamId = `team-${team.id}`;
  const router = useRouter();
  
  // Fetch current user and calculate if owner of workspace
  const { data: currentUser } = useSWR<any>('/api/user', fetcher);
  // Sửa đồng bộ Role chuẩn xác (chỉ check role owner thực tế trong danh sách members của workspace này)
  const isOwner = team.members.some(m => m.id === currentUser?.id && m.role === 'owner');

  // State quản lý apps cục bộ để cập nhật trực quan tức thì
  const [activatedApps, setActivatedApps] = useState<string[]>(team.activatedApps);

  // State quản lý tasks & feed posts cục bộ để cập nhật trực quan khi click đổi trạng thái
  const [tasks, setTasks] = useState<FeedPost[]>(initialTasks);
  const [localFeedPosts, setLocalFeedPosts] = useState<FeedPost[]>(feedPosts);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [showFullLog, setShowFullLog] = useState(false);
  
  // State modal xác nhận xóa
  const [deactivateAppModal, setDeactivateAppModal] = useState<{ isOpen: boolean, appId: string, appName: string } | null>(null);

  // Đồng bộ lại tasks, feedPosts và apps khi props thay đổi
  useEffect(() => {
    setTasks(initialTasks);
    setLocalFeedPosts(feedPosts);
    setActivatedApps(team.activatedApps);
    if (team.id) {
      setActiveTeamCookie(team.id.toString());
    }
  }, [initialTasks, feedPosts, team.id, team.activatedApps]);

  const executeDeactivateApp = async (appId: string, appName: string) => {
    if (!isOwner) {
      showToast('Chỉ Chủ sở hữu mới có quyền xóa ứng dụng này.', 'error');
      return;
    }

    // Tạm thời xóa trên UI để tạo cảm giác phản hồi nhanh (Optimistic update)
    setActivatedApps(prev => prev.filter(id => id !== appId));
    setDeactivateAppModal(null);

    try {
      const res = await deactivateAppAction({ teamId: team.id, appId });
      if (res.error) {
        // Revert lại nếu lỗi
        setActivatedApps(team.activatedApps);
        showToast(res.error, 'error');
      } else {
        showToast(`Đã xóa ứng dụng ${appName} thành công!`, 'success');
        // Phát event reload sidebar/store và revalidate
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('teams-updated'));
        }
        router.refresh(); // Sync server state
      }
    } catch (err) {
      console.error(err);
      setActivatedApps(team.activatedApps);
      showToast('Có lỗi bất ngờ xảy ra khi xóa ứng dụng.', 'error');
    }
  };

  // Keyboard accessibility for confirm modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deactivateAppModal) {
        setDeactivateAppModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deactivateAppModal]);

  // --- LOGIC TÍNH TOÁN (useMemo) ---
  const pendingTasks = useMemo(() => tasks.filter(t => t.taskStatus === 'pending').length, [tasks]);
  const inProgressTasks = useMemo(() => tasks.filter(t => t.taskStatus === 'in_progress').length, [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.taskStatus === 'completed').length, [tasks]);
  const totalTasks = useMemo(() => tasks.length, [tasks]);

  // AI usage stats (Đặt về 0, hiển thị "Chưa có dữ liệu" theo Option 1 của User)
  const aiUsage = 0;
  const aiLimit = 0;
  const aiUsed = 0;

  // Biểu đồ 7 ngày rỗng
  const chartData = [0, 0, 0, 0, 0, 0, 0];

  // Lọc tasks theo bộ lọc
  const filteredTasks = useMemo(() => {
    if (taskFilter === 'all') return tasks;
    return tasks.filter(t => t.taskStatus === taskFilter);
  }, [tasks, taskFilter]);

  const visibleActivities = showFullLog ? activities : activities.slice(0, 3);
  const PlanIcon = PLAN_ICON[team.plan] || Sparkles;

  // Hàm chuyển đổi trạng thái task sử dụng Server Action thật
  const handleToggleStatus = async (taskId: number) => {
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    let nextStatus: 'pending' | 'in_progress' | 'completed' = 'pending';
    if (currentTask.taskStatus === 'pending') nextStatus = 'in_progress';
    else if (currentTask.taskStatus === 'in_progress') nextStatus = 'completed';
    else nextStatus = 'pending';

    const statusLabel = 
      nextStatus === 'pending' ? 'Chờ làm' :
      nextStatus === 'in_progress' ? 'Đang làm' : 'Hoàn thành';

    // Cập nhật UI trước đồng loạt cho cả 2 modules
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, taskStatus: nextStatus } : t))
    );
    setLocalFeedPosts(prev => 
      prev.map(t => (t.id === taskId ? { ...t, taskStatus: nextStatus } : t))
    );

    // Gọi server action
    const res = await changeTaskStatusAction({ postId: taskId, status: nextStatus });
    if (res.error) {
      // Revert lại nếu lỗi
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, taskStatus: currentTask.taskStatus } : t))
      );
      setLocalFeedPosts(prev => 
        prev.map(t => (t.id === taskId ? { ...t, taskStatus: currentTask.taskStatus } : t))
      );
      showToast(res.error, 'error');
    } else {
      showToast(`Đã chuyển công việc sang "${statusLabel}"!`, 'success');
      router.refresh(); // Sync server state (log timeline, etc)
    }
  };

  return (
    <section className="flex-1 p-0 space-y-0 animate-fade-in pb-10">
      {/* Banner / Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-b border-white/5 p-6 lg:p-8 space-y-6">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-44 w-44 rounded-full bg-gradient-to-tr from-orange-500 to-pink-500 blur-3xl opacity-20 pointer-events-none" />
        
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-3 w-3" />
          <span>Quay lại Bảng điều khiển</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="text-5xl select-none leading-none shrink-0">{team.avatar}</span>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-none">
                  {team.name}
                </h1>
                <div className={`flex items-center gap-0.5 text-[9px] px-2 py-0.5 rounded-full border uppercase font-mono tracking-wider ${getPlanBadgeClass(team.plan)}`}>
                  <PlanIcon className="h-2.5 w-2.5 shrink-0" />
                  <span>{getPlanLabel(team.plan)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                {team.members.length} thành viên · Kích hoạt {team.activatedApps.length} ứng dụng · Tạo ngày {team.createdAt}
              </p>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap gap-2.5">
            <Link 
              href="/dashboard/members"
              className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Mời thành viên</span>
            </Link>
            <Link 
              href="/dashboard/store"
              className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Store className="h-3.5 w-3.5" />
              <span>Cài ứng dụng</span>
            </Link>
            <Link 
              href="/dashboard/settings"
              className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Cài đặt không gian</span>
            </Link>
          </div>
        </div>
      </div>

      {/* --- MODULE 2 & 3: STATS CARDS & PROGRESS BAR --- */}
      <div className="p-6 lg:px-10 lg:pt-8 lg:pb-0 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: AI Usage */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/10 flex items-center justify-center shrink-0">
              <Cpu className="h-5 w-5 text-orange-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Lượt dùng AI</p>
              <p className="text-xs font-semibold text-gray-400 mt-1">
                Chưa có dữ liệu
              </p>
            </div>
          </div>

          {/* Card 2: Active Apps */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-yellow-500/10 border border-yellow-500/10 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Ứng dụng hoạt động</p>
              <p className="text-sm font-black text-white mt-0.5">
                {team.activatedApps.length} <span className="text-[10px] text-gray-400 font-semibold">/ {APPS.length} apps</span>
              </p>
            </div>
          </div>

          {/* Card 3: Members */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Thành viên nhóm</p>
              <p className="text-sm font-black text-white mt-0.5">
                {team.members.length} <span className="text-[10px] text-gray-400 font-semibold">nhân sự</span>
              </p>
            </div>
          </div>

          {/* Card 4: Task Progress */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 border border-green-500/10 flex items-center justify-center shrink-0">
              <CheckSquare className="h-5 w-5 text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Tiến độ công việc</p>
              <p className="text-sm font-black text-white mt-0.5">
                {completedTasks} <span className="text-[10px] text-gray-400 font-semibold">/ {totalTasks} hoàn thành</span>
              </p>
            </div>
          </div>
        </div>

        {/* AI Progress Bar */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 space-y-3.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-orange-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Hạn mức tài nguyên AI tháng này</span>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
              Chưa kết nối dữ liệu
            </span>
          </div>
          <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500 opacity-20"
              style={{ width: '0%' }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold">
            <span>Đã sử dụng: <strong className="text-gray-300">0</strong> / 0 lượt</span>
            <span className="text-gray-500 italic">Kích hoạt & sử dụng ứng dụng AI để bắt đầu theo dõi tài nguyên</span>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- CỘT TRÁI (2/3): QUICK LAUNCH GRID + TASK BOARD + FEED RIÊNG NHÓM --- */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* MODULE 4: Quick Launch Grid */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 lg:p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span>Khởi chạy ứng dụng nhanh</span>
              </h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-gray-400">
                {activatedApps.length} đã cài
              </span>
            </div>

            {activatedApps.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-white/10 rounded-xl space-y-3">
                <p className="text-xs text-gray-500 italic">Chưa có ứng dụng nào được kích hoạt trong không gian này.</p>
                <Link 
                  href="/dashboard/store" 
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 hover:opacity-90 transition-all shadow-md cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Kích hoạt app đầu tiên</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activatedApps.map((appId) => {
                  const app = getAppById(appId);
                  if (!app) return null;
                  const AppIcon = APP_ICON_MAP[app.icon] || Sparkles;
                  return (
                    <div key={appId} className="relative group">
                      <Link
                        href={app.path}
                        className="block overflow-hidden bg-white/[0.02] border border-white/5 rounded-xl p-4 transition-all hover:bg-white/[0.04] hover:border-white/10 hover:shadow-lg flex flex-col justify-between h-32"
                      >
                        <div className="absolute top-3 right-3 text-gray-600 group-hover:text-orange-400 transition-colors">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </div>

                        <div className="space-y-2">
                          <div className={`h-8 w-8 rounded-lg bg-gradient-to-tr ${app.color || 'from-orange-500 to-pink-500'} p-0.5 flex items-center justify-center`}>
                            <div className="h-full w-full bg-gray-950 rounded-[7px] flex items-center justify-center">
                              <AppIcon className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          <h4 className="text-xs font-extrabold text-white group-hover:text-orange-400 transition-colors truncate">
                            {app.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-gray-500 line-clamp-2 mt-1 leading-snug">
                          {app.description}
                        </p>
                      </Link>

                      {/* Nút ba chấm/Xóa nhanh chỉ hiển thị với Owner */}
                      {isOwner && (
                        <div className="absolute top-3 right-9 z-20">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeactivateAppModal({ isOpen: true, appId, appName: app.name });
                            }}
                            className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/5 transition-all cursor-pointer"
                            title="Xóa ứng dụng"
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* MODULE 5: Task Board Kanban compact */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 lg:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <ListTodo className="h-4.5 w-4.5 text-orange-400" />
                <span>📋 Nhiệm vụ công việc</span>
              </h3>
              
              {/* Bộ lọc trạng thái */}
              <div className="flex flex-wrap items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                {[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'pending', label: 'Chờ làm' },
                  { value: 'in_progress', label: 'Đang làm' },
                  { value: 'completed', label: 'Xong' },
                ].map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() => setTaskFilter(btn.value as any)}
                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      taskFilter === btn.value
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-white/10 rounded-xl">
                <p className="text-xs text-gray-500 italic">Không tìm thấy công việc nào phù hợp.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((t) => {
                  let statusBadge = '';
                  let statusText = '';
                  if (t.taskStatus === 'pending') {
                    statusBadge = 'bg-gray-800 text-gray-400 border-gray-700';
                    statusText = 'Chờ làm';
                  } else if (t.taskStatus === 'in_progress') {
                    statusBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                    statusText = 'Đang làm';
                  } else if (t.taskStatus === 'completed') {
                    statusBadge = 'bg-green-500/10 text-green-400 border-green-500/20';
                    statusText = 'Đã xong';
                  }

                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] hover:border-white/10 rounded-xl transition-all gap-3 group">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <h4 className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors truncate">
                          {t.taskTitle}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500 font-semibold">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>Giao cho: <span className="text-gray-300 font-bold">{t.taskAssignee}</span></span>
                          </span>
                          {t.taskDueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Hạn: <span className="text-gray-400">{t.taskDueDate}</span></span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status Badge */}
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider ${statusBadge}`}>
                          {statusText}
                        </span>
                        
                        {/* Toggle Status Button */}
                        <button
                          onClick={() => handleToggleStatus(t.id)}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/15 transition-all cursor-pointer"
                          title="Thay đổi trạng thái"
                          aria-label="Đổi trạng thái"
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* MODULE 7: Feed riêng nhóm */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 lg:p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-orange-400" />
                <span>Bảng tin nhóm</span>
              </h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-gray-400">
                {feedPosts.length} bài đăng
              </span>
            </div>

            {localFeedPosts.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-white/10 rounded-xl">
                <p className="text-xs text-gray-500 italic">Chưa có bài đăng nào trên bảng tin của nhóm này.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {localFeedPosts.slice(0, 5).map((post) => (
                  <Link
                    key={post.id}
                    href={`/dashboard/home#post-${post.id}`}
                    className="block p-4 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] hover:border-white/10 rounded-2xl transition-all space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-sm">
                          {post.userAvatar}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">{post.userName}</p>
                          <p className="text-[9px] text-gray-500 font-semibold">{post.timestamp}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {post.pinned && (
                          <span className="h-5 px-1.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[8px] font-black uppercase flex items-center gap-0.5">
                            <Pin className="h-2 w-2" />
                            <span>Ghim</span>
                          </span>
                        )}
                        <span className="h-5 px-1.5 rounded bg-white/5 border border-white/5 text-gray-400 text-[8px] font-black uppercase flex items-center">
                          {post.type === 'mvp_result' ? 'Kết quả MVP' : post.type === 'task_assignment' ? 'Công việc' : 'Hoạt động'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed group-hover:text-gray-200 transition-colors">
                      {post.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold pt-1 border-t border-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5 text-gray-500" />
                          <span>{post.likes}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5 text-gray-500" />
                          <span>{post.comments?.length || 0}</span>
                        </span>
                      </div>
                      <span className="text-orange-400 flex items-center gap-0.5 hover:underline group-hover:translate-x-0.5 transition-transform">
                        <span>Chi tiết</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                ))}

                <div className="pt-2">
                  <Link 
                    href="/dashboard/home" 
                    className="w-full py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-xs font-semibold rounded-xl flex items-center justify-center gap-1"
                  >
                    <span>Xem tất cả trên Bảng tin</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* --- CỘT PHẢI (1/3): CHART + TIMELINE LOG + MEMBERS PANEL --- */}
        <div className="space-y-8">
          
          {/* MODULE 6: Biểu đồ tăng trưởng Pure CSS Bar Chart */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-orange-400" />
                <span>Lượt dùng AI (7 ngày)</span>
              </h3>
              <TrendingUp className="h-3.5 w-3.5 text-green-400" />
            </div>

            <div className="relative h-36">
              {/* Premium Glassmorphism Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 z-10 bg-gray-950/20 backdrop-blur-[1px]">
                <Cpu className="h-5 w-5 text-gray-500 mb-1.5 animate-pulse" />
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Chưa có dữ liệu</span>
                <span className="text-[9px] text-gray-600 font-medium mt-0.5">Sử dụng ứng dụng AI để hiển thị hoạt động</span>
              </div>
              <div className="h-full flex items-end justify-between pt-4 px-1 gap-2 opacity-25 select-none pointer-events-none">
                {chartData.map((val, idx) => {
                  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
                  const heightPercent = 10; // Giữ chiều cao giả định mờ mờ 10% để frame đẹp mắt
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <div className="relative w-full flex justify-center items-end h-full">
                        <div 
                          className="w-3 md:w-4 rounded-t bg-white/10"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-gray-700 font-bold">{days[idx]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* MODULE 7 (Phần A): Timeline Activity Log thu gọn */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-orange-400" />
                <span>Hoạt động của nhóm</span>
              </h3>
              <span className="text-[10px] font-black bg-white/5 border border-white/5 text-gray-300 px-2 py-0.5 rounded-full">
                {activities.length}
              </span>
            </div>

            {activities.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-gray-500 italic">Chưa ghi nhận hoạt động nào.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative border-l border-white/5 ml-2.5 pl-4 space-y-4 py-1">
                  {visibleActivities.map((act) => {
                    const app = act.appId ? getAppById(act.appId) : undefined;
                    return (
                      <div key={act.id} className="relative flex items-start gap-2 text-xs">
                        {/* timeline bullet */}
                        <div className="absolute -left-[21px] top-1.5 h-1.5 w-1.5 rounded-full bg-orange-500" />
                        
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className="text-gray-300 leading-snug">
                            <strong className="text-white mr-1">{act.userName}</strong>
                            {act.message}
                          </p>
                          <p className="text-[9px] text-gray-500 font-semibold">{act.timestamp}</p>
                        </div>
                        {app && (
                          <span className="text-[8px] font-extrabold uppercase px-1 rounded border border-orange-500/20 bg-orange-500/5 text-orange-400 shrink-0">
                            {app.name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {activities.length > 3 && (
                  <button
                    onClick={() => setShowFullLog(!showFullLog)}
                    className="w-full py-1.5 flex items-center justify-center gap-1 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/5 border border-white/5 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>{showFullLog ? 'Thu gọn hoạt động' : 'Xem tất cả hoạt động'}</span>
                    {showFullLog ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Members Panel */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Thành viên ({team.members.length})</h3>
            </div>

            <div className="space-y-3">
              {team.members.slice(0, 5).map((m) => {
                const initial = m.name.charAt(0).toUpperCase();
                const roleDef = getRoleByKey(m.role as any);
                return (
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-gray-700 to-gray-800 flex items-center justify-center text-[9px] font-extrabold text-white uppercase shrink-0">
                        {initial}
                      </div>
                      <span className="text-xs text-gray-300 truncate max-w-[120px]" title={m.name}>{m.name}</span>
                    </div>
                    
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider bg-gray-800 text-gray-400 border-gray-700">
                      {roleDef.label}
                    </span>
                  </div>
                );
              })}
              
              <div className="pt-2">
                <Link 
                  href="/dashboard/members"
                  className="w-full py-2 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Xem tất cả thành viên</span>
                </Link>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL HỦY KÍCH HOẠT ỨNG DỤNG */}
      {deactivateAppModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md animate-fade-in"
          onMouseDown={() => setDeactivateAppModal(null)}
        >
          <div 
            className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="p-6 text-center space-y-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-500/10 pointer-events-none" />
              <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-full mx-auto flex items-center justify-center relative">
                <Store className="h-8 w-8" />
                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-gray-900 rounded-full flex items-center justify-center border-2 border-gray-900">
                  <div className="h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">!</div>
                </div>
              </div>
              <div className="space-y-1 relative">
                <h3 className="text-lg font-bold text-white">Xác nhận xóa ứng dụng</h3>
                <p className="text-xs text-gray-400 leading-relaxed max-w-[260px] mx-auto">
                  Bạn có chắc chắn muốn xóa <span className="font-bold text-white">{deactivateAppModal.appName}</span> khỏi không gian làm việc này? Mọi dữ liệu liên kết sẽ bị hủy bỏ.
                </p>
              </div>
            </div>
            
            {/* Footer Modal */}
            <div className="p-4 bg-gray-950/50 border-t border-white/5 flex items-center justify-between gap-3">
              <button
                onClick={() => setDeactivateAppModal(null)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => executeDeactivateApp(deactivateAppModal.appId, deactivateAppModal.appName)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-xl transition-all shadow-[0_0_15px_-3px_rgba(239,68,68,0.4)] cursor-pointer"
              >
                Đồng ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
