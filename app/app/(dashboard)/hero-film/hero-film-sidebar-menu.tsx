'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Film, Coins, AlertTriangle } from 'lucide-react';

interface SidebarMenuProps {
  teamId: number;
}

export default function HeroFilmSidebarMenu({ teamId }: SidebarMenuProps) {
  const pathname = usePathname();

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

  return (
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
  );
}
