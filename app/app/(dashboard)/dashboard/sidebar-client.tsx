'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid, Store, Home, Users, Settings, ChevronDown, ChevronRight,
  Plus, Sparkles
} from 'lucide-react';
import { getPlanLabel, getPlanBadgeClass } from '@/lib/shared-constants';
import { getAppById } from '@/lib/apps-registry';
import { APP_ICON_MAP, PLAN_ICON } from '@/lib/shared-constants';
import TopHeader from '@/components/top-header';
import { CreateWorkspaceModal } from './create-workspace-modal';
import { setActiveTeamCookie } from '@/lib/team-cookie';

const globalNav = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Bảng điều khiển' },
  { href: '/dashboard/store', icon: Store, label: 'Kho ứng dụng' },
  { href: '/dashboard/home', icon: Home, label: 'Trang chủ' },
];

interface SidebarClientProps {
  teams: any[];
  children: React.ReactNode;
}

export function SidebarClient({ teams: initialTeams, children }: SidebarClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [teams, setTeams] = useState(initialTeams);

  // Sync teams state with props changes (Server re-renders)
  useEffect(() => {
    setTeams(initialTeams);
  }, [initialTeams]);

  // Accordion state - default expand first team
  const [expandedTeams, setExpandedTeams] = useState<number[]>([initialTeams[0]?.id || 0]);

  const toggleTeam = (teamId: number) => {
    setExpandedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  return (
    <div className="dark flex flex-col min-h-screen w-full font-sans bg-gray-950 text-white">
      {/* Top Header dùng chung, sticky toàn cục hiển thị trên mọi kích thước màn hình */}
      <TopHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex flex-1 min-h-0">
        {/* Mobile Sidebar Overlay Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside
          className={`w-64 bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col justify-between ${
            isSidebarOpen ? 'block fixed inset-y-0 left-0 z-40' : 'hidden'
          } lg:flex lg:relative lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } border-r border-white/5 shrink-0`}
        >
          <nav className="flex-1 overflow-y-auto p-4 pt-5 space-y-4">
            {/* Tầng 1: Navigation Toàn cục */}
            <div className="space-y-1">
              {globalNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/20 font-semibold'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="h-4.5 w-4.5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Separator */}
            <div className="border-t border-white/5 my-2" />

            {/* Tầng 2: Không gian làm việc (Team Accordion) */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-3">
                Không gian làm việc
              </p>
              
              <div className="space-y-1.5">
                {teams.map((team) => {
                  const isExpanded = expandedTeams.includes(team.id);
                  const plan = team.planName || 'free';
                  const PlanIcon = PLAN_ICON[plan] || PLAN_ICON['free'];
                  const activatedApps = Array.isArray(team.activatedApps) ? team.activatedApps : [];
                  
                  return (
                    <div key={team.id} className="space-y-1 bg-white/[0.01] border border-white/[0.02] rounded-xl overflow-hidden p-1">
                      {/* Accordion Header — Tách thành 2 vùng click */}
                      <div className="flex items-center justify-between px-2 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-all">
                        {/* Vùng trái: Click → chuyển trang Workspace Dashboard */}
                        <Link
                          href={`/dashboard/t/${team.id}`}
                          prefetch={true}
                          onClick={() => {
                            setIsSidebarOpen(false);
                            setActiveTeamCookie(team.id);
                          }}
                          className="flex items-center gap-2 min-w-0 hover:text-white transition-colors flex-1"
                        >
                          <span className="text-base shrink-0 leading-none">{team.avatar || '💼'}</span>
                          <span className="font-semibold truncate text-gray-200 text-xs shrink-0 max-w-[100px]">{team.name}</span>
                          <div className={`flex items-center gap-0.5 text-[8px] px-1 py-0.5 rounded border uppercase font-mono ${getPlanBadgeClass(plan)}`}>
                            <PlanIcon className="h-2 w-2 shrink-0" />
                            <span>{getPlanLabel(plan)}</span>
                          </div>
                        </Link>
                        {/* Vùng phải: Click → toggle accordion menu con */}
                        <button
                          onClick={() => toggleTeam(team.id)}
                          className="p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                          aria-label={`${isExpanded ? 'Thu gọn' : 'Mở rộng'} menu ${team.name}`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                          )}
                        </button>
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="pl-3 pr-1 py-1 space-y-1 border-l border-white/5 ml-4 mt-0.5">
                          {/* Apps List */}
                          {activatedApps.length === 0 ? (
                            <div className="px-2 py-1.5 text-[10px] text-gray-500 italic">
                              Chưa có ứng dụng nào
                            </div>
                          ) : (
                            activatedApps.map((appId: string) => {
                              const app = getAppById(appId);
                              if (!app) return null;
                              const AppIcon = APP_ICON_MAP[app.icon] || LayoutGrid;
                              
                              return (
                                <Link
                                  key={appId}
                                  href={app.path}
                                  prefetch={true}
                                  onClick={() => {
                                    setIsSidebarOpen(false);
                                    setActiveTeamCookie(team.id);
                                  }}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                  <div className="h-5 w-5 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                                    <AppIcon className="h-3 w-3 text-gray-400" />
                                  </div>
                                  <span className="truncate">{app.name}</span>
                                </Link>
                              );
                            })
                          )}

                          {/* Thêm ứng dụng Link */}
                          <Link
                            href="/dashboard/store"
                            prefetch={true}
                            onClick={() => {
                              setIsSidebarOpen(false);
                              setActiveTeamCookie(team.id);
                            }}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/5 transition-all font-medium border border-dashed border-orange-500/10 hover:border-orange-500/25 mt-1"
                          >
                            <div className="h-5 w-5 rounded-md bg-orange-500/10 flex items-center justify-center shrink-0">
                              <Plus className="h-3 w-3 text-orange-400" />
                            </div>
                            <span>+ Thêm ứng dụng</span>
                          </Link>

                          {/* Shortcuts */}
                          <div className="h-[1px] bg-white/5 my-1" />
                          
                          <Link
                            href="/dashboard/members"
                            prefetch={true}
                            onClick={() => setIsSidebarOpen(false)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                          >
                            <Users className="h-3 w-3 text-gray-400" />
                            <span>Thành viên</span>
                          </Link>
                          <Link
                            href="/dashboard/settings"
                            prefetch={true}
                            onClick={() => setIsSidebarOpen(false)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                          >
                            <Settings className="h-3 w-3 text-gray-400" />
                            <span>Cài đặt nhóm</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-white/5 my-2" />

            {/* Tầng 3: Tạo không gian mới (Dash Board triggered Client Modal trigger) */}
            <div className="px-1 text-xs">
              <Link 
                href="/dashboard"
                prefetch={true}
                onClick={() => setIsSidebarOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 border border-dashed border-white/10 hover:border-white/20 transition-all text-left"
              >
                <Plus className="h-4 w-4 shrink-0 text-gray-500" />
                <span className="font-medium">Quản lý không gian</span>
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-950">{children}</main>
      </div>
    </div>
  );
}
