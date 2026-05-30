'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  Smartphone, 
  Link2, 
  AlertTriangle, 
  History,
  Settings
} from 'lucide-react';

const tabs = [
  { href: '/sim/dashboard', icon: BarChart3, label: 'Tổng quan' },
  { href: '/sim/assets', icon: Smartphone, label: 'Quản lý SIM' },
  { href: '/sim/accounts', icon: Link2, label: 'Tài khoản liên kết' },
  { href: '/sim/alerts', icon: AlertTriangle, label: 'Cảnh báo rủi ro' },
  { href: '/sim/history', icon: History, label: 'Lịch sử kiểm tra' },
  { href: '/sim/settings', icon: Settings, label: 'Cài đặt' },
];

export default function SimTabs() {
  const pathname = usePathname();

  return (
    <div className="w-full">
      <nav className="flex flex-col gap-1 w-full">
        {tabs.map((tab) => {
          // Khớp chính xác với tab Tổng quan (chỉ khớp chính xác /sim/dashboard, các tab khác kiểm tra startsWith)
          const isActive = tab.href === '/sim/dashboard' 
            ? pathname === '/sim/dashboard'
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all border border-transparent select-none cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
