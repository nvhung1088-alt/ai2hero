'use client';

import React, { useEffect, useState } from 'react';
import { Users, MoreHorizontal, X, UserPlus, ChevronRight, Loader2, Check } from 'lucide-react';
import { getSuggestionsAction, sendFriendRequestAction } from '@/lib/db/social-friend-actions';

export function SuggestedFriendsBox() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestSent, setRequestSent] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const res = await getSuggestionsAction();
        if (res.data) {
          setSuggestions(res.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải danh sách gợi ý', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSuggestions();
  }, []);

  const handleSendRequest = async (id: number) => {
    try {
      // Optimistic UI update
      setRequestSent(prev => ({ ...prev, [id]: true }));
      const res = await sendFriendRequestAction(id);
      if (res?.error) {
        // Revert on error
        setRequestSent(prev => ({ ...prev, [id]: false }));
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(res.error, 'error');
        }
      } else {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast('Đã gửi lời mời kết bạn', 'success');
        }
      }
    } catch (error) {
      setRequestSent(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRemoveSuggestion = (id: number) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  // Ẩn box nếu không có gợi ý nào sau khi tải xong
  if (!isLoading && suggestions.length === 0) return null;

  return (
    <div className="bg-[#161618] rounded-2xl border border-white/5 overflow-hidden mb-4 animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-300" />
          <h3 className="font-semibold text-[17px] text-white">Những người bạn có thể biết</h3>
        </div>
        <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors cursor-pointer">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* List */}
      <div className="px-4 pb-4 pt-2 relative min-h-[180px]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 snap-x [&::-webkit-scrollbar]:hidden">
              {suggestions.map((friend) => (
                <div key={friend.id} className="relative flex-none w-[160px] bg-[#242526] rounded-[10px] border border-white/10 overflow-hidden flex flex-col snap-start group shadow-sm transition-transform duration-300">
                  {/* Nút X xoá gợi ý */}
                  <button 
                    onClick={() => handleRemoveSuggestion(friend.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white z-10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="h-[160px] w-full overflow-hidden bg-[#1c1c1e]">
                    <img 
                      src={friend.avatarUrl || '/placeholder-user.jpg'} 
                      alt={friend.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold text-[15px] text-white leading-tight line-clamp-1" title={friend.name}>{friend.name}</h4>
                      <p className="text-[12px] text-gray-400 mt-1 line-clamp-1">{friend.bio || friend.email}</p>
                    </div>
                    {requestSent[friend.id] ? (
                      <button disabled className="w-full mt-3 py-1.5 bg-white/10 text-white rounded-md font-semibold text-[13px] flex items-center justify-center gap-1.5 opacity-80 cursor-not-allowed">
                        <Check className="w-4 h-4" />
                        Đã gửi
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleSendRequest(friend.id)}
                        className="w-full mt-3 py-1.5 bg-[#2D88FF]/10 hover:bg-[#2D88FF]/20 text-[#2D88FF] rounded-md font-semibold text-[13px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        Thêm bạn bè
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Nút cuộn phải */}
            {suggestions.length > 2 && (
              <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 w-12 h-12 rounded-full bg-[#3E4042] hover:bg-[#4E5052] flex items-center justify-center text-white shadow-xl z-10 hidden sm:flex border border-white/10 cursor-pointer pointer-events-none">
                <ChevronRight className="w-7 h-7" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {!isLoading && suggestions.length > 0 && (
        <div className="px-4 py-3 border-t border-white/10">
          <button className="w-full py-1 hover:bg-white/5 rounded-md text-[#2D88FF] font-semibold text-[15px] transition-colors cursor-pointer">
            Xem tất cả
          </button>
        </div>
      )}
    </div>
  );
}
