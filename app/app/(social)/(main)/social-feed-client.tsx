'use client';

import React, { useState, useMemo, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import FeedPostCreator from '@/components/feed-post-creator';
import FeedPostCard from '@/components/feed-post/feed-post-card';
import { StoryReels } from '@/components/story-reels';
import { SuggestedFriendsBox } from '@/components/suggested-friends-box';
import { SuggestedReelsBox } from '@/components/suggested-reels-box';
import { ImportContentModal } from './components/import-content-modal';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { 
  toggleFeedLikeAction, 
  toggleFeedPinAction, 
  changeTaskStatusAction,
  loadMoreFeedAction
} from '@/app/(login)/actions';
import { markSingleAnnouncementAsReadAction } from '@/lib/db/notification-actions';
import { ShieldAlert, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { type RoleKey } from '@/lib/shared-constants';

interface SocialFeedClientProps {
  user: any;
  initialPosts: any[];
  teams: any[];
  userWithTeam: any;
  urgentAnnouncement?: any;
  activeTeamId: number;
  initialStories?: any[];
}

export function SocialFeedClient({
  user,
  initialPosts,
  teams,
  urgentAnnouncement,
  activeTeamId,
  initialStories = []
}: SocialFeedClientProps) {
  const router = useRouter();
  const [feedPosts, setFeedPosts] = useState<any[]>(() => [...initialPosts]);
  const [activeTab, setActiveTab] = useState<'all' | 'tasks' | 'news' | 'mvp' | 'system'>('all');
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = React.useRef<HTMLDivElement>(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Sync state with server-side props
  useEffect(() => {
    setFeedPosts([...initialPosts]);
  }, [initialPosts]);

  // Determine user role in active team
  const userRole = useMemo<RoleKey>(() => {
    if (!teams || teams.length === 0 || !activeTeamId) {
      return 'viewer';
    }
    const currentTeam = teams.find(t => t.id === activeTeamId);
    if (currentTeam) {
      const myMemberRecord = currentTeam.teamMembers?.find((m: any) => m.userId === user?.id);
      return (myMemberRecord?.role?.toLowerCase() as RoleKey) || 'viewer';
    }
    return 'viewer';
  }, [teams, activeTeamId, user?.id]);

  const handleLike = async (postId: number, reactionType?: string) => {
    if (!user) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    if (postId >= 999990) {
      setFeedPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const rType = reactionType || 'like';
          const isCurrentlyLiked = p.likedByMe && p.myReactionType === rType;
          const likedByMe = !isCurrentlyLiked;
          return {
            ...p,
            likedByMe,
            myReactionType: likedByMe ? rType : null,
            likes: likedByMe ? (p.likes || 0) + 1 : Math.max(0, (p.likes || 0) - 1)
          };
        }
        return p;
      }));
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
      showToast('Lỗi thích bài viết', 'error');
    }
  };

  const handleCommentAdded = async (postId: number, comment: any) => {
    if (!user) {
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
    if (!user) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    if (postId >= 999990) {
      setFeedPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, pinned: p.pinned === 1 ? 0 : 1, pinnedBy: p.pinned ? undefined : 'Quản trị viên' };
        }
        return p;
      }));
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
      showToast('Lỗi ghim bài viết', 'error');
    }
  };

  const handleTaskStatusChange = async (postId: number, status: any) => {
    if (!user) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    if (postId >= 999990) {
      setFeedPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, taskStatus: status };
        }
        return p;
      }));
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
      showToast('Lỗi thay đổi trạng thái công việc', 'error');
    }
  };

  const handleDismissBanner = async () => {
    if (urgentAnnouncement) {
      await markSingleAnnouncementAsReadAction(urgentAnnouncement.id);
    }
    setDismissedBanner(true);
  };

  // Filter posts based on activeTab
  const filteredPosts = useMemo(() => {
    return feedPosts.filter(post => {
      if (activeTab === 'all') return true;
      if (activeTab === 'tasks') return post.type === 'task_assignment';
      if (activeTab === 'news') return post.type === 'news';
      if (activeTab === 'mvp') return post.type === 'mvp_result';
      if (activeTab === 'system') return post.type === 'system_activity';
      return true;
    });
  }, [feedPosts, activeTab]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && activeTab === 'all') {
          loadMore();
        }
      },
      { threshold: 1.0, rootMargin: "100px" }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, feedPosts, activeTab]);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastPostId = feedPosts[feedPosts.length - 1]?.id;
    if (!lastPostId) {
       setIsLoadingMore(false);
       return;
    }
    try {
      const res = await loadMoreFeedAction(activeTeamId, lastPostId, 10);
      if (res.success && res.posts) {
        if (res.posts.length < 10) {
          setHasMore(false);
        }
        setFeedPosts(prev => {
          // Lọc trùng lặp
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = res.posts.filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6 text-white">
      {/* Urgent Announcement Banner */}
      {urgentAnnouncement && !dismissedBanner && (
        <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-2xl flex items-start justify-between gap-4 animate-pulse">
          <div className="flex gap-3 items-start min-w-0">
            <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white">Thông báo quan trọng từ quản trị viên</h4>
              <p className="text-xs text-white/80 mt-1 leading-relaxed">{urgentAnnouncement.message}</p>
            </div>
          </div>
          <button
            onClick={handleDismissBanner}
            className="text-white/40 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/5 shrink-0"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      )}

      {/* Post Creator Section */}
      <FeedPostCreator
        user={user}
        teams={teams}
        userRole={userRole}
        initialPublishTeamId={activeTeamId}
        onPostCreated={() => {
          
          router.refresh();
        }}
      />

      {/* Story Reels Section */}
      <StoryReels 
        user={{ id: user?.id?.toString() || '1', name: user?.name || 'User', avatar: user?.avatarUrl || user?.avatar || null }} 
        initialStories={initialStories}
        activeTeamId={activeTeamId}
      />

      {/* Filter Tabs and Action Buttons */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 p-1 bg-[#161618] border border-white/5 rounded-xl max-w-lg">
          <button
            onClick={() => { setActiveTab('all');  }}
          className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'all' ? 'bg-pink-500 text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          Tất cả
        </button>
        <button
          onClick={() => { setActiveTab('news');  }}
          className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'news' ? 'bg-pink-500 text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          Bảng tin
        </button>
        <button
          onClick={() => { setActiveTab('tasks');  }}
          className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'tasks' ? 'bg-pink-500 text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          Công việc
        </button>
        <button
          onClick={() => { setActiveTab('mvp');  }}
          className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'mvp' ? 'bg-pink-500 text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          MVP Apps
        </button>
        <button
          onClick={() => { setActiveTab('system'); }}
          className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'system' ? 'bg-pink-500 text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          Hệ thống
        </button>
      </div>

      {userRole === 'owner' || userRole === 'admin' ? (
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-sm font-semibold transition-colors cursor-pointer shrink-0"
        >
          🔄 Kéo Nội Dung Về
        </button>
      ) : null}
      </div>

      <ImportContentModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        teamId={activeTeamId}
      />

      {/* Posts list */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16 bg-[#161618] border border-white/5 rounded-2xl text-white/40">
            Không tìm thấy bài viết nào phù hợp.
          </div>
        ) : (
          filteredPosts.map((post, index) => (
            <Fragment key={post.id}>
              <FeedPostCard
                post={post}
                currentUserId={user?.id || 0}
                userRole={userRole}
                onLike={(reactionType) => handleLike(post.id, reactionType)}
                onCommentAdded={(comment: any) => handleCommentAdded(post.id, comment)}
                onPinToggle={() => handlePinToggle(post.id)}
                onTaskStatusChange={(status) => handleTaskStatusChange(post.id, status)}
              />
              
              {/* Box Gợi ý kết bạn chèn sau bài viết đầu tiên */}
              {index === 0 && <SuggestedFriendsBox />}
              
              {/* Box Reels chèn sau bài viết thứ hai */}
              {index === 1 && <SuggestedReelsBox />}
            </Fragment>
          ))
        )}
      </div>

      {/* Infinite Scroll Observer Target */}
      {activeTab === 'all' && hasMore && (
        <div ref={observerRef} className="py-6 flex justify-center items-center">
          {isLoadingMore ? (
            <div className="h-6 w-6 border-2 border-white/20 border-t-rose-500 rounded-full animate-spin" />
          ) : (
            <div className="h-6" /> 
          )}
        </div>
      )}
      {!hasMore && filteredPosts.length > 0 && (
        <div className="text-center py-6 text-xs text-white/30 font-medium">
          Đã hiển thị hết bài viết.
        </div>
      )}
    </div>
  );
}
