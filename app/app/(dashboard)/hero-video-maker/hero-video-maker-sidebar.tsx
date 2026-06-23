'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Video, Film, Laptop, Settings, BookImage } from 'lucide-react';

interface SidebarMenuProps {
  teamId: number;
}

export default function HeroVideoMakerSidebar({ teamId }: SidebarMenuProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      name: 'Tổng quan',
      href: `/hero-video-maker/t/${teamId}/dashboard`,
      icon: LayoutDashboard
    },
    {
      name: 'Dự án video',
      href: `/hero-video-maker/t/${teamId}/projects`,
      icon: Video
    },
    {
      name: 'Thư viện đã tạo',
      href: `/hero-video-maker/t/${teamId}/gallery`,
      icon: Film
    },
    {
      name: 'Quản lý Skills',
      href: `/hero-video-maker/t/${teamId}/skills`,
      icon: BookImage
    },
    {
      name: 'Thiết bị & App Local',
      href: `/hero-video-maker/t/${teamId}/devices`,
      icon: Laptop
    },
    {
      name: 'Cấu hình & Storage',
      href: `/hero-video-maker/t/${teamId}/settings`,
      icon: Settings
    }
  ];

  return (
    <div className="space-y-1">
      <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider px-3 block mb-2">Video Maker AI</span>
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 border cursor-pointer select-none group ${
              isActive
                ? 'bg-gradient-to-r from-violet-500/10 to-fuchsia-500/5 border-violet-500/20 text-violet-400 font-extrabold shadow-sm'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-tr from-violet-500 to-fuchsia-500 shadow-md shadow-violet-500/10 text-white'
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
