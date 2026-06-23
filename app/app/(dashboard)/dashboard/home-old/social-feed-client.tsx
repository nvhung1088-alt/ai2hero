'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRoleByKey, type RoleKey } from '@/lib/shared-constants';
import { getAppById } from '@/lib/apps-registry';
import {
  Home, Sparkles, Filter, Bot, Image, Smile, X, ShieldAlert,
  UserPlus, Plus, ChevronLeft, ChevronRight
} from 'lucide-react';
import { APP_ICON_MAP } from '@/lib/shared-constants';
import FeedPostCard from '@/components/feed-post/feed-post-card';
import FeedPostCreator from '@/components/feed-post-creator';
import { StoryReels } from '@/components/story-reels';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { 
  createFeedPostAction, 
  toggleFeedLikeAction, 
  addFeedCommentAction, 
  toggleFeedPinAction, 
  changeTaskStatusAction 
} from '@/app/(login)/actions';
import { markSingleAnnouncementAsReadAction } from '@/lib/db/notification-actions';

interface SocialFeedClientProps {
  user: any;
  initialPosts: any[];
  teams: any[];
  userWithTeam: any;
  urgentAnnouncement?: any;
}

export function SocialFeedClient({ user, initialPosts, teams, userWithTeam, urgentAnnouncement }: SocialFeedClientProps) {
  const router = useRouter();
  const [filterTeamId, setFilterTeamId] = useState<string | null>(null);
  const [feedPosts, setFeedPosts] = useState<any[]>(initialPosts);
  const userRole = useMemo<RoleKey>(() => {
    if (!teams || teams.length === 0) {
      return 'viewer';
    }
    if (filterTeamId) {
      const teamIdNum = parseInt(filterTeamId.replace('team-', ''), 10);
      const currentTeam = teams.find(t => t.id === teamIdNum);
      if (currentTeam) {
        const myMemberRecord = currentTeam.teamMembers?.find((m: any) => m.userId === user.id);
        if (myMemberRecord) {
          return (myMemberRecord.role?.toLowerCase() as RoleKey) || 'viewer';
        }
      }
    }
    // Fallback: Lấy role của team đầu tiên
    const firstTeam = teams[0];
    const myMemberRecord = firstTeam.teamMembers?.find((m: any) => m.userId === user.id);
    if (myMemberRecord) {
      return (myMemberRecord.role?.toLowerCase() as RoleKey) || 'viewer';
    }
    return 'viewer';
  }, [filterTeamId, teams, user.id]);
  
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const POSTS_PER_PAGE = 3;
  
  const [publishTeamId, setPublishTeamId] = useState<number>(
    teams.length > 0 ? teams[0].id : 0
  );
  const [dismissedBanner, setDismissedBanner] = useState(false);

  // Sync publishTeamId with filterTeamId when it changes
  useEffect(() => {
    if (filterTeamId) {
      const teamIdNum = parseInt(filterTeamId.replace('team-', ''), 10);
      if (!isNaN(teamIdNum)) {
        setPublishTeamId(teamIdNum);
      }
    } else if (teams.length > 0) {
      setPublishTeamId(teams[0].id);
    }
  }, [filterTeamId, teams]);

  // Sync state with server-side props
  useEffect(() => {
    setFeedPosts(initialPosts);
  }, [initialPosts]);

  const posts = useMemo(() => {
    return filterTeamId 
      ? feedPosts.filter((p) => p.teamId === filterTeamId) 
      : feedPosts;
  }, [feedPosts, filterTeamId]);

  const pinnedPost = useMemo(() => {
    return posts.find((p) => p.pinned);
  }, [posts]);

  const remainingPosts = useMemo(() => {
    return posts.filter((p) => !p.pinned);
  }, [posts]);

  const totalPages = Math.max(1, Math.ceil(remainingPosts.length / POSTS_PER_PAGE));
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;

  const paginatedRemainingPosts = useMemo(() => {
    return remainingPosts.slice(startIndex, endIndex);
  }, [remainingPosts, startIndex, endIndex]);

  const groupedPosts = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    return paginatedRemainingPosts.reduce((groups: Record<string, any[]>, post) => {
      const dateLabel = post.date === todayStr 
        ? 'Hôm nay' 
        : post.date === yesterdayStr
        ? 'Hôm qua'
        : 'Lịch sử';
      
      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(post);
      return groups;
    }, {});
  }, [paginatedRemainingPosts]);

  const toggleLike = async (postId: number) => {
    const snapshot = feedPosts;
    // Optimistic Update
    setFeedPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const newLiked = !p.likedByMe;
          return {
            ...p,
            likedByMe: newLiked,
            likes: p.likes + (newLiked ? 1 : -1)
          };
        }
        return p;
      })
    );

    try {
      await toggleFeedLikeAction({ postId });
      router.refresh();
    } catch (err) {
      console.error('Error toggling like:', err);
      setFeedPosts(snapshot);
      showToast('Thao tác thích bài viết thất bại.', 'error');
    }
  };

  const toggleComments = (postId: number) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const handleCommentInputChange = (postId: number, val: string) => {
    setCommentInputs((prev) => ({
      ...prev,
      [postId]: val
    }));
  };

  const addComment = async (postId: number) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    const snapshot = feedPosts;
    // Optimistic Update
    const newComment = {
      id: Date.now(),
      userId: user.id,
      userName: user.name || 'Hero',
      userAvatar: (user.name || user.email || '?').charAt(0).toUpperCase(),
      content: text.trim(),
      timestamp: 'Vừa xong'
    };

    setFeedPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [...p.comments, newComment]
          };
        }
        return p;
      })
    );

    setCommentInputs((prev) => ({
      ...prev,
      [postId]: ''
    }));

    if (!expandedComments.has(postId)) {
      setExpandedComments((prev) => {
        const next = new Set(prev);
        next.add(postId);
        return next;
      });
    }

    try {
      await addFeedCommentAction({ postId, content: text.trim() });
      router.refresh();
    } catch (err) {
      console.error('Error adding comment:', err);
      setFeedPosts(snapshot);
      setCommentInputs((prev) => ({
        ...prev,
        [postId]: text
      }));
      showToast('Gửi bình luận thất bại. Vui lòng thử lại.', 'error');
    }
  };

  const toggleTask = async (postId: number) => {
    const post = feedPosts.find(p => p.id === postId);
    if (!post) return;

    const snapshot = feedPosts;
    const currentStatus = post.taskStatus || 'pending';
    const nextStatus = currentStatus === 'completed' 
      ? 'pending' 
      : currentStatus === 'pending'
      ? 'in_progress'
      : 'completed';

    // Optimistic
    setFeedPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            taskStatus: nextStatus
          };
        }
        return p;
      })
    );

    try {
      await changeTaskStatusAction({ postId, status: nextStatus });
      router.refresh();
    } catch (err) {
      console.error('Error updating task status:', err);
      setFeedPosts(snapshot);
      showToast('Cập nhật trạng thái nhiệm vụ thất bại.', 'error');
    }
  };

  const changeTaskStatus = async (postId: number, newStatus: 'pending' | 'in_progress' | 'completed') => {
    const snapshot = feedPosts;
    setFeedPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return { ...p, taskStatus: newStatus };
        }
        return p;
      })
    );

    try {
      await changeTaskStatusAction({ postId, status: newStatus });
      router.refresh();
    } catch (err) {
      console.error('Error updating task status:', err);
      setFeedPosts(snapshot);
      showToast('Cập nhật trạng thái nhiệm vụ thất bại.', 'error');
    }
  };

  const togglePin = async (postId: number) => {
    const snapshot = feedPosts;
    // Optimistic
    setFeedPosts((prev) => {
      const targetPost = prev.find((p) => p.id === postId);
      if (!targetPost) return prev;

      const isPinning = !targetPost.pinned;
      
      if (isPinning) {
        return prev.map((p) => {
          if (p.id === postId) {
            return { ...p, pinned: true, pinnedBy: user.name || 'Bạn' };
          }
          return { ...p, pinned: false, pinnedBy: undefined };
        });
      } else {
        return prev.map((p) => {
          if (p.id === postId) {
            return { ...p, pinned: false, pinnedBy: undefined };
          }
          return p;
        });
      }
    });

    try {
      const res = await toggleFeedPinAction({ postId });
      if (res.error) {
        setFeedPosts(snapshot);
        showToast(res.error, 'error');
      } else {
        showToast(res.success || 'Ghi nhận ghim bài viết!', 'success');
        router.refresh();
      }
    } catch (err) {
      console.error('Error pinning:', err);
      setFeedPosts(snapshot);
      showToast('Ghim bài viết thất bại.', 'error');
    }
  };

  // Hash scroll navigation
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (!hash.startsWith('#post-')) return;
      
      const targetPostId = parseInt(hash.slice(6), 10);
      if (isNaN(targetPostId)) return;

      const postIdx = remainingPosts.findIndex((p) => p.id === targetPostId);
      if (postIdx !== -1) {
        const targetPage = Math.floor(postIdx / POSTS_PER_PAGE) + 1;
        if (currentPage !== targetPage) {
          setCurrentPage(targetPage);
        }
      }

      const timer = setTimeout(() => {
        const el = document.getElementById(`post-${targetPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-orange-500/50');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-orange-500/50');
          }, 2500);
        }
        window.history.replaceState(null, '', window.location.pathname);
      }, 300);

      return () => clearTimeout(timer);
    };

    handleHashScroll();
    window.addEventListener('hashchange', handleHashScroll);
    return () => {
      window.removeEventListener('hashchange', handleHashScroll);
    };
  }, [remainingPosts, currentPage]);

  return (
    <section className="flex-1 p-6 lg:p-10 space-y-8 animate-fade-in bg-gray-950 text-white max-w-4xl mx-auto w-full">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-widest">
          <Home className="h-4 w-4" />
          <span>📡 Bảng tin chung</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
            Bảng tin
          </h1>
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getRoleByKey(userRole).color} ${getRoleByKey(userRole).textColor} border ${getRoleByKey(userRole).borderColor || 'border-transparent'}`}>
            {getRoleByKey(userRole).label}
          </span>
        </div>
        <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
          Nơi cập nhật thành quả tự động từ các MVP Apps, nhận công việc được giao và tương tác với các thành viên trong tổ chức.
        </p>
      </div>

      {urgentAnnouncement && !dismissedBanner && (
        <div className={`rounded-2xl p-4 flex items-start gap-3 animate-scale-up border ${
          urgentAnnouncement.severity === 'critical'
            ? 'bg-red-500/5 border-red-500/20'
            : 'bg-amber-500/5 border-amber-500/20'
        }`}>
          <span className="text-lg shrink-0">
            {urgentAnnouncement.severity === 'critical' ? '🚨' : '⚠️'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                urgentAnnouncement.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {urgentAnnouncement.severity === 'critical' ? 'Khẩn cấp' : 'Cảnh báo'}
              </span>
              <span className="text-[10px] text-gray-500 font-semibold">{urgentAnnouncement.version}</span>
            </div>
            <p className="text-xs font-extrabold text-white mt-1">{urgentAnnouncement.title}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed whitespace-pre-wrap">
              {urgentAnnouncement.content}
            </p>
          </div>
          <button
            onClick={async () => {
              setDismissedBanner(true);
              try {
                await markSingleAnnouncementAsReadAction(urgentAnnouncement.id);
                window.dispatchEvent(new Event('notifications-updated'));
              } catch (err) {
                console.error(err);
              }
            }}
            className="text-gray-500 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Đóng thông báo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Post Creator Section */}
      <FeedPostCreator
        user={user}
        teams={teams}
        userRole={userRole}
        initialPublishTeamId={publishTeamId}
        onPostCreated={() => {
          setCurrentPage(1);
          router.refresh();
        }}
      />

      {/* Story Reels Section */}
      <StoryReels user={{ id: user.id.toString(), name: user.name || 'User', avatar: user.avatar || null }} />

      {/* Workspace Filter Bar */}
      <div className="bg-gray-900/20 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-wider shrink-0 select-none">
          <Filter className="h-3.5 w-3.5" />
          <span>Không gian:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setFilterTeamId(null); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer ${
              filterTeamId === null
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white border-transparent shadow-lg shadow-orange-500/10'
                : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
            }`}
          >
            Tất cả không gian
          </button>
          {teams.map((team) => {
            const teamIdStr = `team-${team.id}`;
            return (
              <button
                key={team.id}
                onClick={() => { setFilterTeamId(teamIdStr); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                  filterTeamId === teamIdStr
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white border-transparent shadow-lg shadow-orange-500/10'
                    : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-xs">{team.avatar || '💼'}</span>
                <span>{team.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed Posts list */}
      {posts.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center animate-fade-in bg-gray-900/10">
          <ShieldAlert className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="font-extrabold text-white text-sm">Chưa có cập nhật nào</p>
          <p className="text-xs text-gray-500 mt-1">Không gian này hiện chưa ghi nhận bất kỳ hoạt động hay kết quả nào.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Render Pin post */}
          {pinnedPost && (
            <div className="space-y-5 animate-scale-up" id={`post-${pinnedPost.id}`}>
              <div className="flex items-center gap-4 select-none">
                <span className="text-xs font-black text-orange-400 uppercase tracking-widest bg-orange-500/10 border border-orange-500/20 px-3.5 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 animate-pulse">
                  📌 Bài viết được ghim quan trọng
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-orange-500/20 to-transparent" />
              </div>
              
              {(() => {
                const matchedTeam = teams.find(t => t.id === pinnedPost.teamIdNum);
                return (
                  <FeedPostCard
                    post={pinnedPost}
                    isLiked={pinnedPost.likedByMe}
                    displayLikes={pinnedPost.likes}
                    onLikeToggle={() => toggleLike(pinnedPost.id)}
                    isCommentsExpanded={expandedComments.has(pinnedPost.id)}
                    onCommentsToggle={() => toggleComments(pinnedPost.id)}
                    commentInput={commentInputs[pinnedPost.id] || ''}
                    onCommentInputChange={(val: string) => handleCommentInputChange(pinnedPost.id, val)}
                    commentsList={pinnedPost.comments}
                    onAddComment={() => addComment(pinnedPost.id)}
                    isTaskCompleted={pinnedPost.taskStatus === 'completed'}
                    onTaskToggle={() => toggleTask(pinnedPost.id)}
                    index={0}
                    userRole={userRole}
                    onPinToggle={() => togglePin(pinnedPost.id)}
                    onTaskStatusChange={(status: any) => changeTaskStatus(pinnedPost.id, status)}
                    teamName={matchedTeam?.name}
                    teamAvatar={matchedTeam?.avatar}
                    teams={teams}
                    currentUserId={user.id}
                    scopedTeamId={pinnedPost.teamIdNum || matchedTeam?.id}
                  />
                );
              })()}
            </div>
          )}

          {Object.entries(groupedPosts).map(([dateLabel, postList]) => (
            <div key={dateLabel} className="space-y-5">
              <div className="flex items-center gap-4 select-none">
                <span className="text-xs font-black text-orange-400/80 uppercase tracking-widest bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full shadow-sm">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
              </div>

              <div className="space-y-6">
                {postList.map((post, index) => {
                  const isLiked = post.likedByMe;
                  const displayLikes = post.likes;
                  const isCommentsExpanded = expandedComments.has(post.id);
                  const commentsList = post.comments;
                  const commentInput = commentInputs[post.id] || '';
                  const isTaskCompleted = post.taskStatus === 'completed';

                  return (
                    <div key={post.id} id={`post-${post.id}`}>
                      {(() => {
                        const matchedTeam = teams.find(t => t.id === post.teamIdNum);
                        return (
                          <FeedPostCard
                            post={post}
                            isLiked={isLiked}
                            displayLikes={displayLikes}
                            onLikeToggle={() => toggleLike(post.id)}
                            isCommentsExpanded={isCommentsExpanded}
                            onCommentsToggle={() => toggleComments(post.id)}
                            commentInput={commentInput}
                            onCommentInputChange={(val: string) => handleCommentInputChange(post.id, val)}
                            commentsList={commentsList}
                            onAddComment={() => addComment(post.id)}
                            isTaskCompleted={isTaskCompleted}
                            onTaskToggle={() => toggleTask(post.id)}
                            index={index}
                            userRole={userRole}
                            onPinToggle={() => togglePin(post.id)}
                            onTaskStatusChange={(status: any) => changeTaskStatus(post.id, status)}
                            teamName={matchedTeam?.name}
                            teamAvatar={matchedTeam?.avatar}
                            teams={teams}
                            currentUserId={user.id}
                            scopedTeamId={post.teamIdNum || matchedTeam?.id}
                          />
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          {/* Pagination Footer */}
          {remainingPosts.length > 0 && (
            <div className="border border-white/10 bg-gray-900/30 rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-fade-in mt-6 backdrop-blur-md">
              <span className="text-gray-400">
                Hiển thị <span className="font-bold text-gray-200">{startIndex + 1}–{Math.min(endIndex, remainingPosts.length)}</span> trên <span className="font-bold text-gray-200">{remainingPosts.length}</span> bài đăng
              </span>
              <div className="flex items-center gap-1.5">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="p-1.5 rounded-lg border border-white/10 bg-gray-900/50 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page} 
                    onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`h-7 w-7 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                      page === currentPage 
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm shadow-orange-500/10' 
                        : 'border border-white/10 bg-gray-900/50 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="p-1.5 rounded-lg border border-white/10 bg-gray-900/50 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
