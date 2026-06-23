'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FeedPostCreator from '@/components/feed-post-creator';
import FeedPostCard from '@/components/feed-post/feed-post-card';
import { ShopIntegratedTab } from '@/components/marketplace/shop/shop-integrated-tab';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { 
  toggleFeedLikeAction, 
  addFeedCommentAction, 
  toggleFeedPinAction, 
  changeTaskStatusAction 
} from '@/app/(login)/actions';
import { 
  Calendar, 
  MapPin, 
  Globe, 
  Heart,
  Store
} from 'lucide-react';
import { type RoleKey } from '@/lib/shared-constants';

interface ProfileTabsProps {
  currentUser: any;
  targetUser: any;
  profile: any;
  initialPosts: any[];
  isOwnProfile: boolean;
  topFriends?: any[];
  latestPhotos?: any[];
  initialShop?: any;
  initialShopProducts?: any[];
}

export function ProfileTabs({
  currentUser,
  targetUser,
  profile,
  initialPosts,
  isOwnProfile,
  topFriends = [],
  latestPhotos = [],
  initialShop = null,
  initialShopProducts = []
}: ProfileTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'friends' | 'photos' | 'videos' | 'shop'>(
    tabParam === 'shop' && initialShop ? 'shop' : 'posts'
  );
  const [feedPosts, setFeedPosts] = useState<any[]>(initialPosts);

  // Đồng bộ posts từ server-side
  useEffect(() => {
    setFeedPosts(initialPosts);
  }, [initialPosts]);

  // Determine user role in active team (default to editor)
  const userRole = useMemo<any>(() => {
    return 'editor';
  }, []);

  const handleLike = async (postId: number, reactionType?: string) => {
    if (!currentUser) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    try {
      const res = await toggleFeedLikeAction({ postId, reactionType });
      if (res.error) showToast(res.error, 'error');
      else {
        setFeedPosts(prev => prev.map(p => {
          if (p.id === postId) {
            const liked = res.liked;
            const rType = res.reactionType;
            let nextLikesCount = p.likesCount;
            if (p.likedByMe !== liked) {
              nextLikesCount = liked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1);
            }
            const nextSummary = { ...(p.reactionsSummary || {}) };
            if (p.likedByMe && p.myReactionType) {
              nextSummary[p.myReactionType] = Math.max(0, (nextSummary[p.myReactionType] || 0) - 1);
              if (nextSummary[p.myReactionType] === 0) delete nextSummary[p.myReactionType];
            }
            if (liked && rType) {
              nextSummary[rType] = (nextSummary[rType] || 0) + 1;
            }
            return {
              ...p,
              likedByMe: liked,
              myReactionType: rType,
              likesCount: nextLikesCount,
              reactionsSummary: nextSummary
            };
          }
          return p;
        }));
      }
    } catch (e) {
      showToast('Lỗi khi thích bài viết', 'error');
    }
  };

  const handleCommentAdded = async (postId: number, comment: any) => {
    if (!currentUser) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    setFeedPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          commentsCount: p.commentsCount + 1,
          comments: [comment, ...(p.comments || [])]
        };
      }
      return p;
    }));
  };

  const handlePinToggle = async (postId: number) => {
    if (!currentUser) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    try {
      const res = await toggleFeedPinAction({ postId });
      if (res.error) showToast(res.error, 'error');
      else {
        setFeedPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, pinned: p.pinned === 1 ? 0 : 1 };
          }
          return p;
        }));
      }
    } catch (e) {
      showToast('Lỗi khi ghim bài viết', 'error');
    }
  };

  const handleTaskStatusChange = async (postId: number, status: any) => {
    if (!currentUser) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    try {
      const res = await changeTaskStatusAction({ postId, status });
      if (res.error) showToast(res.error, 'error');
      else {
        setFeedPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, taskStatus: status };
          }
          return p;
        }));
      }
    } catch (e) {
      showToast('Lỗi khi thay đổi trạng thái công việc', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex gap-4 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('posts')}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'posts' ? 'border-pink-500 text-white' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          Bài viết
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'about' ? 'border-pink-500 text-white' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          Giới thiệu
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'friends' ? 'border-pink-500 text-white' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          Bạn bè
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'photos' ? 'border-pink-500 text-white' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          Ảnh
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'videos' ? 'border-pink-500 text-white' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          Video
        </button>
        {initialShop && (
          <button
            onClick={() => setActiveTab('shop')}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'shop' ? 'border-orange-500 text-orange-400' : 'border-transparent text-orange-500/60 hover:text-orange-400'
            }`}
          >
            <Store className="w-4 h-4" /> Cửa hàng
          </button>
        )}
      </div>

      {/* Tab Contents */}
      {activeTab === 'posts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Thông tin cá nhân & Giới thiệu */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider">Giới thiệu</h3>
                <p className="text-sm text-center text-white/70 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                  {profile.bio || 'Chưa có tiểu sử.'}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4.5 w-4.5 text-white/40" />
                  <div>
                    <span className="text-white/40">Ngày sinh:</span>{' '}
                    <span className="text-white/80 font-medium">{profile.birthday || 'Chưa cập nhật'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4.5 w-4.5 text-white/40" />
                  <div>
                    <span className="text-white/40">Sống tại:</span>{' '}
                    <span className="text-white/80 font-medium">{profile.location || 'Chưa cập nhật'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Globe className="h-4.5 w-4.5 text-white/40" />
                  <div>
                    <span className="text-white/40">Website:</span>{' '}
                    {profile.website ? (
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">
                        {profile.website}
                      </a>
                    ) : (
                      <span className="text-white/80 font-medium">Chưa cập nhật</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Heart className="h-4.5 w-4.5 text-white/40" />
                  <div>
                    <span className="text-white/40">Mối quan hệ:</span>{' '}
                    <span className="text-white/80 font-medium">
                      {profile.relationship === 'single' && 'Độc thân'}
                      {profile.relationship === 'in_relationship' && 'Đang hẹn hò'}
                      {profile.relationship === 'engaged' && 'Đã đính hôn'}
                      {profile.relationship === 'married' && 'Đã kết hôn'}
                      {profile.relationship === 'complicated' && 'Mối quan hệ phức tạp'}
                      {profile.relationship === 'separated' && 'Ly thân'}
                      {profile.relationship === 'divorced' && 'Đã ly hôn'}
                      {profile.relationship === 'widowed' && 'Góa phụ/Góa phu'}
                      {!profile.relationship && 'Chưa cập nhật'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Box Ảnh */}
            <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 onClick={() => setActiveTab('photos')} className="text-sm font-bold text-white hover:underline cursor-pointer">Ảnh</h3>
                <span onClick={() => setActiveTab('photos')} className="text-sm text-pink-500 hover:underline cursor-pointer">Xem tất cả ảnh</span>
              </div>
              {latestPhotos && latestPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
                  {latestPhotos.map((photoUrl, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-white/5 hover:bg-white/10 transition-colors relative overflow-hidden group cursor-pointer"
                      onClick={() => setActiveTab('photos')}
                    >
                      <img src={photoUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={`Photo ${i}`} />
                    </div>
                  ))}
                  {latestPhotos.length < 9 && Array.from({ length: 9 - latestPhotos.length }).map((_, i) => (
                    <div key={`empty-p-${i}`} className="aspect-square bg-white/[0.02] border border-white/[0.02]"></div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-white/30 bg-white/[0.02] rounded-xl border border-white/5">
                  Chưa có ảnh nào.
                </div>
              )}
            </div>

            {/* Box Bạn bè */}
            <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 onClick={() => setActiveTab('friends')} className="text-sm font-bold text-white hover:underline cursor-pointer">Bạn bè</h3>
                  <span className="text-xs text-white/40">{topFriends ? topFriends.length : 0} người bạn</span>
                </div>
                <span onClick={() => setActiveTab('friends')} className="text-sm text-pink-500 hover:underline cursor-pointer">Xem tất cả bạn bè</span>
              </div>
              {topFriends && topFriends.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {topFriends.map((friend) => (
                    <div key={friend.id} onClick={() => router.push(`/profile/${friend.id}`)} className="flex flex-col gap-1 cursor-pointer group">
                      <div className="aspect-square bg-gray-900 rounded-xl overflow-hidden relative group-hover:opacity-80 transition-opacity">
                        {friend.avatarUrl ? (
                          <img src={friend.avatarUrl} className="w-full h-full object-cover" alt={friend.name} />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-pink-500 to-rose-600 text-white">
                            {friend.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-white/80 group-hover:underline truncate">{friend.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-white/30 bg-white/[0.02] rounded-xl border border-white/5">
                  Chưa có bạn bè.
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Feed */}
          <div className="lg:col-span-8 space-y-6">
            {isOwnProfile && (
              <FeedPostCreator
                user={currentUser}
                teams={[{ id: 0, name: 'Dòng thời gian', avatar: '👤' }]}
                userRole="admin"
                initialPublishTeamId={0}
                onPostCreated={() => {
                  window.location.reload();
                }}
              />
            )}

            <div className="space-y-4">
              {feedPosts.length === 0 ? (
                <div className="text-center py-12 bg-[#161618] border border-white/5 rounded-2xl text-white/40">
                  Chưa có bài viết nào trên trang cá nhân này.
                </div>
              ) : (
                feedPosts.map((post) => (
                  <FeedPostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUser?.id || 0}
                    userRole={userRole}
                    onLike={(reactionType) => handleLike(post.id, reactionType)}
                    onCommentAdded={(comment: any) => handleCommentAdded(post.id, comment)}
                    onPinToggle={() => handlePinToggle(post.id)}
                    onTaskStatusChange={(status) => handleTaskStatusChange(post.id, status)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Giới thiệu */}
      {activeTab === 'about' && (
        <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white border-b border-white/5 pb-3">Giới thiệu</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 border-r border-white/5 pr-4 space-y-2">
              <div className="p-3 bg-white/5 rounded-xl text-sm font-semibold text-pink-500 cursor-pointer">Tổng quan</div>
              <div className="p-3 hover:bg-white/[0.02] rounded-xl text-sm font-semibold text-white/60 cursor-pointer transition-colors">Công việc và học vấn</div>
              <div className="p-3 hover:bg-white/[0.02] rounded-xl text-sm font-semibold text-white/60 cursor-pointer transition-colors">Nơi từng sống</div>
              <div className="p-3 hover:bg-white/[0.02] rounded-xl text-sm font-semibold text-white/60 cursor-pointer transition-colors">Thông tin liên hệ và cơ bản</div>
            </div>
            <div className="md:col-span-2 space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Tiểu sử</h3>
                <p className="text-sm text-white/80 bg-white/5 p-4 rounded-xl leading-relaxed">
                  {profile.bio || 'Chưa có tiểu sử nào được cập nhật.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-6">
                <div className="space-y-1">
                  <div className="text-xs text-white/40 font-semibold">NGÀY SINH</div>
                  <div className="text-sm text-white/90 font-medium">{profile.birthday || 'Chưa cập nhật'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-white/40 font-semibold">TỈNH/THÀNH PHỐ HIỆN TẠI</div>
                  <div className="text-sm text-white/90 font-medium">{profile.location || 'Chưa cập nhật'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-white/40 font-semibold">MỐI QUAN HỆ</div>
                  <div className="text-sm text-white/90 font-medium">
                    {profile.relationship === 'single' && 'Độc thân'}
                    {profile.relationship === 'in_relationship' && 'Đang hẹn hò'}
                    {profile.relationship === 'engaged' && 'Đã đính hôn'}
                    {profile.relationship === 'married' && 'Đã kết hôn'}
                    {profile.relationship === 'complicated' && 'Mối quan hệ phức tạp'}
                    {profile.relationship === 'separated' && 'Ly thân'}
                    {profile.relationship === 'divorced' && 'Đã ly hôn'}
                    {profile.relationship === 'widowed' && 'Góa phụ/Góa phu'}
                    {!profile.relationship && 'Chưa cập nhật'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-white/40 font-semibold">TRANG WEB</div>
                  <div className="text-sm text-white/90 font-medium">
                    {profile.website ? (
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">
                        {profile.website}
                      </a>
                    ) : (
                      'Chưa cập nhật'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Bạn bè */}
      {activeTab === 'friends' && (
        <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Bạn bè</h2>
              <p className="text-xs text-white/40 mt-0.5">{topFriends ? topFriends.length : 0} người bạn</p>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm bạn bè..."
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500 text-white placeholder-white/30 w-full sm:w-64"
              />
            </div>
          </div>

          {topFriends && topFriends.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topFriends.map((friend) => (
                <div
                  key={friend.id}
                  onClick={() => router.push(`/profile/${friend.id}`)}
                  className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl overflow-hidden bg-gray-900 shrink-0">
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} className="h-full w-full object-cover" alt={friend.name} />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-lg font-bold bg-gradient-to-br from-pink-500 to-rose-600 text-white">
                          {friend.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-pink-400 transition-colors text-sm">{friend.name}</h3>
                      <p className="text-xs text-white/40 mt-0.5 truncate max-w-[180px]">{friend.bio || 'Không có tiểu sử'}</p>
                    </div>
                  </div>
                  <button className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium text-xs px-3 py-1.5 rounded-lg">
                    Nhắn tin
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/44 bg-white/5 rounded-2xl border border-white/5">
              Chưa có bạn bè nào.
            </div>
          )}
        </div>
      )}

      {/* Tab Ảnh */}
      {activeTab === 'photos' && (
        <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-lg font-bold text-white">Ảnh</h2>
          </div>

          {latestPhotos && latestPhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {latestPhotos.map((photoUrl, i) => (
                <div
                  key={i}
                  className="aspect-square bg-white/5 border border-white/5 rounded-xl overflow-hidden hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer relative group"
                >
                  <img src={photoUrl} className="h-full w-full object-cover" alt={`Photo ${i}`} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-[10px] text-white/80 font-medium">Ảnh tải lên</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/44 bg-white/5 rounded-2xl border border-white/5">
              Chưa có hình ảnh nào được đăng tải.
            </div>
          )}
        </div>
      )}

      {/* Tab Video */}
      {activeTab === 'videos' && (
        <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-lg font-bold text-white">Video</h2>
          </div>
          <div className="text-center py-12 text-white/44 bg-white/5 rounded-2xl border border-white/5">
            Không tìm thấy video nào.
          </div>
        </div>
      )}

      {/* Tab Cửa Hàng (Shop) */}
      {activeTab === 'shop' && initialShop && (
        <ShopIntegratedTab shop={initialShop} products={initialShopProducts} />
      )}
    </div>
  );
}