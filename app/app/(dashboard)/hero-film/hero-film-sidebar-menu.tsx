'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Film, Coins, AlertTriangle, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { getAiTranslationProgressAction } from '@/lib/db/youtube-sync-actions';

interface SidebarMenuProps {
  teamId: number;
}

export default function HeroFilmSidebarMenu({ teamId }: SidebarMenuProps) {
  const pathname = usePathname();
  const [stats, setStats] = useState<{ total: number; processed: number; remaining: number } | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      const res = await getAiTranslationProgressAction(teamId);
      if (res.success && res.total !== undefined) {
        setStats({ total: res.total, processed: res.processed || 0, remaining: res.remaining || 0 });
      }
    };

    fetchProgress();
    const interval = setInterval(fetchProgress, 5000);
    return () => clearInterval(interval);
  }, [teamId]);

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
        <div className="mx-1 p-3 rounded-xl bg-gradient-to-b from-indigo-950/40 to-gray-900/60 border border-indigo-500/20 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Dịch AI Dự Án</span>
            </div>
            {stats.remaining > 0 ? (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Đang chạy
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-2.5 h-2.5" /> Xong
              </span>
            )}
          </div>

          <div className="w-full bg-gray-800/80 rounded-full h-2 overflow-hidden p-0.5 border border-white/5">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-rose-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-medium text-gray-400">
            <span>Đã dịch: <strong className="text-indigo-300">{stats.processed}</strong>/{stats.total} video</span>
            <span className="text-indigo-400 font-bold">{percent}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
