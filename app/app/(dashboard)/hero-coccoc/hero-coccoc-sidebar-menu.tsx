'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, HelpCircle, FolderOpen, History, Download } from 'lucide-react';

interface SidebarMenuProps {
  teamId: number;
}

export default function HeroCoccocSidebarMenu({ teamId }: SidebarMenuProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      name: 'Tổng quan',
      href: `/hero-coccoc/t/${teamId}/dashboard`,
      icon: LayoutDashboard
    },
    {
      name: 'Dự án tải',
      href: `/hero-coccoc/t/${teamId}/projects`,
      icon: FolderOpen
    },
    {
      name: 'Tải nhanh',
      href: `/hero-coccoc/t/${teamId}/quick-download`,
      icon: Download
    },
    {
      name: 'Lịch sử tải',
      href: `/hero-coccoc/t/${teamId}/history`,
      icon: History
    },
    {
      name: 'Hướng dẫn Worker',
      href: `/hero-coccoc/t/${teamId}/guide`,
      icon: HelpCircle
    }
  ];

  return (
    <div className="space-y-1">
      <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider px-3 block mb-2">Cốc Cốc Downloader</span>
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 border cursor-pointer select-none group ${
              isActive
                ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border-emerald-500/20 text-emerald-400 font-extrabold shadow-sm'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/10 text-white'
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
