import React from 'react';
import Link from 'next/link';
import { Globe, LayoutTemplate, Settings, ExternalLink, ArrowLeft } from 'lucide-react';
import TopHeader from '@/components/top-header';
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

export default async function HeroWebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white w-full">
      {/* Top Header */}
      <TopHeader />

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 relative">
        {/* Sidebar */}
        <aside className="w-full lg:w-60 shrink-0 bg-gray-900/30 border-r border-white/5 p-4 flex flex-col justify-between lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]">
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
              <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Môi trường</span>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-xs text-white truncate leading-snug">Cá nhân</p>
                  <p className="text-[9px] text-gray-400">HeroWeb Studio</p>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-1.5 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 rounded-lg text-[10px] font-black text-gray-300 hover:text-white transition-all text-center cursor-pointer select-none"
              >
                <ArrowLeft className="h-3 w-3" /> Về trang chủ AI2Hero
              </Link>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider px-3 block mb-2">Quản lý</span>
              <Link href="/heroweb" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 text-xs font-bold transition-colors">
                <Globe className="w-4 h-4" /> Tổng quan
              </Link>
              <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 text-xs font-semibold transition-colors">
                <LayoutTemplate className="w-4 h-4" /> Kho Giao diện
              </Link>
              <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 text-xs font-semibold transition-colors">
                <Settings className="w-4 h-4" /> Cài đặt chung
              </Link>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 text-center text-[10px] text-gray-500 font-bold select-none">
            HeroWeb v1.0
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full overflow-y-auto bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
}
