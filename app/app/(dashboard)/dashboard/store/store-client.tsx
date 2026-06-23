'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { APPS, AppDefinition } from '@/lib/apps-registry';
import { getPlanLabel, getPlanBadgeClass } from '@/lib/shared-constants';
import {
  Sparkles, Search, MessageSquare, Brain, ShoppingCart,
  FileText, LayoutGrid, Check, Plus, AlertCircle, ArrowRight,
  Info, Flame, Trash2, X, Eye
} from 'lucide-react';
import { APP_ICON_MAP } from '@/lib/shared-constants';
import { activateAppAction, deactivateAppAction } from '@/app/(login)/actions';
import { enablePreviewModeAction } from '@/lib/preview-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import React, { useEffect, useRef, useTransition } from 'react';

const CATEGORY_INFO = {
  all: { label: 'Tất cả ứng dụng', emoji: '✨', icon: LayoutGrid },
  ai: { label: 'AI & Tự động', emoji: '🤖', icon: Brain },
  management: { label: 'Quản trị & Vận hành', emoji: '🏪', icon: ShoppingCart },
  communication: { label: 'Giao tiếp & Social', emoji: '📡', icon: MessageSquare },
  analytics: { label: 'Phân tích & Báo cáo', emoji: '📊', icon: FileText },
};

const SimManagerMockup = () => {
  return (
    <div className="w-full bg-slate-950/60 rounded-2xl p-5 border border-white/5 backdrop-blur-md relative overflow-hidden font-sans select-none">
      {/* Background radial glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
      
      {/* Header bar of mock dashboard */}
      <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4 text-[10px] text-gray-500 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 font-bold uppercase tracking-wider">SIM ENGINE LIVE</span>
        </div>
        <div>v2.0.4 · Connection Secure</div>
      </div>

      {/* Mini metrics & state */}
      <div className="grid grid-cols-2 gap-4">
        {/* SIM status card */}
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3.5 space-y-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Trạng thái Thiết bị</div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300">📱 SIM #1 (Viettel)</span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300">📱 SIM #2 (VinaPhone)</span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
              </span>
            </div>
          </div>
        </div>

        {/* Security / OTP Log card */}
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Lịch sử OTP gần đây</div>
          <div className="space-y-1 text-[10px] font-mono text-gray-400">
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span>SIM #1 · Google Auth</span>
              <span className="text-orange-400 font-bold">192834</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span>SIM #2 · Facebook OTP</span>
              <span className="text-orange-400 font-bold">776512</span>
            </div>
            <div className="flex justify-between">
              <span>SIM #1 · Telegram Alert</span>
              <span className="text-emerald-400 font-semibold">Sent ✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Status Panel */}
      <div className="mt-4 flex items-center justify-between p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <span className="text-xs">🛡️</span>
          </div>
          <div>
            <div className="text-[10px] font-bold text-emerald-400 leading-none">Chỉ số rủi ro hệ thống</div>
            <div className="text-[9px] text-gray-400 mt-0.5">Mã hóa AES-256-CBC hoạt động</div>
          </div>
        </div>
        <span className="text-[10px] font-mono font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">AN TOÀN</span>
      </div>
    </div>
  );
};

interface StoreClientProps {
  user: any;
  teams: any[];
  billingPlans?: any[];
}

