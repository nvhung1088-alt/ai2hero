'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Crown,
  Users,
  Building,
  Settings,
  Activity,
  ArrowLeft,
  Menu,
  LayoutGrid,
  Megaphone,
  Gauge
} from 'lucide-react';

type AdminShellProps = {
  children: React.ReactNode;
  user: {
    name: string | null;
    email: string;
  };
};

const adminSections = [
  {
    label: 'Tổng quan',
    items: [
      { href: '/admin', icon: LayoutGrid, label: 'Dashboard' }
    ]
  },
  {
    label: 'Quản lý',
    items: [
      { href: '/admin/users', icon: Users, label: 'Người dùng' },
      { href: '/admin/teams', icon: Building, label: 'Tổ chức' }
    ]
  },
  {
    label: 'Hệ thống',
    items: [
      { href: '/admin/traffic', icon: Gauge, label: 'Traffic & Polling' },
      { href: '/admin/settings', icon: Settings, label: 'Cấu hình' },
      { href: '/admin/announcements', icon: Megaphone, label: 'Loa phát thanh' },
      { href: '/admin/logs', icon: Activity, label: 'System Logs' }
    ]
  }
];

export function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between bg-gray-900/50 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-orange-500 animate-pulse" />
          <span className="font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">Super Admin</span>
        </div>
        <Button
          className="-mr-3 text-gray-400 hover:text-white"
          variant="ghost"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden h-full min-h-screen">
        {/* Mobile Sidebar Overlay Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        {/* Admin Sidebar */}
        <aside
          className={`w-64 bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col justify-between ${
            isSidebarOpen ? 'block fixed inset-y-0 left-0 z-40' : 'hidden'
          } lg:block lg:fixed lg:inset-y-0 lg:left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } border-r border-white/5`}
        >
          {/* Logo Section */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Crown className="h-[18px] w-[18px] text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white text-sm leading-none tracking-tight">SUPER ADMIN</span>
                <span className="text-[9px] text-gray-400 font-medium tracking-wider uppercase mt-1">AI2Hero Platform</span>
              </div>
            </div>
          </div>

          {/* Navigation Sections */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {adminSections.map((section) => (
              <div key={section.label} className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-3 py-1">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/20 font-semibold'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer Back link + User Info */}
          <div className="mt-auto border-t border-white/5 flex flex-col gap-2 p-4">
            <Link
              href="/dashboard/store"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Quay về Dashboard"
            >
              <ArrowLeft className="h-[18px] w-[18px] shrink-0" />
              <span>Quay về Dashboard</span>
            </Link>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 mt-2">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{user.name || 'Admin'}</p>
                <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Container */}
        <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
          <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
