'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Users, MessageSquare, ArrowLeft, Flag, Clapperboard, CalendarClock, Store, Globe, Settings, Film } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SocialSidebarProps {
  user: any;
  teams: any[];
  activeTeamId: number;
}

export function SocialSidebar({ user, teams, activeTeamId }: SocialSidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      label: 'Bảng tin',
      href: '/',
      icon: Home,
      active: pathname === '/',
    },
    {
      label: 'Trang cá nhân',
      href: `/profile/${user?.id}`,
      icon: User,
      active: pathname.startsWith('/profile'),
    },
    {
      label: 'Bạn bè',
      href: '/friends',
      icon: Users,
      active: pathname.startsWith('/friends'),
    },
    {
      label: 'Video Reels',
      href: '/reels',
      icon: Clapperboard,
      active: pathname.startsWith('/reels'),
    },
    {
      label: 'Lập lịch MXH',
      href: '/scheduler',
      icon: CalendarClock,
      active: pathname.startsWith('/scheduler'),
    },
    {
      label: 'Marketplace',
      href: '/marketplace',
      icon: Store,
      active: pathname.startsWith('/marketplace'),
    },
    {
      label: 'Nhóm',
      href: '/groups',
      icon: Users,
      active: pathname.startsWith('/groups'),
    },
    {
      label: 'Trang',
      href: '/pages',
      icon: Flag,
      active: pathname.startsWith('/pages'),
    },
    {
      label: 'Tin nhắn',
      href: '/messages',
      icon: MessageSquare,
      active: pathname.startsWith('/messages'),
    },
    {
      label: 'Website của tôi',
      href: '/heroweb',
      icon: Globe,
      active: pathname.startsWith('/heroweb'),
    },
    {
      label: 'Film',
      href: '/film',
      icon: Film,
      active: pathname.startsWith('/film'),
    },
    {
      label: 'Cài đặt',
      href: '/settings',
      icon: Settings,
      active: pathname.startsWith('/settings'),
    },
  ];

  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full justify-between gap-6">
      <div className="space-y-6">
        
        {user ? (
          <Link
            href={`/profile/${user.id}`}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group cursor-pointer"
          >
            <Avatar className="h-10 w-10 border border-white/10 group-hover:border-white/20 transition-all shrink-0">
              <AvatarImage src={user.avatarUrl || ''} alt={user.name || ''} />
              <AvatarFallback className="bg-white/10 text-white">{initial}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors">
                {user.name || 'Người dùng'}
              </span>
              <span className="text-xs text-white/45 truncate">
                {user.email}
              </span>
            </div>
          </Link>
        ) : (
          <div
            onClick={() => {
              if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
            }}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group cursor-pointer"
          >
            <Avatar className="h-10 w-10 border border-white/10 group-hover:border-white/20 transition-all shrink-0">
              <AvatarFallback className="bg-white/10 text-white">?</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors">
                Khách vãng lai
              </span>
              <span className="text-xs text-pink-500 font-bold truncate">
                Đăng nhập ngay
              </span>
            </div>
          </div>
        )}

        {/* Menu Navigation */}
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  if (!user && ['/profile', '/friends', '/messages', '/dashboard'].some(p => item.href.startsWith(p))) {
                    e.preventDefault();
                    if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
                  }
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative overflow-hidden ${
                  item.active
                    ? 'bg-gradient-to-r from-pink-500/20 to-orange-500/20 border border-pink-500/30 text-white shadow-[0_0_15px_rgba(236,72,153,0.15)]'
                    : 'text-white/60 border border-transparent hover:border-white/5 hover:bg-white/5 hover:text-white/90'
                }`}
              >
                {item.active && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-pink-500 to-orange-500 rounded-r" />
                )}
                <Icon className={`h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${item.active ? 'text-pink-500' : 'text-white/45 group-hover:text-white/70'}`} />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Dashboard Redirect */}
      <div className="space-y-3 pt-6 border-t border-white/5">
        <Link
          href={`/dashboard/t/${activeTeamId}`}
          onClick={(e) => {
            if (!user) {
              e.preventDefault();
              if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
            }
          }}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold text-white/70 bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white hover:border-white/10 transition-all cursor-pointer group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Vào Dashboard</span>
        </Link>
      </div>
    </div>
  );
}