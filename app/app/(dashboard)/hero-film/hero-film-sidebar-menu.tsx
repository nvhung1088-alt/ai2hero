'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Film, Coins, AlertTriangle, Sparkles, Loader2, CheckCircle2, PlayCircle, PauseCircle } from 'lucide-react';
import { getAiTranslationProgressAction, batchTranslateTeamAiAction } from '@/lib/db/youtube-sync-actions';
import { getTeamAutoTranslateAction, toggleTeamAutoTranslateAction, resetTeamAiTranslationAction } from '@/lib/db/auto-translate';

interface SidebarMenuProps {
  teamId: number;
}

export default function HeroFilmSidebarMenu({ teamId }: SidebarMenuProps) {
  const pathname = usePathname();
  const [stats, setStats] = useState<{ total: number; processed: number; remaining: number } | null>(null);
  
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [recentlyDone, setRecentlyDone] = useState<{seriesTitle: string; summary: string}[]>([]);
  const [error, setError] = useState('');
  const [autoTranslate, setAutoTranslate] = useState(false);

  const fetchProgress = async () => {
    const res = await getAiTranslationProgressAction(teamId);
    if (res.success && res.total !== undefined) {
      setStats({ total: res.total, processed: res.processed || 0, remaining: res.remaining || 0 });
    }
  };

  useEffect(() => {
    fetchProgress();
    getTeamAutoTranslateAction(teamId).then(res => setAutoTranslate(res));
    const interval = setInterval(fetchProgress, 5000);
    return () => clearInterval(interval);
  }, [teamId]);

  const handleToggleAutoTranslate = async () => {
    const newValue = !autoTranslate;
    setAutoTranslate(newValue);
    await toggleTeamAutoTranslateAction(teamId, newValue);
  };

  const handleResetTranslation = async () => {
    if (confirm('Bạn có chắc chắn muốn Dịch lại toàn bộ dự án? Quá trình này sẽ dịch lại toàn bộ video chưa có nội dung hoặc cần chỉnh sửa lại!')) {
      await resetTeamAiTranslationAction(teamId);
      await fetchProgress();
    }
  };

  const toggleTranslation = async () => {
    if (isTranslating) {
      // Pause
      if (!isPaused) {
        isPausedRef.current = true;
        setIsPaused(true);
      } else {
        // Resume
        isPausedRef.current = false;
        setIsPaused(false);
        runTranslationLoop();
      }
    } else {
      // Start
      setIsTranslating(true);
      isPausedRef.current = false;
      setIsPaused(false);
      setRecentlyDone([]);
      setError('');
      runTranslationLoop();
    }
  };

  const runTranslationLoop = async () => {
    let keepGoing = true;
    try {
      while (keepGoing && !isPausedRef.current) {
        const res = await batchTranslateTeamAiAction(teamId);
        
        if (!res.success) {
          keepGoing = false;
          setError(res.error || 'Lỗi không xác định');
          break;
        }

        const countAdded = res.count || 0;
        if (countAdded > 0) {
          if (res.translatedTitles) {
            setRecentlyDone(prev => [...res.translatedTitles, ...prev].slice(0, 3)); // Giữ 3 cái gần nhất trên sidebar
          }
          await fetchProgress();
          if (res.remaining === 0) keepGoing = false;
        } else {
          keepGoing = false; // Hết video
        }
        
        if (isPausedRef.current) break;
      }
      
      if (!isPausedRef.current) {
        setTimeout(() => {
          setIsTranslating(false);
        }, 2000);
      }
    } catch (e: any) {
      setError(e.message);
      setIsTranslating(false);
    }
  };

  const menuItems = [
    {
      name: 'Tổng quan',
      href: `/hero-film/t/${teamId}/dashboard`,
      icon: BarChart2
    },
    {
      name: 'Quản lý phim',
      href: `/hero-film/t/${teamId}/series`,
      icon: Film
    },
    {
      name: 'Báo lỗi',
      href: `/hero-film/t/${teamId}/reports`,
      icon: AlertTriangle
    },
    {
      name: 'Doanh thu',
      href: `/hero-film/t/${teamId}/revenue`,
      icon: Coins
    }
  ];

  const percent = stats && stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider px-3 block mb-2">Trình phát Hero Film</span>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 border cursor-pointer select-none group ${
                isActive
                  ? 'bg-gradient-to-r from-rose-500/10 to-red-500/5 border-rose-500/20 text-rose-400 font-extrabold shadow-sm'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-tr from-rose-500 to-red-500 shadow-md shadow-rose-500/10 text-white'
                    : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-gray-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs transition-colors duration-200">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Widget Trạng Thái Dịch AI Ngầm */}
      {stats && stats.total > 0 && (
        <div className="mx-1 p-3 rounded-xl bg-gradient-to-b from-indigo-950/40 to-gray-900/60 border border-indigo-500/20 shadow-lg flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Dịch AI Dự Án</span>
            </div>
            
            {stats.remaining === 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Xong
                </span>
                <button 
                  onClick={handleResetTranslation}
                  className="text-[10px] text-gray-300 bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded border border-white/10 transition-colors"
                >
                  Dịch Lại
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={toggleTranslation}
                  className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                    isTranslating && !isPaused 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' 
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30'
                  }`}
                >
                  {isTranslating && !isPaused ? (
                     <><PauseCircle className="w-2.5 h-2.5" /> Dừng</>
                  ) : (
                     <><PlayCircle className="w-2.5 h-2.5" /> {isPaused ? 'Tiếp tục' : 'Bắt đầu'}</>
                  )}
                </button>
                {stats.processed > 0 && !isTranslating && (
                  <button 
                    onClick={handleResetTranslation}
                    className="text-[10px] text-gray-300 bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded border border-white/10 transition-colors"
                  >
                    Dịch Lại
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="w-full bg-gray-800/80 rounded-full h-2 overflow-hidden p-0.5 border border-white/5 relative">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-rose-500 h-full rounded-full transition-all duration-500 relative" 
              style={{ width: `${percent}%` }}
            >
              {isTranslating && !isPaused && <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-medium text-gray-400">
            <span>Đã dịch: <strong className="text-indigo-300">{stats.processed}</strong>/{stats.total}</span>
            <span className="flex items-center gap-1">
               {isTranslating && !isPaused && <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-400" />}
               <span className="text-indigo-400 font-bold">{percent}%</span>
            </span>
          </div>

          <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={autoTranslate}
              onChange={handleToggleAutoTranslate}
              className="w-3 h-3 rounded bg-gray-800 border-gray-600 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900 cursor-pointer"
            />
            <span className="text-[10px] text-gray-400 font-medium">Tự động dịch ngầm video mới</span>
          </label>
          
          {error && <div className="text-[9px] text-red-400 truncate">{error}</div>}

          {/* Recent translations mini-list */}
          {recentlyDone.length > 0 && (
            <div className="mt-1 pt-2 border-t border-white/5 flex flex-col gap-1.5">
              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Vừa xử lý:</div>
              {recentlyDone.map((item, idx) => (
                <div key={idx} className="flex gap-1.5 items-start bg-white/5 rounded p-1.5 border border-white/5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <div className="text-[9px] leading-tight flex-1 min-w-0">
                    <span className="text-gray-300 block truncate font-medium">{item.seriesTitle}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
