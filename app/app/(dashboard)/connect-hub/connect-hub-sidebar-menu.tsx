'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plug, Link2, History, ListTree } from 'lucide-react';

interface SidebarMenuProps {
  teamId: number;
}

export default function ConnectHubSidebarMenu({ teamId }: SidebarMenuProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      name: 'Tổng quan',
      href: `/connect-hub/t/${teamId}/dashboard`,
      icon: LayoutDashboard
    },
    {
      name: 'Kho ứng dụng',
      href: `/connect-hub/t/${teamId}/apps`,
      icon: Plug
    },
    {
      name: 'Kết nối của tôi',
      href: `/connect-hub/t/${teamId}/connections`,
      icon: Link2
    },
    {
      name: 'Nhật ký sử dụng',
      href: `/connect-hub/t/${teamId}/logs`,
      icon: History
    },
    {
      name: 'Chuẩn hóa dữ liệu',
      href: `/connect-hub/t/${teamId}/mapping`,
      icon: ListTree
    }
  ];

  return (
    <div className="space-y-1">
      <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider px-3 block mb-2">Cấu hình kết nối</span>
      {menuItems.map((item) => {
        const Icon = item.icon;
        // Kiểm tra xem pathname hiện tại có khớp hoàn toàn hoặc là cấp con của href không
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 border cursor-pointer select-none group ${
              isActive
                ? 'bg-gradient-to-r from-purple-500/10 to-indigo-500/5 border-purple-500/20 text-purple-400 font-extrabold shadow-sm'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-md shadow-purple-500/10 text-white'
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
