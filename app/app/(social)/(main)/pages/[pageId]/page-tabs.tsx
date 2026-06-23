'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Globe, 
  Mail, 
  Phone,
  Info,
  MapPin,
  Clock,
  Star,
  Store
} from 'lucide-react';

interface PageTabsProps {
  currentUser: any;
  pageData: any;
  initialPosts: any[];
  isAdmin: boolean;
}

export function PageTabs({
  currentUser,
  pageData,
  initialPosts,
  isAdmin,
}: PageTabsProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'followers' | 'photos' | 'videos' | 'shop'>(
    tabParam === 'shop' ? 'shop' : 'posts'
  );
  const [feedPosts, setFeedPosts] = useState<any[]>(initialPosts);

  useEffect(() => {
    setFeedPosts(initialPosts);
  }, [initialPosts]);

  const userRole = isAdmin ? 'admin' : 'viewer';

  const handleLike = async (postId: number, reactionType?: string) => {
    if (!currentUser) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    showToast('Liked post (mock)', 'success');
  };

  const handleCommentAdded = async (postId: number, comment: any) => {
    if (!currentUser) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    showToast('Added comment (mock)', 'success');
  };

  const handlePinToggle = async (postId: number) => {
    if (!currentUser) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    showToast('Toggled pin (mock)', 'success');
  };

  const handleTaskStatusChange = async (postId: number, status: any) => {
    if (!currentUser) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    showToast('Task status changed (mock)', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex gap-4 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('posts')}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'posts' ? 'border-blue-500 text-white' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          Bài viết
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'about' ? 'border-blue-500 text-white' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          Giới thiệu
        </button>
        <button
          onClick={() => setActiveTab('followers')}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'followers' ? 'border-blue-500 text-white' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          Người theo dõi
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'photos' ? 'border-blue-500 text-white' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          Ảnh
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'videos' ? 'border-blue-500 text-white' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          Video
        </button>
        <button
          onClick={() => setActiveTab('shop')}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'shop' ? 'border-orange-500 text-orange-400' : 'border-transparent text-orange-500/60 hover:text-orange-400'
          }`}
        >
          <Store className="w-4 h-4" /> Cửa hàng
        </button>
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
                  {pageData.bio || 'Chưa có tiểu sử.'}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-3 text-sm">
                  <Info className="h-4.5 w-4.5 text-white/40" />
                  <div>
                    <span className="text-white/40">Trang:</span>{' '}
                    <span className="text-white/80 font-medium">{pageData.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4.5 w-4.5 text-white/40" />
                  <div>
                    <span className="text-white/80 font-medium">{pageData.address || 'Chưa cập nhật địa chỉ'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4.5 w-4.5 text-white/40" />
                  <div>
                    <span className="text-white/80 font-medium">{pageData.phone || 'Chưa cập nhật'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4.5 w-4.5 text-white/40" />
                  <div>
                    <span className="text-white/80 font-medium">{pageData.email || 'Chưa cập nhật'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Globe className="h-4.5 w-4.5 text-white/40" />
                  <div>
                    {pageData.website ? (
                      <a href={pageData.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        {pageData.website}
                      </a>
                    ) : (
                      <span className="text-white/80 font-medium">Chưa cập nhật website</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Star className="h-4.5 w-4.5 text-yellow-500" />
                  <div>
                    <span className="text-white/80 font-medium">Đánh giá {pageData.rating}/5</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tính minh bạch của Trang */}
            <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white">Tính minh bạch của Trang</h3>
              <p className="text-xs text-white/40">Facebook hiển thị thông tin để bạn hiểu rõ hơn về mục đích của Trang này.</p>
              <div className="flex items-center gap-3 text-sm mt-3">
                <Clock className="h-4.5 w-4.5 text-white/40" />
                <div>
                  <span className="text-white/40">Đã tạo Trang vào</span>{' '}
                  <span className="text-white/80 font-medium">{pageData.createdAt ? new Date(pageData.createdAt).toLocaleDateString('vi-VN') : 'Không rõ'}</span>
                </div>
              </div>
            </div>

            {/* Box Ảnh */}
            <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 onClick={() => setActiveTab('photos')} className="text-sm font-bold text-white hover:underline cursor-pointer">Ảnh</h3>
                <span onClick={() => setActiveTab('photos')} className="text-sm text-blue-500 hover:underline cursor-pointer">Xem tất cả ảnh</span>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`empty-p-${i}`} className="aspect-square bg-white/[0.02] border border-white/[0.02]"></div>
                ))}
              </div>
            </div>
          </div>

          {/* Cột phải: Feed */}
          <div className="lg:col-span-8 space-y-6">
            {isAdmin && (
              <FeedPostCreator
                user={currentUser}
                teams={[{ id: pageData.id, name: pageData.name, avatar: pageData.avatarUrl || '🏢' }]}
                userRole="admin"
                initialPublishTeamId={pageData.id}
                targetType="page"
                onPostCreated={() => {
                  window.location.reload();
                }}
              />
            )}

            <div className="space-y-4">
              {feedPosts.length === 0 ? (
                <div className="text-center py-12 bg-[#161618] border border-white/5 rounded-2xl text-white/40">
                  Trang chưa có bài viết nào.
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
          <h2 className="text-lg font-bold text-white border-b border-white/5 pb-3">Giới thiệu về Trang</h2>
          <div className="text-white/80 bg-white/5 p-4 rounded-xl text-sm leading-relaxed">
            {pageData.bio}
          </div>
        </div>
      )}

      {/* Tab Follower */}
      {activeTab === 'followers' && (
        <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white border-b border-white/5 pb-3">Người theo dõi</h2>
          <div className="text-center py-12 text-white/44 bg-white/5 rounded-2xl border border-white/5">
            Danh sách người theo dõi.
          </div>
        </div>
      )}
      
      {/* Tab Ảnh / Video */}
      {(activeTab === 'photos' || activeTab === 'videos') && (
        <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-lg font-bold text-white">{activeTab === 'photos' ? 'Ảnh' : 'Video'}</h2>
          </div>
          <div className="text-center py-12 text-white/44 bg-white/5 rounded-2xl border border-white/5">
            Chưa có hình ảnh/video nào được đăng tải.
          </div>
        </div>
      )}

      {/* Tab Cửa Hàng (Shop) */}
      {activeTab === 'shop' && (
        <ShopIntegratedTab />
      )}
    </div>
  );
}
