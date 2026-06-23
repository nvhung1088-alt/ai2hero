'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import {
  Home, Users, Search, Bell, MessageSquare, X, ChevronLeft
} from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { AppSwitcher } from '@/components/app-switcher';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  HeaderUserAvatar
} from '@/components/top-header';
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction
} from '@/lib/db/notification-actions';
import { MarketplaceHeader } from '@/components/marketplace/marketplace-header';

export function SocialTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { mutate } = useSWRConfig();

  // States menu
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // State Global Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [viewCategory, setViewCategory] = useState<{type: string, title: string} | null>(null);
  const [fullCategoryResults, setFullCategoryResults] = useState<any[]>([]);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);

  // Dynamic Data Fetching (polling 5s)
  const { data: notifData } = useSWR('/api/notifications', fetcher, { refreshInterval: 30000 });
  const notificationsList = notifData?.notifications || [];
  const bellUnreadCount = notifData?.unreadCount || 0;

  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const markAllAsRead = async () => {
    const res = await markAllNotificationsAsReadAction();
    if (!res.error) {
      mutate('/api/notifications');
    }
  };

  const handleNotifClick = async (id: number) => {
    const notif = notificationsList.find((n: any) => n.id === id);
    setIsNotifOpen(false);
    
    await markNotificationAsReadAction(id);
    mutate('/api/notifications');
    
    if (notif && notif.url) {
      router.push(notif.url);
    }
  };

  const handleViewAll = async (type: string, title: string) => {
    setViewCategory({type, title});
    setIsLoadingCategory(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&scope=all&category=${type}`);
      if (res.ok) {
        const data = await res.json();
        setFullCategoryResults(data[type] || []);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoadingCategory(false);
    }
  };

  // Search logic with simple API endpoint call (debounce client-side)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setViewCategory(null);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&scope=all`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          // If view category is active, also refresh it
          if (viewCategory) {
            handleViewAll(viewCategory.type, viewCategory.title);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setIsAvatarOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMarketplace = pathname.includes('/marketplace');

  const renderItem = (item: any, type: string) => {
    if (type === 'members') return (
      <Link key={item.id} href={`/profile/${item.id}`} onClick={() => setIsSearchFocused(false)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-all">
        <Avatar className="h-7 w-7"><AvatarImage src={item.avatarUrl || ''} /><AvatarFallback className="text-[10px] bg-white/10 text-white">{item.name?.charAt(0)}</AvatarFallback></Avatar>
        <span className="text-xs text-white/80">{item.name}</span>
      </Link>
    );
    if (type === 'posts') return (
      <Link key={item.id} href={`/post/${item.id}`} onClick={() => setIsSearchFocused(false)} className="block p-1.5 rounded-lg hover:bg-white/5 transition-all">
        <p className="text-xs text-white/80 line-clamp-1">{item.message || item.taskTitle}</p>
        <span className="text-[10px] text-white/30">bởi {item.authorName || 'Ẩn danh'}</span>
      </Link>
    );
    if (type === 'films') return (
      <Link key={item.id} href={`/film/${item.slug}`} onClick={() => setIsSearchFocused(false)} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/5 transition-all">
        <img src={item.coverUrl || ''} className="h-10 w-7 rounded object-cover" alt="" />
        <div className="min-w-0 flex-1"><p className="text-xs font-bold text-white line-clamp-1">{item.title}</p><p className="text-[10px] text-white/40 truncate">{item.genre}</p></div>
      </Link>
    );
    if (type === 'products') return (
      <Link key={item.id} href={`/marketplace/product/${item.id}`} onClick={() => setIsSearchFocused(false)} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/5 transition-all">
        <img src={item.images?.[0] || ''} className="h-8 w-8 rounded object-cover bg-white/10" alt="" />
        <div className="min-w-0 flex-1"><p className="text-xs font-bold text-white line-clamp-1">{item.name}</p><p className="text-[10px] text-white/40 truncate">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}</p></div>
      </Link>
    );
    if (type === 'announcements') return (
      <div key={item.id} className="block p-1.5 rounded-lg hover:bg-white/5 transition-all">
        <p className="text-xs font-bold text-white line-clamp-1 flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full shrink-0 ${item.severity === 'urgent' ? 'bg-red-500' : item.severity === 'warning' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>{item.title}</p>
      </div>
    );
    return null;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.07] bg-[#0c0c14]/60 backdrop-blur-2xl px-6 py-3 flex items-center justify-between shadow-lg shadow-black/30">
      <div className="flex items-center gap-4 min-w-0 shrink-0">
        <Link href="/" className="flex items-center gap-2 mr-2 shrink-0">
          <span className="text-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 bg-clip-text text-transparent tracking-tight">AI2Hero</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400 font-semibold uppercase tracking-wider border border-pink-500/20">Social</span>
        </Link>
        <AppSwitcher />
      </div>

      {isMarketplace ? (
        <div className="flex flex-1 justify-end md:justify-center mx-2 md:mx-8">
          <MarketplaceHeader />
        </div>
      ) : (
        <div ref={searchContainerRef} className="hidden md:block relative w-full max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-white/40" />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết, thành viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className="w-full pl-10 pr-8 py-2 bg-white/5 border border-white/5 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-pink-500/50 focus:bg-white/10 transition-all"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setViewCategory(null); }} className="absolute right-3 top-3 text-white/40 hover:text-white/70"><X className="h-3.5 w-3.5" /></button>
            )}
          </div>

        {isSearchFocused && !isMarketplace && (searchQuery || isSearching || searchResults || viewCategory) && (
          <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-[#161618] border border-white/10 rounded-xl shadow-2xl max-h-[400px] overflow-y-auto z-50 backdrop-blur-xl">
            
            {viewCategory ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                  <button onClick={() => setViewCategory(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                    <ChevronLeft className="h-4 w-4 text-white/60"/>
                  </button>
                  <span className="text-xs font-bold text-white uppercase">Tất cả {viewCategory.title}</span>
                </div>
                {isLoadingCategory ? (
                  <div className="text-center py-4 text-sm text-white/40 animate-pulse">Đang tải dữ liệu...</div>
                ) : (
                  <div className="space-y-2">
                    {fullCategoryResults.map((item: any) => renderItem(item, viewCategory.type))}
                    {fullCategoryResults.length === 0 && <div className="text-center py-4 text-xs text-white/30">Không tìm thấy kết quả nào</div>}
                  </div>
                )}
              </div>
            ) : (
              <>
                {isSearching && (
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-32 bg-white/5 rounded animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-white/5 animate-pulse"></div><div className="flex-1 space-y-1"><div className="h-3 w-1/2 bg-white/5 animate-pulse"></div><div className="h-2 w-1/4 bg-white/5 animate-pulse"></div></div></div>
                    </div>
                  </div>
                )}
                {!isSearching && searchResults && (
                  <div className="space-y-4">
                    {searchResults.members && searchResults.members.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-semibold text-white/40 uppercase">Thành viên</h4>
                          {searchResults.members.length >= 5 && <button onClick={() => handleViewAll('members', 'Thành viên')} className="text-[10px] text-blue-400 hover:text-blue-300">Xem tất cả</button>}
                        </div>
                        <div className="space-y-2">
                          {searchResults.members.map((item: any) => renderItem(item, 'members'))}
                        </div>
                      </div>
                    )}
                    {searchResults.posts && searchResults.posts.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-semibold text-white/40 uppercase">Bài viết</h4>
                          {searchResults.posts.length >= 5 && <button onClick={() => handleViewAll('posts', 'Bài viết')} className="text-[10px] text-blue-400 hover:text-blue-300">Xem tất cả</button>}
                        </div>
                        <div className="space-y-2">
                          {searchResults.posts.map((item: any) => renderItem(item, 'posts'))}
                        </div>
                      </div>
                    )}
                    {searchResults.films && searchResults.films.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-semibold text-white/40 uppercase">Phim</h4>
                          {searchResults.films.length >= 5 && <button onClick={() => handleViewAll('films', 'Phim')} className="text-[10px] text-blue-400 hover:text-blue-300">Xem tất cả</button>}
                        </div>
                        <div className="space-y-2">
                          {searchResults.films.map((item: any) => renderItem(item, 'films'))}
                        </div>
                      </div>
                    )}
                    
                    {searchResults.products && searchResults.products.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-semibold text-white/40 uppercase">Sản phẩm</h4>
                          {searchResults.products.length >= 5 && <button onClick={() => handleViewAll('products', 'Sản phẩm')} className="text-[10px] text-blue-400 hover:text-blue-300">Xem tất cả</button>}
                        </div>
                        <div className="space-y-2">
                          {searchResults.products.map((item: any) => renderItem(item, 'products'))}
                        </div>
                      </div>
                    )}
                    
                    {searchResults.announcements && searchResults.announcements.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-semibold text-white/40 uppercase">Tin tức</h4>
                          {searchResults.announcements.length >= 5 && <button onClick={() => handleViewAll('announcements', 'Tin tức')} className="text-[10px] text-blue-400 hover:text-blue-300">Xem tất cả</button>}
                        </div>
                        <div className="space-y-2">
                          {searchResults.announcements.map((item: any) => renderItem(item, 'announcements'))}
                        </div>
                      </div>
                    )}

                    {(!searchResults.members || searchResults.members.length === 0) && 
                     (!searchResults.posts || searchResults.posts.length === 0) && 
                     (!searchResults.films || searchResults.films.length === 0) &&
                     (!searchResults.products || searchResults.products.length === 0) &&
                     (!searchResults.groups || searchResults.groups.length === 0) &&
                     (!searchResults.pages || searchResults.pages.length === 0) &&
                     (!searchResults.announcements || searchResults.announcements.length === 0) && (
                      <div className="text-center py-4 text-sm text-white/40">Không tìm thấy kết quả nào</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      )}

      {/* Action Icons */}
      <div className="flex items-center gap-4 shrink-0">
        <nav className="flex items-center gap-1.5">
          <Link href="/" className={`p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all ${pathname === '/' ? 'text-pink-500 bg-white/5' : ''}`} title="Bảng tin"><Home className="h-5 w-5" /></Link>
          <Link href="/friends" className={`p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all ${pathname.startsWith('/friends') ? 'text-pink-500 bg-white/5' : ''}`} title="Bạn bè"><Users className="h-5 w-5" /></Link>
          <Link href="/messages" className={`p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all ${pathname.startsWith('/messages') ? 'text-pink-500 bg-white/5' : ''}`} title="Tin nhắn"><MessageSquare className="h-5 w-5" /></Link>
        </nav>

        <div ref={notifRef} className="relative">
          <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all relative">
            <Bell className="h-5 w-5" />
            {bellUnreadCount > 0 && <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-pink-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">{bellUnreadCount}</span>}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#161618] border border-white/10 rounded-xl shadow-2xl z-50 backdrop-blur-xl">
              <div className="flex items-center justify-between p-3 border-b border-white/5">
                <span className="text-sm font-semibold text-white/90">Thông báo</span>
                {bellUnreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-pink-400 hover:text-pink-300 font-medium">Đánh dấu tất cả đã đọc</button>}
              </div>
              <div className="max-h-[300px] overflow-y-auto py-1">
                {notificationsList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-white/40">Không có thông báo nào</div>
                ) : (
                  notificationsList.map((notif: any) => (
                    <button key={notif.id} onClick={() => handleNotifClick(notif.id)} className={`w-full text-left p-3 hover:bg-white/5 transition-all flex gap-3 items-start border-b border-white/5 last:border-0 ${!notif.read ? 'bg-pink-500/5' : ''}`}>
                      <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden border border-white/10 relative">
                        {notif.fromAvatar !== '👤' ? <img src={notif.fromAvatar} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs">👤</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs text-white/80 ${!notif.read ? 'font-semibold' : ''}`}>{notif.content}</p>
                        <span className="text-[10px] text-white/30 block mt-1">{notif.timestamp}</span>
                      </div>
                      {!notif.read && <span className="h-1.5 w-1.5 bg-pink-500 rounded-full mt-1.5 shrink-0" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div ref={avatarRef} className="relative flex items-center">
          <HeaderUserAvatar isOpen={isAvatarOpen} onToggle={() => setIsAvatarOpen(!isAvatarOpen)} onClose={() => setIsAvatarOpen(false)} />
        </div>
      </div>
    </header>
  );
}