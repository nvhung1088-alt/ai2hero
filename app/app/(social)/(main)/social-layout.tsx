'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SocialSidebar } from './social-sidebar';
import { SocialRightbar } from './social-rightbar';

interface SocialLayoutProps {
  children: React.ReactNode;
  user: any;
  teams: any[];
  activeTeamId: number;
  friends?: any[];
}

export function SocialLayout({ children, user, teams, activeTeamId, friends = [] }: SocialLayoutProps) {
  const pathname = usePathname();
  const isProfilePage = pathname.includes('/profile');
  const isGroupDetailPage = pathname.match(/\/groups\/\d+/);
  const isGroupListPage = pathname === '/groups';
  const isFriendsPage = pathname.includes('/friends');
  const isMessagesPage = pathname.includes('/messages');
  const isMarketplacePage = pathname.includes('/marketplace') || pathname.includes('/product') || pathname.includes('/shop');
  const isFilmPage = pathname.startsWith('/film');
  const isFilmWatchPage = pathname.startsWith('/film/watch');
  
  // Pages module routes
  const isPageDetailPage = pathname.match(/\/pages\/\d+/);
  const isPageListPage = pathname === '/pages';

  // Reels module route
  const isReelsPage = pathname.startsWith('/reels');

  const isFullScreenApp = isReelsPage || isMessagesPage || isFilmWatchPage;
  const shouldHideRightbar = isGroupListPage || isFriendsPage || isPageListPage || isReelsPage || isMessagesPage || isFilmPage;
  const isFullWidthContent = isGroupListPage || isFriendsPage || isPageListPage || isReelsPage || isMessagesPage || isMarketplacePage || isProfilePage || isGroupDetailPage || isPageDetailPage || isFilmPage;
  const isWideContent = false;

  // Đối với Reels và Messages, chúng ta cần khung main cao 100% và ẩn thanh cuộn của body để nhường thanh cuộn cho component con.
  const mainPadding = isFullScreenApp 
    ? 'py-0 px-0 h-[calc(100vh-3.5rem)] overflow-hidden' 
    : isFullWidthContent 
      ? 'py-0 px-0' 
      : 'py-6 px-2 sm:px-6';

  return (
    <div className={`flex flex-1 min-h-0 relative w-full ${isFullScreenApp ? 'h-[calc(100vh-3.5rem)] overflow-hidden' : ''}`}>
      {/* Full-width: không có max-w container — giống Facebook layout */}
      <div className="flex w-full items-stretch justify-between relative flex-1 min-h-0">
        
        {/* Sidebar Trái (Navigation & Shortcuts) — sticky full height */}
        <aside className="hidden lg:flex lg:flex-col w-[280px] xl:w-[320px] shrink-0 border-r border-white/[0.06] bg-white/[0.02] backdrop-blur-xl sticky top-[3.5rem] h-[calc(100vh-3.5rem)] overflow-y-auto scrollbar-thin">
          <div className="p-4 flex-1">
            <SocialSidebar user={user} teams={teams} activeTeamId={activeTeamId} />
          </div>
        </aside>
        
        {/* Cột Nội Dung Chính Ở Giữa — flex-1, tự co giãn */}
        <main className={`flex-1 min-w-0 flex flex-col items-center gap-6 min-h-full ${mainPadding}`}>
          <div className={`w-full ${isWideContent ? 'max-w-[1096px]' : isFullWidthContent ? 'max-w-none h-full' : 'max-w-[680px]'}`}>
            {children}
          </div>
        </main>

        {/* Sidebar Phải (Contacts & Suggestions) — sticky full height */}
        {!shouldHideRightbar && (
          <aside className="hidden xl:flex xl:flex-col w-[280px] xl:w-[320px] shrink-0 border-l border-white/[0.06] bg-white/[0.02] backdrop-blur-xl sticky top-[3.5rem] h-[calc(100vh-3.5rem)] overflow-y-auto scrollbar-thin">
            <div className="p-4 flex-1">
              <SocialRightbar user={user} activeTeamId={activeTeamId} friends={friends} />
            </div>
          </aside>
        )}

      </div>
    </div>
  );
}
