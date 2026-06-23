"use client";

import { useState } from 'react';
import { Plus, Compass, Search, Flag, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { CreatePageModal } from './create-page-modal';

export function PagesClient({ 
  user, 
  myPages,
  followedPages,
  suggestedPages
}: { 
  user: any;
  myPages: any[];
  followedPages: any[];
  suggestedPages: any[];
}) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'your_pages' | 'followed' | 'discover'>('your_pages');
  const [showCreateModal, setShowCreateModal] = useState(false);

  let currentList: any[] = [];
  if (activeTab === 'your_pages') currentList = myPages;
  if (activeTab === 'followed') currentList = followedPages;
  if (activeTab === 'discover') currentList = suggestedPages;

  const filtered = currentList.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full flex flex-col md:flex-row text-white min-h-[calc(100vh-3.5rem)]">
      {/* Sidebar - w-full on mobile, w-[360px] sticky on desktop */}
      <div className="w-full md:w-[360px] bg-[#161618] border-r border-white/5 p-4 md:shrink-0 md:h-[calc(100vh-3.5rem)] overflow-y-auto md:sticky md:top-[3.5rem] space-y-4">
        <div>
          <h1 className="text-xl font-black text-white px-2 py-1">Trang</h1>
          <p className="text-white/40 text-xs px-2 mt-0.5">Quản lý Trang và Khám phá</p>
        </div>

        {/* Nút Tạo Trang mới */}
        <div className="px-2 space-y-2">
          <Button 
            onClick={() => {
              if (!user) {
                if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
                return;
              }
              setShowCreateModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl py-2.5"
          >
            <Plus className="w-4 h-4" />
            Tạo Trang mới
          </Button>
        </div>

        {/* Search input trang */}
        <div className="relative px-2">
          <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-white/40" />
          <Input 
            placeholder="Tìm kiếm Trang..." 
            className="pl-9 bg-white/5 border-white/10 text-xs text-white placeholder-white/40 rounded-xl py-2 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Menu điều hướng dọc */}
        <div className="space-y-1.5 pt-2">
          <button
            onClick={() => setActiveTab('your_pages')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'your_pages' 
                ? 'bg-white/10 text-white font-bold' 
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Flag className="w-4 h-4 shrink-0" />
              <span>Trang bạn quản lý</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'your_pages' ? 'bg-white/20' : 'bg-white/5 text-white/40'}`}>
              {myPages.length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('followed')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'followed' 
                ? 'bg-white/10 text-white font-bold' 
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Trang đã theo dõi</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'followed' ? 'bg-white/20' : 'bg-white/5 text-white/40'}`}>
              {followedPages.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('discover')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'discover' 
                ? 'bg-white/10 text-white font-bold' 
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Compass className="w-4 h-4 shrink-0" />
              <span>Khám phá Trang mới</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main content right side */}
      <div className="flex-1 flex justify-center py-8 px-4 bg-transparent">
        <div className="w-full max-w-[680px] space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider">
              {activeTab === 'your_pages' && 'Trang bạn quản lý'}
              {activeTab === 'followed' && 'Trang bạn đang theo dõi'}
              {activeTab === 'discover' && 'Khám phá các Trang khác'}
            </h2>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-20 bg-[#161618]/40 border border-white/5 rounded-2xl text-white/40 text-sm">
                Không tìm thấy trang nào.
              </div>
            ) : (
              filtered.map((page) => (
                <div key={page.id} className="bg-[#161618]/80 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 hover:bg-[#161618] hover:-translate-y-1 hover:shadow-2xl">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-white/10">
                      {page.avatarUrl ? (
                        <img src={page.avatarUrl} className="w-full h-full object-cover" alt={page.name} />
                      ) : (
                        <div className="w-full h-full bg-pink-500/20 text-pink-500 flex items-center justify-center font-bold text-xl">{page.name.charAt(0)}</div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white/90">{page.name}</h3>
                      <p className="text-xs text-white/40 mt-1">
                        {page.followersCount} người theo dõi • {page.category || 'Khác'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Link href={`/pages/${page.id}`} className="w-full sm:w-auto">
                      <Button className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white border-transparent">
                        Xem trang
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <CreatePageModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  );
}
