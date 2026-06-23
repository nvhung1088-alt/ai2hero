'use client';

import React from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { markNotificationAsReadAction, markAllNotificationsAsReadAction } from '@/lib/db/notification-actions';
import { useRouter } from 'next/navigation';
import { Check, Settings, BellRing } from 'lucide-react';

export function NotificationsClient() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  
  const { data: notifData, isLoading } = useSWR('/api/notifications', fetcher, { refreshInterval: 30000 });
  const notificationsList = notifData?.notifications || [];

  const handleNotifClick = async (id: number) => {
    const notif = notificationsList.find((n: any) => n.id === id);
    await markNotificationAsReadAction(id);
    mutate('/api/notifications');
    if (notif && notif.url) {
      router.push(notif.url);
    }
  };

  const markAllAsRead = async () => {
    await markAllNotificationsAsReadAction();
    mutate('/api/notifications');
  };

  return (
    <div className="flex justify-center w-full min-h-[calc(100vh-3.5rem)] bg-[#0f0f10] text-white py-6">
      <div className="w-full max-w-[1000px] flex gap-6 px-4">
        {/* Cột trái - Danh sách thông báo */}
        <div className="flex-1 bg-[#161618] border border-white/5 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[calc(100vh-6rem)]">
          <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#161618] z-10 sticky top-0">
            <h2 className="text-xl font-bold">Thông báo</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : notificationsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-white/40">
                <BellRing className="w-12 h-12 mb-4 opacity-20" />
                <p>Bạn chưa có thông báo nào.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notificationsList.map((notif: any) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif.id)}
                    className={`w-full text-left p-4 rounded-xl hover:bg-white/5 transition-all flex gap-4 items-center ${!notif.read ? 'bg-pink-500/5' : ''}`}
                  >
                    <Avatar className="h-14 w-14 border border-white/10 shrink-0">
                      {notif.fromAvatar !== '👤' ? (
                        <AvatarImage src={notif.fromAvatar} alt="Avatar" className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-white/10 text-white">👤</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] text-white/90 leading-tight mb-1 ${!notif.read ? 'font-bold' : ''}`}>
                        {notif.content}
                      </p>
                      <span className={`text-[13px] ${!notif.read ? 'text-pink-500 font-medium' : 'text-white/40'}`}>
                        {notif.timestamp}
                      </span>
                    </div>
                    
                    {!notif.read && (
                      <div className="w-3 h-3 bg-pink-500 rounded-full shrink-0 shadow-[0_0_8px_rgba(236,72,153,0.8)]"></div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cột phải - Cài đặt */}
        <div className="w-[320px] shrink-0 hidden lg:flex flex-col gap-4">
          <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 shadow-xl">
            <h3 className="font-bold text-lg mb-4">Quản lý</h3>
            <div className="space-y-2">
              <button 
                onClick={markAllAsRead}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-white/70" />
                </div>
                <span className="font-medium text-[15px]">Đánh dấu tất cả đã đọc</span>
              </button>
              
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5 text-white/70" />
                </div>
                <span className="font-medium text-[15px]">Cài đặt thông báo</span>
              </button>
            </div>
          </div>
          
          <div className="text-xs text-white/30 text-center px-4 mt-4">
            <p>Hệ thống tự động đồng bộ trạng thái giữa các thiết bị mỗi 5 giây.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
