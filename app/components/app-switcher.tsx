'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LayoutGrid, MessageSquare, Plug, Users, FileBarChart, MonitorPlay, DownloadCloud } from 'lucide-react';

const APP_LINKS = [
  { id: 'social', name: 'Social Hero', desc: 'Bảng tin nội bộ', icon: MessageSquare, href: '/', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'connect-hub', name: 'Connect Hub', desc: 'Tích hợp đa kênh', icon: Plug, href: '/connect-hub/dashboard', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'hero-care', name: 'Hero Care', desc: 'Chăm sóc khách hàng', icon: Users, href: '/hero-care/dashboard', color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: 'hero-report', name: 'Hero Report', desc: 'Báo cáo thông minh', icon: FileBarChart, href: '/hero-report/dashboard', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { id: 'herovideodownload', name: 'Video Downloader', desc: 'Tải video HD', icon: MonitorPlay, href: '/herovideodownload/dashboard', color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { id: 'hero-downloader', name: 'Hero Downloader', desc: 'Quét & Tải hàng loạt', icon: DownloadCloud, href: '/hero-downloader/dashboard', color: 'text-teal-400', bg: 'bg-teal-500/10' },
];

export function AppSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
        title="Ứng dụng AI2Hero"
        aria-label="Menu Ứng dụng"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-[#161618] border border-white/10 rounded-xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-white/5 mb-1">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Ứng dụng AI2Hero
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1">
            {APP_LINKS.map((app) => {
              const Icon = app.icon;
              return (
                <Link
                  key={app.id}
                  href={app.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-all group cursor-pointer"
                >
                  <div className={`p-2 rounded-lg ${app.bg} shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className={`h-4.5 w-4.5 ${app.color}`} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white/90 group-hover:text-white transition-colors">
                      {app.name}
                    </span>
                    <span className="text-[10px] text-white/40 truncate">
                      {app.desc}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}