export function StoreClient({ user, teams: initialTeams, billingPlans = [] }: StoreClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof CATEGORY_INFO>('all');
  const [teams, setTeams] = useState(initialTeams);
  const router = useRouter();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppDefinition | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number>(initialTeams[0]?.id || 0);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [isPlanLimitError, setIsPlanLimitError] = useState(false);
  const [pending, setPending] = useState(false);
  const [isPendingPreview, startTransition] = useTransition();
  const modalRef = useRef<HTMLDivElement>(null);
  const [deactivatingApp, setDeactivatingApp] = useState<{ teamId: number; appId: string; appName: string } | null>(null);

  const handlePreviewApp = () => {
    if (!selectedApp || !selectedTeamId) return;
    startTransition(() => {
      enablePreviewModeAction(selectedApp.id, selectedTeamId);
    });
  };

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  useEffect(() => {
    if (!deactivatingApp) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDeactivatingApp(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deactivatingApp]);

  // Filter apps
  const filteredApps = APPS.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Featured Apps (First 3 apps as featured)
  const featuredApps = APPS.slice(0, 3);

  const handleOpenActivationModal = (app: AppDefinition) => {
    setSelectedApp(app);
    setActivationSuccess(null);
    setActivationError(null);
    setIsPlanLimitError(false);
    setIsModalOpen(true);
  };

  const handleActivateApp = async () => {
    if (!selectedApp || !selectedTeamId) return;
    
    const team = teams.find(t => t.id === selectedTeamId);
    if (!team) return;

    // Check if the app is already activated in this workspace
    const currentApps = (Array.isArray(team.activatedApps) ? team.activatedApps : []) as string[];
    if (currentApps.includes(selectedApp.id)) {
      setActivationError(
        `Ứng dụng ${selectedApp.name} đã được kích hoạt trong không gian làm việc ${team.name} từ trước.`
      );
      setIsPlanLimitError(false); // Cảnh báo trùng lặp, không phải lỗi plan
      return;
    }

    setPending(true);
    setActivationError(null);
    setIsPlanLimitError(false);

    // Check plan limits
    const planConfig = (billingPlans || []).find(
      (p) => p.name?.toLowerCase() === (team.planName || 'free').toLowerCase()
    );

    if (planConfig && !planConfig.allowedApps.includes(selectedApp.id)) {
      setActivationError(
        `Ứng dụng ${selectedApp.name} không khả dụng cho gói ${getPlanLabel(team.planName || 'free')} của nhóm ${team.name}. Vui lòng nâng cấp gói cước để kích hoạt ứng dụng này.`
      );
      setIsPlanLimitError(true); // Lỗi plan thực sự
      setPending(false);
      return;
    }

    try {
      const res = await activateAppAction({ teamId: selectedTeamId, appId: selectedApp.id });
      if (res.error) {
        setActivationError(res.error);
      } else {
        showToast(`Đã kích hoạt ứng dụng ${selectedApp.name} thành công!`, 'success');
        
        // Update local state
        setTeams(prevTeams => 
          prevTeams.map(t => {
            if (t.id === selectedTeamId) {
              const currentApps = (Array.isArray(t.activatedApps) ? t.activatedApps : []) as string[];
              return {
                ...t,
                activatedApps: currentApps.includes(selectedApp.id) ? currentApps : [...currentApps, selectedApp.id]
              };
            }
            return t;
          })
        );

        setActivationSuccess(`Kích hoạt thành công! Ứng dụng ${selectedApp.name} đã được thêm vào nhóm ${team.name}. Menu của nhóm sẽ tự động cập nhật.`);
        
        // Refresh sidebar and layouts
        router.refresh();

        setTimeout(() => {
          setIsModalOpen(false);
          setActivationSuccess(null);
        }, 2500);
      }
    } catch (err) {
      setActivationError('Đã xảy ra lỗi không xác định.');
    } finally {
      setPending(false);
    }
  };

  const handleDeactivateApp = async () => {
    if (!deactivatingApp) return;
    const { teamId, appId, appName } = deactivatingApp;

    try {
      const res = await deactivateAppAction({ teamId, appId });
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(`Đã hủy kích hoạt ứng dụng ${appName} thành công!`, 'success');

        // Update local state
        setTeams(prevTeams => 
          prevTeams.map(t => {
            if (t.id === teamId) {
              const currentApps = (Array.isArray(t.activatedApps) ? t.activatedApps : []) as string[];
              return {
                ...t,
                activatedApps: currentApps.filter(id => id !== appId)
              };
            }
            return t;
          })
        );

        router.refresh();
      }
    } catch (err) {
      showToast('Đã xảy ra lỗi khi hủy kích hoạt.', 'error');
    } finally {
      setDeactivatingApp(null);
    }
  };

  const adminOrOwnerTeams = teams.filter(t => t.role === 'owner' || t.role === 'admin');

  return (
    <div className="space-y-8 pb-16 animate-fade-up px-6 lg:px-10">
      
      {/* 1. Header & Search Bar Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-950 to-purple-950/20 border border-white/5 rounded-3xl p-8 lg:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-6 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-orange-400 font-medium font-mono">
            <Sparkles className="h-3 w-3 animate-pulse" />
            <span>KHO ỨNG DỤNG HỆ THỐNG</span>
          </div>
          
          <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Nâng tầm hiệu suất với{' '}
            <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              AI MVP Store
            </span>
          </h1>
          
          <p className="text-gray-400 text-sm lg:text-base leading-relaxed">
            Khám phá, trải nghiệm và kích hoạt hàng loạt các công cụ MVP siêu tốc miễn phí. Đưa trực tiếp ứng dụng vào nhóm làm việc của bạn chỉ với một cú click chuột.
          </p>

          {/* Search box */}
          <div className="relative flex items-center bg-white/5 border border-white/10 focus-within:border-orange-500/50 rounded-2xl p-1.5 transition-all duration-300 max-w-lg shadow-inner">
            <Search className="h-5 w-5 text-gray-500 ml-3.5 shrink-0" />
            <input
              type="text"
              placeholder="Tìm kiếm trợ lý AI, POS, SIM hay các công cụ khác..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-0 outline-none text-white text-sm w-full py-2 px-3 placeholder-gray-500 focus:ring-0 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. Category Navigation Pills */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-[#030712] to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[#030712] to-transparent pointer-events-none z-10" />
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 px-2 scrollbar-none border-b border-white/10">
          {(Object.keys(CATEGORY_INFO) as Array<keyof typeof CATEGORY_INFO>).map((catKey) => {
            const info = CATEGORY_INFO[catKey];
            const isSelected = selectedCategory === catKey;
            
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                  isSelected
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/20 font-bold scale-[1.02]'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                }`}
              >
                <span>{info.emoji}</span>
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Featured Section */}
      {searchQuery === '' && selectedCategory === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500 animate-bounce" />
              <span>Ứng dụng nổi bật được khuyên dùng</span>
            </h2>
            <span className="text-xs text-gray-500 font-medium">Cập nhật liên tục</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredApps.map((app) => {
              const AppIcon = APP_ICON_MAP[app.icon] || LayoutGrid;
              const socialCount = app.id === 'chat' ? 42 : app.id === 'hub' ? 28 : 19;
              
              return (
                <div
                  key={app.id}
                  onClick={() => handleOpenActivationModal(app)}
                  className="group relative overflow-hidden bg-gradient-to-b from-gray-900 via-gray-950 to-gray-950 border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-orange-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 hover:-translate-y-1 cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent pointer-events-none" />
                  
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className={`h-12 w-12 rounded-xl bg-gradient-to-tr ${app.color} p-0.5 shadow-lg shadow-orange-500/10`}>
                        <div className="h-full w-full rounded-[10px] bg-gray-950 flex items-center justify-center">
                          <AppIcon className="h-6 w-6 text-white group-hover:scale-110 transition-transform duration-300" />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20 leading-none">
                          {app.status === 'coming_soon' ? 'Coming Soon' : app.status}
                        </span>
                        <span className="text-[9px] text-gray-500 font-medium">
                          {socialCount} team đang sử dụng
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mt-5 space-y-2">
                      <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">
                        {app.name}
                      </h3>
                      <p className="text-gray-400 text-xs leading-relaxed min-h-[50px]">
                        {app.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Miễn phí trọn đời</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenActivationModal(app); }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-gray-950 hover:bg-orange-500 hover:text-white transition-all duration-300 shadow-md cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Thêm vào Team</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Categorized Apps / Grid Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-gray-500" />
            <span>
              {selectedCategory === 'all' ? 'Tất cả công cụ MVP sẵn có' : CATEGORY_INFO[selectedCategory].label}
            </span>
          </h2>
          <span className="text-xs text-gray-400 font-mono font-bold bg-white/5 px-2.5 py-1 rounded-lg">
            {filteredApps.length} ứng dụng
          </span>
        </div>

        {filteredApps.length === 0 ? (
          <div className="text-center py-12 bg-gray-900/50 rounded-2xl border border-white/10 space-y-3">
            <AlertCircle className="h-10 w-10 text-gray-400 mx-auto" />
            <p className="text-gray-300 font-semibold text-sm">Không tìm thấy ứng dụng phù hợp</p>
            <p className="text-gray-500 text-xs">Vui lòng thử từ khóa khác hoặc xóa bộ lọc category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map((app) => {
              const AppIcon = APP_ICON_MAP[app.icon] || LayoutGrid;
              
              return (
                <div
                  key={app.id}
                  onClick={() => handleOpenActivationModal(app)}
                  className="group bg-gray-900/50 hover:bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 hover:border-orange-500/20 hover:-translate-y-1 cursor-pointer"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className={`h-11 w-11 rounded-xl bg-gradient-to-tr ${app.color} p-0.5`}>
                        <div className="h-full w-full rounded-[9px] bg-gray-950 flex items-center justify-center">
                          <AppIcon className="h-[22px] w-[22px] text-white group-hover:scale-110 transition-transform duration-300" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-white/5 text-gray-400 leading-none">
                          {app.status === 'coming_soon' ? 'Chưa ra mắt' : app.status}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 leading-none">
                          FREE
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mt-4 space-y-1.5">
                      <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors">
                        {app.name}
                      </h3>
                      <p className="text-gray-400 text-xs leading-relaxed min-h-[40px]">
                        {app.description}
                      </p>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="mt-5 pt-3.5 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-medium">Nhóm: {CATEGORY_INFO[app.category].label}</span>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenActivationModal(app); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-orange-500 text-white transition-all duration-300 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Thêm vào Team</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activated Apps Summary (Management Section for Deactivation) */}
      <div className="mt-12 space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Check className="h-5 w-5 text-emerald-500" />
          <span>Quản lý ứng dụng đã cài đặt</span>
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teams.map((team) => {
            const teamApps = Array.isArray(team.activatedApps) ? team.activatedApps : [];
            return (
              <div key={team.id} className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{team.avatar || '💼'}</span>
                    <div>
                      <h3 className="font-extrabold text-white text-sm">{team.name}</h3>
                      <span className="text-[10px] text-gray-500 font-mono uppercase">{getPlanLabel(team.planName || 'free')}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{teamApps.length} đã kích hoạt</span>
                </div>

                {teamApps.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-2">Chưa kích hoạt ứng dụng nào trong không gian này.</p>
                ) : (
                  <div className="space-y-2">
                    {teamApps.map((appId: string) => {
                      const app = APPS.find(a => a.id === appId);
                      if (!app) return null;
                      const AppIcon = APP_ICON_MAP[app.icon] || LayoutGrid;

                      return (
                        <div key={appId} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg bg-gradient-to-tr ${app.color} p-0.5`}>
                              <div className="h-full w-full rounded-[7px] bg-gray-950 flex items-center justify-center">
                                <AppIcon className="h-4 w-4 text-white" />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{app.name}</p>
                              <p className="text-[10px] text-gray-400">{CATEGORY_INFO[app.category].label}</p>
                            </div>
                          </div>

                          {/* Only Team Owner can deactivate */}
                          {team.role === 'owner' && (
                            <button
                              onClick={() => setDeactivatingApp({ teamId: team.id, appId, appName: app.name })}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Hủy kích hoạt"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. App Detail Landing Popup & Activation Modal */}
      {isModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) setIsModalOpen(false); }}>
          <div 
            ref={modalRef}
            className="relative bg-gray-950 border border-white/10 rounded-3xl w-full max-w-2xl overflow-y-auto max-h-[90vh] shadow-2xl z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Gradient Top Bar */}
            <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${selectedApp.color}`} />
            
            {/* Close Button */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-20 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Body */}
            <div className="p-6 lg:p-8 space-y-6">
              
              {/* Mockup Section */}
              {selectedApp.id === 'sim' && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Bản xem trước giao diện MVP</div>
                  <SimManagerMockup />
                </div>
              )}

              {/* App Meta Header */}
              <div className="flex items-start gap-4">
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-tr ${selectedApp.color} p-0.5 shrink-0 shadow-lg shadow-orange-500/10`}>
                  <div className="h-full w-full rounded-[14px] bg-gray-950 flex items-center justify-center">
                    {(() => {
                      const Icon = APP_ICON_MAP[selectedApp.icon] || LayoutGrid;
                      return <Icon className="h-7 w-7 text-white" />;
                    })()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white leading-none">{selectedApp.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20 leading-none">
                      {selectedApp.status === 'coming_soon' ? 'BETA' : selectedApp.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 leading-none">
                      FREE
                    </span>
                  </div>
                  <p className="text-xs text-orange-400/90 font-medium italic mt-1 leading-normal">
                    "{selectedApp.slogan || selectedApp.description}"
                  </p>
                </div>
              </div>

              {/* Long Description */}
              <p className="text-gray-300 text-xs leading-relaxed">
                {selectedApp.longDesc || selectedApp.description}
              </p>

              {/* Detailed Specs (Features, Benefits, Target Users) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-white/5">
                {/* Column 1: Features */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                    <span>Tính năng nổi bật</span>
                  </h4>
                  <ul className="space-y-2 text-[11px] text-gray-400">
                    {(selectedApp.features || [selectedApp.description]).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Column 2: Benefits & Target Users */}
                <div className="space-y-5">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Info className="h-3.5 w-3.5 text-orange-400" />
                      <span>Lợi ích doanh nghiệp</span>
                    </h4>
                    <ul className="space-y-2 text-[11px] text-gray-400">
                      {(selectedApp.benefits || ['Giúp tăng hiệu suất công việc', 'Tối ưu quản trị thông tin']).map((ben, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{ben}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Đối tượng phù hợp</h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      {selectedApp.targetUsers || 'Phù hợp với mọi cá nhân và doanh nghiệp muốn tối ưu hóa quy trình làm việc.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Alert Success or Error */}
              {activationSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check className="h-5 w-5 shrink-0" />
                    <span className="text-xs font-bold">Kích hoạt ứng dụng thành công!</span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    {activationSuccess}
                  </p>
                </div>
              ) : activationError ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                    <span className="text-xs font-bold">
                      {isPlanLimitError ? 'Giới hạn gói dịch vụ' : 'Ứng dụng đã kích hoạt'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed text-left">
                    {activationError}
                  </p>
                  <div className="pt-1 flex gap-2">
                    <button
                      onClick={() => setActivationError(null)}
                      className={`px-3 py-2 rounded-lg text-[11px] font-bold border border-white/10 text-gray-300 hover:bg-white/5 transition-all text-center cursor-pointer ${
                        !isPlanLimitError ? 'w-full flex-grow' : 'flex-grow'
                      }`}
                    >
                      Quay lại
                    </button>
                    {isPlanLimitError && (
                      <a href="/pricing" className="flex-grow-[2]">
                        <button className="w-full px-3 py-2 rounded-lg text-[11px] font-bold bg-hero-gradient text-white hover:opacity-90 transition-all text-center flex items-center justify-center gap-1 shadow-md shadow-orange-500/10 cursor-pointer">
                          <span>Nâng cấp Pro ✨</span>
                        </button>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  {/* Select Team Dropdown & Action */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 lg:p-5 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
                      <div className="space-y-2 flex-grow w-full md:w-auto text-left">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Chọn không gian nhận ứng dụng</label>
                        {adminOrOwnerTeams.length === 0 ? (
                          <p className="text-xs text-red-400">Bạn cần quyền Chủ sở hữu hoặc Quản trị viên của ít nhất một không gian làm việc để kích hoạt ứng dụng.</p>
                        ) : (
                          <select
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                            className="w-full bg-gray-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          >
                            {adminOrOwnerTeams.map((team) => (
                              <option key={team.id} value={team.id} className="bg-gray-950 text-white text-xs">
                                {team.avatar || '💼'} {team.name} ({getPlanLabel(team.planName || 'free')})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0 justify-end">
                        <button
                          onClick={() => setIsModalOpen(false)}
                          disabled={pending || isPendingPreview}
                          className="px-4 py-3 rounded-xl text-xs font-bold border border-white/10 text-gray-300 hover:bg-white/5 transition-all text-center cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handlePreviewApp}
                          disabled={pending || isPendingPreview || adminOrOwnerTeams.length === 0}
                          className="px-4 py-3 rounded-xl text-xs font-bold border border-white/20 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>{isPendingPreview ? 'Đang mở...' : 'Xem thử'}</span>
                        </button>
                        <button
                          onClick={handleActivateApp}
                          disabled={pending || isPendingPreview || adminOrOwnerTeams.length === 0}
                          className="px-6 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:opacity-90 disabled:opacity-50 transition-all text-center flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10 cursor-pointer"
                        >
                          <span>{pending ? 'Đang kích hoạt...' : 'Kích hoạt ngay'}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 text-[10px] text-gray-500">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-orange-400" />
                      <p className="leading-relaxed">
                        Ứng dụng sẽ ngay lập tức được thêm vào Menu Sidebar trái của không gian làm việc sau khi kích hoạt.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deactivation Confirm Modal */}
      {deactivatingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) setDeactivatingApp(null); }}>
          <div 
            ref={modalRef}
            className="relative bg-gray-950 border border-white/10 rounded-2xl w-full max-w-sm p-6 overflow-hidden shadow-2xl z-10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 to-orange-500`} />
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Xác nhận</h3>
                </div>
              </div>
              <p className="text-sm text-gray-300">Bạn có chắc chắn muốn hủy kích hoạt ứng dụng <span className="font-bold text-orange-400">{deactivatingApp.appName}</span> khỏi nhóm này không?</p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setDeactivatingApp(null)}
                  disabled={pending}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-gray-300 hover:bg-white/5 transition-all text-center"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleDeactivateApp}
                  disabled={pending}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-500/80 hover:bg-red-500 text-white transition-all text-center"
                >
                  {pending ? 'Đang xử lý...' : 'Xác nhận hủy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
