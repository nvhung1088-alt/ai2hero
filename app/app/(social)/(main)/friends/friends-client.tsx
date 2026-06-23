'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import {
  UserPlus,
  Search,
  MessageSquare
} from 'lucide-react';
import {
  sendFriendRequestAction,
  acceptFriendRequestAction,
  rejectFriendRequestAction,
  unfriendAction
} from '@/lib/db/social-friend-actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Friend {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  friendshipId: number;
  bio: string;
  location: string;
}

interface PendingRequest {
  friendshipId: number;
  requesterId: number;
  name: string;
  avatarUrl: string | null;
  bio: string;
  createdAt: Date;
}

interface Suggestion {
  id: number;
  name: string;
  avatarUrl: string | null;
  bio: string;
}

interface FriendsClientProps {
  user: any;
  initialFriends: Friend[];
  initialPendingRequests: PendingRequest[];
  initialSuggestions: Suggestion[];
}

export function FriendsClient({
  user,
  initialFriends,
  initialPendingRequests,
  initialSuggestions
}: FriendsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'list' | 'requests' | 'suggestions'>('list');
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>(initialPendingRequests);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initialSuggestions);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Trạng thái loading của từng nút bấm để hiển thị spinner riêng biệt
  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>({});

  const setProcessing = (key: string, val: boolean) => {
    setProcessingIds((prev) => ({ ...prev, [key]: val }));
  };

  // 1. Thao tác gửi lời mời kết bạn (Add Friend)
  const handleSendRequest = async (targetId: number) => {
    const key = `send-${targetId}`;
    setProcessing(key, true);
    try {
      const res = await sendFriendRequestAction(targetId);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast('Đã gửi lời mời kết bạn!', 'success');
        setSuggestions(prev => prev.filter(s => s.id !== targetId));
      }
    } catch (e) {
      showToast('Lỗi gửi yêu cầu kết bạn', 'error');
    } finally {
      setProcessing(key, false);
    }
  };

  // 2. Chấp nhận kết bạn
  const handleAcceptRequest = async (requesterId: number) => {
    const key = `accept-${requesterId}`;
    setProcessing(key, true);
    try {
      const res = await acceptFriendRequestAction(requesterId);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast('Đã chấp nhận kết bạn!', 'success');
        setPendingRequests(prev => prev.filter(r => r.requesterId !== requesterId));
        router.refresh();
      }
    } catch (e) {
      showToast('Lỗi chấp nhận kết bạn', 'error');
    } finally {
      setProcessing(key, false);
    }
  };

  // 3. Từ chối lời mời
  const handleRejectRequest = async (requesterId: number) => {
    const key = `reject-${requesterId}`;
    setProcessing(key, true);
    try {
      const res = await rejectFriendRequestAction(requesterId);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast('Đã từ chối lời mời kết bạn.', 'info');
        setPendingRequests(prev => prev.filter(r => r.requesterId !== requesterId));
      }
    } catch (e) {
      showToast('Lỗi từ chối kết bạn', 'error');
    } finally {
      setProcessing(key, false);
    }
  };

  // 4. Hủy kết bạn
  const handleUnfriend = async (friendId: number) => {
    if (!confirm('Bạn có chắc chắn muốn hủy kết bạn với người này?')) return;
    const key = `unfriend-${friendId}`;
    setProcessing(key, true);
    try {
      const res = await unfriendAction(friendId);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast('Đã hủy kết bạn.', 'info');
        setFriends(prev => prev.filter(f => f.id !== friendId));
      }
    } catch (e) {
      showToast('Lỗi hủy kết bạn', 'error');
    } finally {
      setProcessing(key, false);
    }
  };

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] bg-transparent text-white p-4">
        <div className="bg-[#161618] border border-white/5 p-8 rounded-3xl flex flex-col items-center max-w-md text-center space-y-4 shadow-2xl">
          <div className="h-20 w-20 bg-pink-500/10 rounded-full flex items-center justify-center mb-2">
            <UserPlus className="h-10 w-10 text-pink-500" />
          </div>
          <h2 className="text-2xl font-black">Kết nối bạn bè</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            Đăng nhập để xem danh sách bạn bè, quản lý lời mời kết bạn và khám phá những người bạn có thể biết trên mạng xã hội AI2Hero.
          </p>
          <Button 
            onClick={() => {
              if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
            }}
            className="bg-pink-500 hover:bg-pink-600 text-white font-bold px-8 py-6 rounded-2xl w-full mt-4 text-base transition-transform active:scale-95 shadow-lg shadow-pink-500/20"
          >
            Đăng nhập ngay
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col md:flex-row text-white min-h-[calc(100vh-3.5rem)]">
      {/* Sidebar - w-full on mobile, 360px sticky on desktop */}
      <div className="w-full md:w-[360px] bg-[#161618] border-r border-white/5 p-4 md:shrink-0 h-[calc(100vh-3.5rem)] overflow-y-auto md:sticky md:top-[3.5rem] space-y-4">
        <div>
          <h1 className="text-2xl font-black text-white px-2 py-1">Bạn bè</h1>
        </div>

        {/* Search Input for List Tab (moved to sidebar top) */}
        <div className="relative px-2">
          <Search className="absolute left-5 top-2.5 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Tìm kiếm bạn bè..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-pink-500/50"
          />
        </div>

        {/* Vertical Menu instead of horizontal tabs */}
        <div className="space-y-1.5 pt-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'list' 
                ? 'bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/20' 
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>Tất cả bạn bè</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'list' ? 'bg-white/20' : 'bg-white/5 text-white/40'}`}>
              {friends.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'requests' 
                ? 'bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/20' 
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>Yêu cầu kết bạn</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              pendingRequests.length > 0 
                ? (activeTab === 'requests' ? 'bg-white text-pink-600' : 'bg-pink-500 text-white') 
                : 'bg-white/5 text-white/40'
            }`}>
              {pendingRequests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('suggestions')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'suggestions' 
                ? 'bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/20' 
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>Gợi ý kết bạn</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'suggestions' ? 'bg-white/20' : 'bg-white/5 text-white/40'}`}>
              {suggestions.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Grid - displays standard Facebook Square Card layout */}
      <div className="flex-1 py-8 px-4 sm:px-8 space-y-4 bg-transparent">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider">
            {activeTab === 'list' && 'Tất cả bạn bè'}
            {activeTab === 'requests' && 'Yêu cầu kết bạn chờ duyệt'}
            {activeTab === 'suggestions' && 'Những người bạn có thể biết'}
          </h2>
        </div>

        {/* Tab List */}
        {activeTab === 'list' && (
          <div>
            {filteredFriends.length === 0 ? (
              <div className="text-center py-20 bg-[#161618]/40 border border-white/5 rounded-2xl text-white/40 text-sm">
                Không tìm thấy bạn bè nào khớp với từ khóa tìm kiếm.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                {filteredFriends.map((friend) => {
                  const initial = friend.name.charAt(0).toUpperCase();
                  return (
                    <div 
                      key={friend.id} 
                      className="bg-[#161618] border border-white/5 rounded-lg overflow-hidden flex flex-col h-full hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Big Square Avatar Top */}
                      <div className="aspect-square bg-gray-900 w-full relative shrink-0 overflow-hidden cursor-pointer" onClick={() => router.push(`/profile/${friend.id}`)}>
                        {friend.avatarUrl ? (
                          <img src={friend.avatarUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={friend.name} />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-3xl font-black bg-gradient-to-br from-pink-500 to-rose-600 text-white select-none">
                            {initial}
                          </div>
                        )}
                      </div>
                      
                      {/* Card Content & Action Buttons */}
                      <div className="p-4 flex flex-col flex-1 justify-between gap-4">
                        <div className="space-y-1">
                          <Link href={`/profile/${friend.id}`} className="text-sm font-bold text-white hover:text-pink-400 truncate block">
                            {friend.name}
                          </Link>
                          <p className="text-[10px] text-white/40 truncate">{friend.email}</p>
                          {friend.bio && (
                            <p className="text-xs text-white/60 line-clamp-2 mt-1 leading-relaxed">{friend.bio}</p>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 w-full pt-1">
                          <Button
                            onClick={() => router.push(`/messages?userId=${friend.id}`)}
                            size="sm"
                            className="bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs rounded-lg w-full"
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Nhắn tin
                          </Button>
                          <Button
                            onClick={() => handleUnfriend(friend.id)}
                            disabled={processingIds[`unfriend-${friend.id}`]}
                            variant="secondary"
                            size="sm"
                            className="text-xs rounded-lg w-full bg-white/10 hover:bg-white/20 text-white border-0"
                          >
                            Hủy kết bạn
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Requests */}
        {activeTab === 'requests' && (
          <div>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-20 bg-[#161618]/40 border border-white/5 rounded-2xl text-white/40 text-sm">
                Không có yêu cầu kết bạn nào cần xử lý.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                {pendingRequests.map((req) => {
                  const initial = req.name.charAt(0).toUpperCase();
                  return (
                    <div 
                      key={req.friendshipId} 
                      className="bg-[#161618] border border-white/5 rounded-lg overflow-hidden flex flex-col h-full hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Big Square Avatar Top */}
                      <div className="aspect-square bg-gray-900 w-full relative shrink-0 overflow-hidden cursor-pointer" onClick={() => router.push(`/profile/${req.requesterId}`)}>
                        {req.avatarUrl ? (
                          <img src={req.avatarUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={req.name} />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-3xl font-black bg-gradient-to-br from-pink-500 to-rose-600 text-white select-none">
                            {initial}
                          </div>
                        )}
                      </div>
                      
                      {/* Card Content & Action Buttons */}
                      <div className="p-4 flex flex-col flex-1 justify-between gap-4">
                        <div className="space-y-1">
                          <Link href={`/profile/${req.requesterId}`} className="text-sm font-bold text-white hover:text-pink-400 truncate block">
                            {req.name}
                          </Link>
                          <p className="text-[10px] text-white/40">
                            Yêu cầu ngày {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-2 w-full pt-1">
                          <Button
                            onClick={() => handleAcceptRequest(req.requesterId)}
                            disabled={processingIds[`accept-${req.requesterId}`]}
                            size="sm"
                            className="bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs rounded-lg w-full"
                          >
                            Xác nhận
                          </Button>
                          <Button
                            onClick={() => handleRejectRequest(req.requesterId)}
                            disabled={processingIds[`reject-${req.requesterId}`]}
                            variant="secondary"
                            size="sm"
                            className="bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg w-full"
                          >
                            Xóa yêu cầu
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Suggestions */}
        {activeTab === 'suggestions' && (
          <div>
            {suggestions.length === 0 ? (
              <div className="text-center py-20 bg-[#161618]/40 border border-white/5 rounded-2xl text-white/40 text-sm">
                Không tìm thấy gợi ý kết bạn nào.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                {suggestions.map((sug) => {
                  const initial = sug.name.charAt(0).toUpperCase();
                  return (
                    <div 
                      key={sug.id} 
                      className="bg-[#161618] border border-white/5 rounded-lg overflow-hidden flex flex-col h-full hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Big Square Avatar Top */}
                      <div className="aspect-square bg-gray-900 w-full relative shrink-0 overflow-hidden cursor-pointer" onClick={() => router.push(`/profile/${sug.id}`)}>
                        {sug.avatarUrl ? (
                          <img src={sug.avatarUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={sug.name} />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-3xl font-black bg-gradient-to-br from-pink-500 to-rose-600 text-white select-none">
                            {initial}
                          </div>
                        )}
                      </div>
                      
                      {/* Card Content & Action Buttons */}
                      <div className="p-4 flex flex-col flex-1 justify-between gap-4">
                        <div className="space-y-1">
                          <Link href={`/profile/${sug.id}`} className="text-sm font-bold text-white hover:text-pink-400 truncate block">
                            {sug.name}
                          </Link>
                          <p className="text-xs text-white/40 line-clamp-2 mt-1 leading-relaxed">
                            {sug.bio || 'Chưa cập nhật tiểu sử'}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-2 w-full pt-1">
                          <Button
                            onClick={() => handleSendRequest(sug.id)}
                            disabled={processingIds[`send-${sug.id}`]}
                            size="sm"
                            className="bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs rounded-xl w-full"
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Kết bạn
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}