'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import {
  LayoutGrid, Plus, Sparkles, Menu, Search, Bell, HelpCircle, Megaphone, LogOut, Shield, UserCircle, Settings, X, Check
} from 'lucide-react';
import { User } from '@/lib/db/schema';
import { signOut, acceptInvitationAction, declineInvitationAction } from '@/app/(login)/actions';
import { fetcher } from '@/lib/fetcher';
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  markAnnouncementsAsReadAction
} from '@/lib/db/notification-actions';

interface NotifDropdownContentProps {
  unreadCount: number;
  notifs: any[];
  markAllAsRead: () => void;
  handleNotifClick: (id: number) => void;
}

function NotifDropdownContent({
  unreadCount,
  notifs,
  markAllAsRead,
  handleNotifClick
}: NotifDropdownContentProps) {
  const { mutate } = useSWRConfig();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const onAccept = async (e: React.MouseEvent, notifId: number, invitationId: number) => {
    e.stopPropagation();
    setLoadingId(notifId);
    try {
      const res = await acceptInvitationAction({ invitationId });
      if (res.error) {
        alert(res.error);
      } else {
        mutate('/api/notifications');
        window.dispatchEvent(new Event('notifications-updated'));
      }
    } catch (err) {
      console.error('Lỗi khi chấp nhận lời mời:', err);
    } finally {
      setLoadingId(null);
    }
  };

  const onDecline = async (e: React.MouseEvent, notifId: number, invitationId: number) => {
    e.stopPropagation();
    setLoadingId(notifId);
    try {
      const res = await declineInvitationAction({ invitationId });
      if (res.error) {
        alert(res.error);
      } else {
        mutate('/api/notifications');
        window.dispatchEvent(new Event('notifications-updated'));
      }
    } catch (err) {
      console.error('Lỗi khi từ chối lời mời:', err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <span className="font-extrabold text-xs text-white">Thông báo ({unreadCount} mới)</span>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-[10px] text-orange-400 font-black hover:underline cursor-pointer"
          >
            Đọc tất cả
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-white/5 scrollbar-thin">
        {notifs.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500 italic">
            Chưa có thông báo nào
          </div>
        ) : (
          notifs.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotifClick(n.id)}
              className={`p-3 text-[11px] flex gap-2.5 transition-colors cursor-pointer hover:bg-white/5 ${
                !n.read ? 'bg-white/[0.02]' : ''
              }`}
            >
              <div className="h-7 w-7 rounded-full bg-white/5 flex items-center justify-center shrink-0 shadow-sm text-sm select-none">
                {n.fromAvatar}
              </div>
              <div className="space-y-1.5 min-w-0 flex-1">
                <p className="text-gray-300 leading-snug">
                  <span className="font-extrabold text-white">{n.fromUser}</span>{' '}
                  {n.message}
                </p>

                {n.type === 'team_invite' && !n.read && n.invitationId && (
                  <div className="flex items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={loadingId === n.id}
                      onClick={(e) => onAccept(e, n.id, n.invitationId)}
                      className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold px-2 py-0.5 rounded flex items-center gap-0.5 transition-all cursor-pointer text-[9px]"
                    >
                      <Check className="h-2.5 w-2.5" />
                      Chấp nhận
                    </button>
                    <button
                      disabled={loadingId === n.id}
                      onClick={(e) => onDecline(e, n.id, n.invitationId)}
                      className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-gray-300 font-bold px-2 py-0.5 rounded flex items-center gap-0.5 transition-all cursor-pointer text-[9px]"
                    >
                      <X className="h-2.5 w-2.5" />
                      Từ chối
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                  <span>{n.timestamp}</span>
                  {!n.read && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

interface HeaderUserAvatarProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function HeaderUserAvatar({ isOpen, onToggle, onClose }: HeaderUserAvatarProps) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  if (!user) return null;
  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="h-8 w-8 rounded-full bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-orange-500/30 hover:ring-orange-500/50 transition-all cursor-pointer"
        title={user.name || user.email || ''}
        aria-label="Menu tài khoản"
      >
        {initial}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-scale-up">
          {/* User info header */}
          <div className="p-4 border-b border-white/5">
            <p className="text-sm font-semibold text-white truncate">{user.name || 'Chưa đặt tên'}</p>
            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
          </div>
          {/* Menu items */}
          <div className="p-1">
            {[
              { icon: UserCircle, label: 'Hồ sơ cá nhân', href: '/dashboard/general' },
              { icon: Shield, label: 'Cài đặt bảo mật', href: '/dashboard/security' },
              { icon: Settings, label: 'Cấu hình nhóm', href: '/dashboard/settings' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
              >
                <item.icon className="h-4 w-4 text-gray-500" />
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="h-px bg-white/5 my-1" />
            <button
              onClick={async () => {
                onClose();
                await signOut();
                router.push('/sign-in');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-lg transition-all text-left cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SuperAdminButton() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  if (!user || user.role !== 'super_admin') return null;

  return (
    <Link
      href="/admin"
      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-bold rounded-lg shadow-lg shadow-purple-500/20 transition-all cursor-pointer ring-1 ring-purple-400/30 shrink-0"
      title="Bảng quản trị Super Admin"
    >
      <Shield className="h-3.5 w-3.5" />
      <span>Admin</span>
    </Link>
  );
}

interface TopHeaderProps {
  onToggleSidebar?: () => void;
}

export default function TopHeader({ onToggleSidebar }: TopHeaderProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  // State menu
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);

  // State Global Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ apps: any[], members: any[], posts: any[] } | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Dynamic Data Fetching qua SWR
  const { data: notifData } = useSWR('/api/notifications', fetcher);
  const { data: announcementsData } = useSWR('/api/announcements', fetcher);

  const notificationsList = notifData?.notifications || [];
  const bellUnreadCount = notifData?.unreadCount || 0;
  const megaphoneUnreadCount = announcementsData?.unreadCount || 0;

  const createRef = useRef<HTMLDivElement>(null);
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
    
    // Đánh dấu đã đọc trên Server
    await markNotificationAsReadAction(id);
    mutate('/api/notifications');

    if (notif?.postId) {
      router.push(`/dashboard/home#post-${notif.postId}`);
    }
  };

  const handleOpenAnnouncements = async () => {
    setIsAnnouncementsOpen(true);
    
    // Đăng ký đã đọc loa phát thanh trên server
    if (megaphoneUnreadCount > 0) {
      await markAnnouncementsAsReadAction();
      mutate('/api/announcements');
    }
  };

  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Lỗi khi fetch search kết quả:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Phím tắt Ctrl+K để focus nhanh vào ô tìm kiếm toàn cục
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (createRef.current && !createRef.current.contains(e.target as Node)) {
        setIsCreateOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setIsAvatarOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close announcements drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAnnouncementsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lắng nghe sự kiện toàn cục để reload thông báo Bell động
  useEffect(() => {
    const handleNotificationsUpdated = () => {
      mutate('/api/notifications');
    };
    window.addEventListener('notifications-updated', handleNotificationsUpdated);
    return () => window.removeEventListener('notifications-updated', handleNotificationsUpdated);
  }, [mutate]);

  return (
    <div className="w-full shrink-0">
      {/* ═══ MOBILE HEADER (Hiển thị dưới lg) ═══ */}
      <div className="lg:hidden flex items-center justify-between bg-gray-900/95 backdrop-blur-lg border-b border-white/5 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center shadow-md">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">AI2Hero</span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          {/* Notification mini */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg text-gray-400 hover:text-white cursor-pointer"
              aria-label="Thông báo"
            >
              <Bell className="h-4.5 w-4.5" />
              {bellUnreadCount > 0 && (
                <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-[8px] font-black text-white flex items-center justify-center border border-gray-900">
                  {bellUnreadCount}
                </span>
              )}
            </button>
            {/* Dropdown thông báo di động */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-up">
                <NotifDropdownContent
                  unreadCount={bellUnreadCount}
                  notifs={notificationsList}
                  markAllAsRead={markAllAsRead}
                  handleNotifClick={handleNotifClick}
                />
              </div>
            )}
          </div>
          {/* Avatar mini di động */}
          <div ref={avatarRef} className="shrink-0 size-8 flex items-center justify-center">
            <HeaderUserAvatar
              isOpen={isAvatarOpen}
              onToggle={() => setIsAvatarOpen(!isAvatarOpen)}
              onClose={() => setIsAvatarOpen(false)}
            />
          </div>
          {/* Hamburger Sidebar Trigger */}
          {onToggleSidebar && (
            <button
              className="p-2 text-gray-400 hover:text-white cursor-pointer"
              onClick={onToggleSidebar}
              aria-label="Mở Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* ═══ DESKTOP TOP HEADER (Hiển thị từ lg trở lên) ═══ */}
      <header className="sticky top-0 z-50 w-full h-14 bg-gray-950/80 backdrop-blur-xl border-b border-white/5 hidden lg:flex items-center justify-between px-4 gap-4 shrink-0">
        {/* — Phân vùng Trái: Launcher + Logo — */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Launcher Button */}
          <Link href="/dashboard/store" aria-label="Kho ứng dụng">
            <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer" title="Kho ứng dụng" aria-label="Kho ứng dụng">
              <LayoutGrid className="h-5 w-5" />
            </button>
          </Link>
          {/* Logo & Brand */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-white text-sm tracking-tight">AI2Hero</span>
              <span className="text-[9px] text-gray-500 tracking-widest uppercase font-medium">Platform</span>
            </div>
          </Link>
        </div>

        {/* — Phân vùng Giữa: Search + Create — */}
        <div className="flex items-center gap-3 flex-1 max-w-xl mx-auto">
          {/* Global Search với logic kết quả Popover kính mờ thật */}
          <div className="relative flex-1" ref={searchContainerRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              id="global-search-input"
              type="text"
              placeholder="Tìm kiếm bài viết, thành viên, ứng dụng..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className="w-full pl-9 pr-16 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-300 placeholder:text-gray-600 focus:bg-white/8 focus:border-white/20 focus:outline-none transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 border border-white/10 rounded px-1.5 py-0.5 font-mono">Ctrl+K</kbd>

            {/* Dropdown Popover Kết Quả Tìm Kiếm Kính Mờ */}
            {isSearchFocused && searchQuery.trim() && (
              <div className="absolute left-0 right-0 mt-2 bg-gray-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-up max-h-96 overflow-y-auto divide-y divide-white/5 scrollbar-thin">
                {isSearching ? (
                  <div className="p-6 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <span className="animate-spin text-orange-500">⏳</span>
                    <span>Đang tìm kiếm trên hệ thống...</span>
                  </div>
                ) : (!searchResults || (searchResults.apps.length === 0 && searchResults.members.length === 0 && searchResults.posts.length === 0)) ? (
                  <div className="p-6 text-center text-xs text-gray-500 italic">
                    Không tìm thấy kết quả nào khớp với từ khóa "{searchQuery}"
                  </div>
                ) : (
                  <div className="p-2 space-y-3">
                    {/* Nhóm 1: Ứng dụng */}
                    {searchResults.apps.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-2.5 block text-left">Ứng Dụng ({searchResults.apps.length})</span>
                        <div className="space-y-0.5">
                          {searchResults.apps.map((app: any) => (
                            <Link
                              key={app.id}
                              href={app.path}
                              onClick={() => setIsSearchFocused(false)}
                              className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-white/5 rounded-xl transition-all"
                            >
                              <span className="text-base shrink-0">{app.icon}</span>
                              <div className="min-w-0 flex-1 text-left">
                                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                  <span>{app.name}</span>
                                  {app.comingSoon && (
                                    <span className="text-[8px] bg-white/5 text-gray-400 px-1 py-0.5 rounded font-normal">Sắp ra mắt</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-gray-500 truncate">{app.desc}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nhóm 2: Thành viên */}
                    {searchResults.members.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-2.5 block text-left">Thành viên ({searchResults.members.length})</span>
                        <div className="space-y-0.5">
                          {searchResults.members.map((m: any) => (
                            <div
                              key={m.id}
                              className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-white/5 rounded-xl transition-all"
                            >
                              <div className="h-6 w-6 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-xs flex items-center justify-center shrink-0">
                                {m.avatar}
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <p className="text-xs font-bold text-white">{m.name}</p>
                                <p className="text-[10px] text-gray-500 truncate">{m.email}</p>
                              </div>
                              <span className="text-[9px] font-bold bg-white/5 text-gray-400 px-2 py-0.5 rounded-full shrink-0 border border-white/5">
                                {m.role}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nhóm 3: Bài đăng Bảng tin */}
                    {searchResults.posts.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-2.5 block text-left">Bảng tin Social ({searchResults.posts.length})</span>
                        <div className="space-y-0.5">
                          {searchResults.posts.map((post: any) => (
                            <Link
                              key={post.id}
                              href={`/dashboard/home#post-${post.id}`}
                              onClick={() => {
                                setIsSearchFocused(false);
                                // Kích hoạt hash jump highlight
                                setTimeout(() => {
                                  window.dispatchEvent(new HashChangeEvent('hashchange'));
                                }, 100);
                              }}
                              className="block px-2.5 py-2 hover:bg-white/5 rounded-xl transition-all text-left"
                            >
                              <p className="text-xs text-gray-300 line-clamp-1 text-left">
                                {post.type === 'task_assignment' ? `📋 [Nhiệm vụ] ${post.taskTitle}` : post.message}
                              </p>
                              <p className="text-[9px] text-gray-500 mt-0.5 text-left">{post.createdAt}</p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nút Tạo mới nhanh */}
          <div className="relative" ref={createRef}>
            <button
              onClick={() => setIsCreateOpen(!isCreateOpen)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-orange-500/10 hover:opacity-90 transition-all shrink-0 cursor-pointer"
              aria-label="Tạo mới nhanh"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tạo mới</span>
            </button>
            {/* Create Dropdown */}
            {isCreateOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-scale-up">
                <div className="p-1">
                  {[
                    { 
                      icon: '➕', 
                      label: 'Tạo không gian làm việc mới',
                      onClick: () => {
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('open-create-workspace'));
                        }
                      }
                    },
                    { 
                      icon: '📝', 
                      label: 'Đăng bài nhanh',
                      onClick: () => {
                        router.push('/dashboard/home');
                      }
                    },
                    { 
                      icon: '🚀', 
                      label: 'Thêm ứng dụng',
                      onClick: () => {
                        router.push('/dashboard/store');
                      }
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setIsCreateOpen(false);
                        item.onClick();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all text-left cursor-pointer"
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* — Phân vùng Phải: Utilities + Avatar — */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Super Admin Quick Access */}
          <SuperAdminButton />
          
          {/* Icon Loa phát thanh (Megaphone announcements) */}
          <button
            onClick={handleOpenAnnouncements}
            className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            title="Cập nhật hệ thống"
            aria-label="Cập nhật hệ thống"
          >
            <Megaphone className="h-4.5 w-4.5" />
            {megaphoneUnreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-orange-500 border border-gray-950 animate-pulse" />
            )}
          </button>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              title="Thông báo"
              aria-label="Thông báo"
            >
              <Bell className="h-4.5 w-4.5" />
              {bellUnreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center border-2 border-gray-950 animate-pulse">
                  {bellUnreadCount}
                </span>
              )}
            </button>
            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-up">
                <NotifDropdownContent
                  unreadCount={bellUnreadCount}
                  notifs={notificationsList}
                  markAllAsRead={markAllAsRead}
                  handleNotifClick={handleNotifClick}
                />
              </div>
            )}
          </div>

          {/* Icon Trợ giúp */}
          <button className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer" title="Trợ giúp" aria-label="Trợ giúp">
            <HelpCircle className="h-4.5 w-4.5" />
          </button>

          {/* Dấu ngăn cách */}
          <div className="h-6 w-px bg-white/10 mx-1" />

          {/* Avatar User + Dropdown Menu */}
          <div ref={avatarRef} className="shrink-0">
            <HeaderUserAvatar
              isOpen={isAvatarOpen}
              onToggle={() => setIsAvatarOpen(!isAvatarOpen)}
              onClose={() => setIsAvatarOpen(false)}
            />
          </div>
        </div>
      </header>

      {/* ═══ SLIDE-OVER DRAWER CHO LOA PHÁT THANH (SYSTEM ANNOUNCEMENTS) ═══ */}
      {isAnnouncementsOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setIsAnnouncementsOpen(false)}
          />
          
          {/* Slider Panel */}
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-gray-900 border-l border-white/10 shadow-2xl flex flex-col transform transition-transform duration-300 animate-slide-in">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4.5 w-4.5 text-orange-400" />
                <span className="font-extrabold text-sm text-white">Cập Nhật Hệ Thống</span>
              </div>
              <button
                onClick={() => setIsAnnouncementsOpen(false)}
                className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
                aria-label="Đóng Drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Drawer Timeline List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
              {(!announcementsData?.announcements || announcementsData.announcements.length === 0) ? (
                <div className="text-center py-12 text-gray-500 italic text-xs">
                  Chưa có thông báo cập nhật nào từ ban quản trị.
                </div>
              ) : (
                announcementsData.announcements.map((a: any) => (
                  <div key={a.id} className="relative pl-6 border-l border-white/5 space-y-2">
                    {/* Timeline Dot Indicator */}
                    <div className={`absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-gray-900 ${
                      a.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                      a.severity === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                    }`} />
                    
                    {/* Header info */}
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-orange-400 bg-orange-400/5 px-2 py-0.5 rounded border border-orange-400/10 shrink-0">
                        {a.version}
                      </span>
                      <span className="text-[9px] text-gray-500">{a.timestamp}</span>
                    </div>
                    
                    {/* Content text */}
                    <h4 className="text-xs font-bold text-white leading-snug">{a.title}</h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
