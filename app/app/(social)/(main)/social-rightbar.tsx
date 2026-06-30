'use client';

import React, { useEffect, useState } from 'react';
import { UserPlus, Users, ThumbsUp, Radio, Store } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { pingHeartbeatAction } from '@/lib/db/social-actions';

interface SocialRightbarProps {
  user: any;
  activeTeamId: number;
  friends?: any[];
}

export function SocialRightbar({ user, activeTeamId, friends = [] }: SocialRightbarProps) {
  const pathname = usePathname() || '';
  
  const isGroupDetail = pathname.match(/\/groups\/\d+/);
  const isPageDetail = pathname.match(/\/pages\/\d+/);
  const isMarketplacePage = pathname.includes('/marketplace') || pathname.includes('/product') || pathname.includes('/shop');

  // Trạng thái trigger re-render để tính lại isOnline real-time
  const [now, setNow] = useState(Date.now());

  // Client-side Heartbeat Ping
  useEffect(() => {
    pingHeartbeatAction();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pingHeartbeatAction();
        setNow(Date.now());
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // -- Default Mode Data --
  const processedContacts = friends.map((friend: any) => {
    let isOnline = false;
    if (friend.lastActiveAt) {
      const lastActiveTime = new Date(friend.lastActiveAt).getTime();
      isOnline = now - lastActiveTime < 3 * 60 * 1000;
    }
    const firstChar = friend.name ? friend.name.charAt(0).toUpperCase() : '👤';
    const avatarFallback = friend.avatarUrl || firstChar;
    return {
      id: friend.id,
      name: friend.name,
      avatar: avatarFallback,
      avatarUrl: friend.avatarUrl,
      isOnline,
      role: friend.bio || 'Thành viên'
    };
  });

  const friendSuggestions = [
    { id: 10, name: 'David Beckham', avatar: 'D', mutualFriends: 3 },
    { id: 11, name: 'Elon Musk', avatar: 'E', mutualFriends: 12 },
  ];

  // -- Group Mode Data --
  const groupSuggestions = [
    { id: 1, name: 'Cộng đồng ReactJS VN', avatar: 'R', members: '12K' },
    { id: 2, name: 'Next.js Developers', avatar: 'N', members: '8.5K' },
  ];
  
  const myGroups = [
    { id: 3, name: 'Lập trình viên nghèo', avatar: 'L', members: '150K' },
    { id: 4, name: 'Hội những người yêu AI', avatar: 'A', members: '24K' },
  ];

  // -- Page Mode Data --
  const pageSuggestions = [
    { id: 1, name: 'Apple Vietnam', avatar: 'A', followers: '1.2M' },
    { id: 2, name: 'Theanh28 Entertainment', avatar: 'T', followers: '8.5M' },
  ];
  
  const myPages = [
    { id: 3, name: 'F8 - Học Lập Trình Để Đi Làm', avatar: 'F', followers: '500K' },
    { id: 4, name: 'J2TEAM Community', avatar: 'J', followers: '800K' },
  ];

  // -- Marketplace Mode Data --
  const shopSuggestions = [
    { id: 1, name: 'Ai2Hero Official Store', avatar: 'A', tag: 'Mall' },
    { id: 2, name: 'TechShop VN', avatar: 'T', tag: 'Yêu thích' },
  ];
  
  const hotProducts = [
    { id: 1, name: 'Tai Nghe Bluetooth Pro', price: '750.000đ', image: 'bg-pink-500/20' },
    { id: 2, name: 'Bàn Phím Cơ Gaming', price: '1.200.000đ', image: 'bg-orange-500/20' },
    { id: 3, name: 'Chuột Không Dây', price: '350.000đ', image: 'bg-blue-500/20' },
  ];

  return (
    <div className="flex flex-col gap-6 select-none text-white">
      
      {/* ---------------- MARKETPLACE MODE ---------------- */}
      {isMarketplacePage && (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Shop Nổi Bật
              </span>
            </div>
            <div className="space-y-3">
              {shopSuggestions.map((shop) => (
                <div key={shop.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all gap-2 cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-pink-500/20">
                      {shop.avatar}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white/90 truncate block">{shop.name}</span>
                      <span className="text-[10px] text-pink-400 font-bold block bg-pink-500/10 border border-pink-500/20 px-1 rounded inline-block mt-0.5">{shop.tag}</span>
                    </div>
                  </div>
                  <button className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-all border border-pink-500/10 cursor-pointer">
                    <Store className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Sản Phẩm Đang Hot
              </span>
            </div>
            <div className="space-y-3">
              {hotProducts.map((prod) => (
                <div key={prod.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all gap-2 cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-10 w-10 rounded-lg ${prod.image} border border-white/5 flex items-center justify-center font-bold text-white text-xs`}>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white/90 truncate block">{prod.name}</span>
                      <span className="text-xs text-orange-400 font-bold block">{prod.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ---------------- GROUP DETAIL MODE ---------------- */}
      {isGroupDetail && (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Gợi ý vào nhóm
              </span>
            </div>
            <div className="space-y-3">
              {groupSuggestions.map((group) => (
                <div key={group.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all gap-2 cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                      {group.avatar}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white/90 truncate block">{group.name}</span>
                      <span className="text-[10px] text-white/40 block">{group.members} thành viên</span>
                    </div>
                  </div>
                  <button className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all border border-blue-500/10 cursor-pointer">
                    <Users className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Nhóm đang tham gia ({myGroups.length})
              </span>
            </div>
            <div className="space-y-3">
              {myGroups.map((group) => (
                <div key={group.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all gap-2 cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white text-xs">
                      {group.avatar}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white/90 truncate block">{group.name}</span>
                      <span className="text-[10px] text-white/40 block">{group.members} thành viên</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ---------------- PAGE DETAIL MODE ---------------- */}
      {!isGroupDetail && isPageDetail && (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Gợi ý like Page
              </span>
            </div>
            <div className="space-y-3">
              {pageSuggestions.map((page) => (
                <div key={page.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all gap-2 cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs">
                      {page.avatar}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white/90 truncate block">{page.name}</span>
                      <span className="text-[10px] text-white/40 block">{page.followers} người theo dõi</span>
                    </div>
                  </div>
                  <button className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-all border border-pink-500/10 cursor-pointer">
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Page đang theo dõi ({myPages.length})
              </span>
            </div>
            <div className="space-y-3">
              {myPages.map((page) => (
                <div key={page.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all gap-2 cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-xs">
                        {page.avatar}
                      </div>
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-blue-500 border border-[#0f0f10] shadow-sm flex items-center justify-center">
                        <Radio className="h-1.5 w-1.5 text-white" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white/90 truncate block">{page.name}</span>
                      <span className="text-[10px] text-white/40 block">{page.followers} người theo dõi</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ---------------- DEFAULT MODE (Friends & Active) ---------------- */}
      {!isGroupDetail && !isPageDetail && !isMarketplacePage && (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Gợi ý kết bạn
              </span>
            </div>
            
            <div className="space-y-3">
              {friendSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-xs">
                      {suggestion.avatar}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white/90 truncate block">
                        {suggestion.name}
                      </span>
                      <span className="text-[10px] text-white/40 block">
                        {suggestion.mutualFriends} bạn chung
                      </span>
                    </div>
                  </div>
                  <button className="p-1 rounded-lg bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-all border border-pink-500/10 cursor-pointer">
                    <UserPlus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Đang hoạt động ({processedContacts.filter(c => c.isOnline).length})
              </span>
            </div>

            <div className="space-y-3">
              {processedContacts.length === 0 ? (
                <div className="text-xs text-white/30 px-1 py-2">
                  Chưa có bạn bè nào.
                </div>
              ) : (
                processedContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all gap-2 cursor-pointer">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        {contact.avatarUrl && (contact.avatarUrl.startsWith('http') || contact.avatarUrl.startsWith('/')) ? (
                          <img
                            src={contact.avatarUrl}
                            alt={contact.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-xs">
                            {contact.avatar}
                          </div>
                        )}
                        {contact.isOnline && (
                          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-[#0f0f10] shadow-sm animate-pulse" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white/90 truncate block">
                          {contact.name}
                        </span>
                        <span className="text-[10px] text-white/40 block truncate max-w-[150px]">
                          {contact.role}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}