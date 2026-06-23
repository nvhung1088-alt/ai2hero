'use client';

import { useState, useEffect } from 'react';
import { type RoleKey, type FeedPost, type FeedComment } from '@/lib/shared-constants';
import { toggleFeedCommentLikeAction, addFeedCommentAction, deleteFeedPostAction, toggleBookmarkPostAction } from '@/app/(login)/actions';

import PostHeader from './post-header';

import PostContent from './post-content';
import PostMediaGrid from './post-media-grid';
import { generateFilmUrl, slugify } from '@/lib/utils/film-url';
import PostActivity from './post-activity';
import PostFooter from './post-footer';
import PostComments, { insertCommentIntoTree } from './post-comments';
import { CrossPostModal } from '@/app/(social)/(main)/components/crosspost-modal';
import { Play, Film } from 'lucide-react';
import { InlineFilmPlayerModal } from '../film/inline-film-player-modal';

export interface FeedPostCardProps {
  post: FeedPost;
  isLiked?: boolean;
  displayLikes?: number;
  onLikeToggle?: (reactionType?: string) => void;
  isCommentsExpanded?: boolean;
  onCommentsToggle?: () => void;
  commentInput?: string;
  onCommentInputChange?: (val: string) => void;
  commentsList?: FeedComment[];
  onAddComment?: (parentId?: number) => void;
  isTaskCompleted?: boolean;
  onTaskToggle?: () => void;
  index?: number;
  userRole: RoleKey | string;
  onPinToggle?: () => void;
  onTaskStatusChange?: (newStatus: 'pending' | 'in_progress' | 'completed') => void;
  teamName?: string;
  teamAvatar?: string;
  teams?: any[];
  currentUserId?: number;
  scopedTeamId?: number; // teamId của bài viết, dùng để scope @mention
  onLike?: (reactionType?: string) => void;
  onCommentAdded?: (comment: any) => void;
}

export default function FeedPostCard({
  post, isLiked, displayLikes, onLikeToggle, isCommentsExpanded, onCommentsToggle,
  commentInput, onCommentInputChange, commentsList, onAddComment, isTaskCompleted,
  onTaskToggle, index, userRole, onPinToggle, onTaskStatusChange,
  teamName, teamAvatar, teams, currentUserId, scopedTeamId, onLike, onCommentAdded
}: FeedPostCardProps) {
  // Local state for optional props
  const [internalIsLiked, setInternalIsLiked] = useState(post.likedByMe || false);
  const [internalLikesCount, setInternalLikesCount] = useState(post.likes || 0);
  const [internalMyReaction, setInternalMyReaction] = useState<string | null | undefined>(post.myReactionType);
  const [internalReactionsSummary, setInternalReactionsSummary] = useState(post.reactionsSummary || {});
  const [internalCommentsExpanded, setInternalCommentsExpanded] = useState(false);
  const [internalCommentsList, setInternalCommentsList] = useState<any[]>(post.comments || []);
  const [isHidden, setIsHidden] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCrossPostModalOpen, setIsCrossPostModalOpen] = useState(false);
  const [inlineFilmSlug, setInlineFilmSlug] = useState<string | null>(null);

  // Sync internal state with post updates
  useEffect(() => {
    setInternalIsLiked(post.likedByMe || false);
    setInternalLikesCount(post.likes || 0);
    setInternalMyReaction(post.myReactionType);
    setInternalReactionsSummary(post.reactionsSummary || {});
    setInternalCommentsList(post.comments || []);
  }, [post]);

  const resolvedIsLiked = isLiked !== undefined ? isLiked : internalIsLiked;
  const resolvedDisplayLikes = displayLikes !== undefined ? displayLikes : internalLikesCount;
  const resolvedCommentsExpanded = isCommentsExpanded !== undefined ? isCommentsExpanded : internalCommentsExpanded;
  const resolvedCommentsList = commentsList !== undefined ? commentsList : internalCommentsList;

  // Handlers
  const handleLikeToggle = (reactionType?: string) => {
    if (onLikeToggle) {
      onLikeToggle(reactionType);
    } else if (onLike) {
      if (reactionType) {
        // Switch to a new reaction or just like
        onLike(reactionType);
        setInternalIsLiked(true);
        if (!internalIsLiked) {
          setInternalLikesCount(prev => prev + 1);
        }
        setInternalMyReaction(reactionType);
        
        // Optimistic summary update
        const newSummary = { ...internalReactionsSummary };
        if (internalMyReaction) {
           newSummary[internalMyReaction] = Math.max(0, (newSummary[internalMyReaction] || 0) - 1);
           if (newSummary[internalMyReaction] === 0) delete newSummary[internalMyReaction];
        }
        newSummary[reactionType] = (newSummary[reactionType] || 0) + 1;
        setInternalReactionsSummary(newSummary);

      } else {
        // Toggle OFF Like
        if (resolvedIsLiked) {
          onLike();
          setInternalIsLiked(false);
          setInternalLikesCount(prev => Math.max(0, prev - 1));
          
          const newSummary = { ...internalReactionsSummary };
          if (internalMyReaction) {
            newSummary[internalMyReaction] = Math.max(0, (newSummary[internalMyReaction] || 0) - 1);
            if (newSummary[internalMyReaction] === 0) delete newSummary[internalMyReaction];
          }
          setInternalMyReaction(null);
          setInternalReactionsSummary(newSummary);
        } else {
          // Toggle ON Like (default)
          onLike('like');
          setInternalIsLiked(true);
          setInternalLikesCount(prev => prev + 1);
          setInternalMyReaction('like');

          const newSummary = { ...internalReactionsSummary };
          newSummary['like'] = (newSummary['like'] || 0) + 1;
          setInternalReactionsSummary(newSummary);
        }
      }
    }
  };

  const handleCommentsToggle = () => {
    if (onCommentsToggle) {
      onCommentsToggle();
    } else {
      setInternalCommentsExpanded(!resolvedCommentsExpanded);
    }
  };

  const handleAddCommentLocal = (content: string, parentId?: number) => {
    addFeedCommentAction({ postId: post.id, content, parentId }).then(res => {
      if (res.error) {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(res.error, 'error');
        }
      } else if (res.comment) {
        const newComment = {
          ...res.comment,
          likesCount: 0,
          likedByMe: false,
          reactionType: null,
          reactionsSummary: {},
          replies: []
        };

        if (parentId) {
           setInternalCommentsList(prev => insertCommentIntoTree(prev, newComment));
        } else {
           setInternalCommentsList(prev => [newComment, ...prev]);
        }
        
        if (onCommentAdded) {
          onCommentAdded(newComment);
        }
      }
    }).catch(err => console.error(err));
  };

  const handleLikeComment = async (commentId: number, reactionType: string) => {
    try {
      const res = await toggleFeedCommentLikeAction({ commentId, reactionType });
      if (res.error) {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(res.error, 'error');
        }
      } else {
        const updateReactionsInTree = (comments: any[]): any[] => {
          return comments.map(c => {
            if (c.id === commentId) {
              const liked = res.liked;
              const rType = res.reactionType;
              let nextLikesCount = c.likesCount;
              if (c.likedByMe !== liked) {
                nextLikesCount = liked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1);
              }
              const nextSummary = { ...(c.reactionsSummary || {}) };
              if (c.likedByMe && c.reactionType) {
                nextSummary[c.reactionType] = Math.max(0, (nextSummary[c.reactionType] || 0) - 1);
                if (nextSummary[c.reactionType] === 0) delete nextSummary[c.reactionType];
              }
              if (liked && rType) {
                nextSummary[rType] = (nextSummary[rType] || 0) + 1;
              }
              return {
                ...c,
                likedByMe: liked,
                reactionType: rType,
                likesCount: nextLikesCount,
                reactionsSummary: nextSummary
              };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateReactionsInTree(c.replies) };
            }
            return c;
          });
        };
        setInternalCommentsList(prev => updateReactionsInTree(prev));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostAction = async (action: 'edit' | 'delete' | 'save' | 'hide' | 'crosspost') => {
    if (action === 'hide') {
      setIsHidden(true);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Đã ẩn bài viết', 'success');
      }
      return;
    }
    
    if (action === 'crosspost') {
      setIsCrossPostModalOpen(true);
      return;
    }
    
    if (action === 'edit') {
      setIsEditing(true);
      return;
    }

    if (action === 'delete') {
      if (confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) {
        const res = await deleteFeedPostAction({ postId: post.id });
        if (res.error) {
          if (typeof window !== 'undefined' && (window as any).showToast) {
            (window as any).showToast(res.error, 'error');
          }
        } else {
          setIsHidden(true);
          if (typeof window !== 'undefined' && (window as any).showToast) {
            (window as any).showToast(res.success, 'success');
          }
        }
      }
      return;
    }

    if (action === 'save') {
      const res = await toggleBookmarkPostAction({ postId: post.id });
      if (res.error) {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(res.error, 'error');
        }
      } else {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(res.success, 'success');
        }
      }
      return;
    }
  };

  if (isHidden) return null;

  return (
    <article 
      id={`post-${post.id}`}
      style={{ animationDelay: `${(index || 0) * 0.05}s` }}
      className={`group relative rounded-2xl p-5 space-y-4 transition-all duration-300 shadow-xl animate-scale-up ${
        post.type === 'task_assignment'
          ? 'bg-amber-500/[0.02] border border-amber-500/10 hover:border-amber-500/25'
          : post.type === 'mvp_result'
          ? 'bg-violet-500/[0.02] border border-violet-500/10 hover:border-violet-500/25'
          : post.type === 'news'
          ? 'bg-emerald-500/[0.02] border border-emerald-500/10 hover:border-emerald-500/25'
          : post.type === 'film_publish'
          ? 'bg-pink-500/[0.02] border border-pink-500/20 hover:border-pink-500/40 shadow-pink-500/5'
          : 'bg-gray-900/30 hover:bg-gray-900/50 border border-white/5 hover:border-orange-500/20'
      }`}
    >
      <PostHeader 
        postId={post.id}
        userAvatar={post.userAvatar}
        userName={post.userName}
        userRole={post.userRole}
        timestamp={post.timestamp}
        feeling={post.feeling}
        location={post.location}
        taggedUsers={post.taggedUsers}
        pinned={post.pinned}
        pinnedBy={post.pinnedBy}
        teamName={teamName}
        teamAvatar={teamAvatar}
        canPin={userRole === 'owner' || userRole === 'admin'}
        onPinToggle={onPinToggle}
        onAction={handlePostAction}
      />

      {post.appId === 'facebook' && post.type === 'news' && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-blue-500/10 text-blue-400 rounded-lg w-max ml-14">
          📥 Đã nhập từ Facebook
        </div>
      )}

      {(post.type === 'news' || post.type === 'system_activity' || post.type === 'film_publish') ? (
        <PostContent postId={post.id} message={post.message} type={post.type} isEditing={isEditing} onEditComplete={() => setIsEditing(false)} />
      ) : post.type === 'mvp_result' || post.type === 'task_assignment' ? (
        <PostActivity 
          type={post.type}
          message={post.message}
          appId={post.appId}
          resultPreview={post.resultPreview}
          resultMetrics={post.resultMetrics}
          taskTitle={post.taskTitle}
          taskStatus={post.taskStatus}
          taskAssignee={post.taskAssignee}
          taskDueDate={post.taskDueDate}
          onTaskStatusChange={onTaskStatusChange}
        />
      ) : (
        <PostContent postId={post.id} message={post.message} type={post.type} isEditing={isEditing} onEditComplete={() => setIsEditing(false)} />
      )}

      {((post.type === 'film_publish') || (post as any).sharedPost?.type === 'film_publish') && (
        (() => {
          try {
            const dataToParse = post.type === 'film_publish' ? post.resultPreview : (post as any).sharedPost?.resultPreview;
            const data = dataToParse ? JSON.parse(dataToParse) : null;
            if (!data) return null;
            return (
              <div className="mt-3 p-4 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-md flex gap-4 hover:bg-white/[0.05] transition-all">
                {data.coverUrl && (
                  <div 
                    onClick={() => setInlineFilmSlug(data.slug || (data.title ? slugify(data.title) : data.seriesId?.toString()))}
                    className="relative w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 shadow-lg cursor-pointer group"
                  >
                    <img src={data.coverUrl} alt={data.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white/20 group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                )}
                <div className="flex flex-col justify-between py-1">
                  <div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 uppercase tracking-wider">
                      {data.genre || 'Phim Ngắn'}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1.5 line-clamp-1">{data.title}</h4>
                    <p className="text-xs text-gray-400 mt-1">Tổng số: {data.totalEpisodes || 0} tập phim</p>
                  </div>
                  <button 
                    onClick={() => setInlineFilmSlug(data.slug || (data.title ? slugify(data.title) : data.seriesId?.toString()))}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-lg shadow-lg shadow-pink-500/15 transition-all w-max mt-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Xem trực tiếp
                  </button>
                </div>
              </div>
            );
          } catch (e) {
            return <p className="text-xs text-red-400">Lỗi hiển thị thông tin phim</p>;
          }
        })()
      )}

      {post.attachments && post.attachments.length > 0 && (
        <PostMediaGrid attachments={post.attachments} />
      )}

      <PostFooter 
        isLiked={resolvedIsLiked}
        myReactionType={internalMyReaction}
        likesCount={resolvedDisplayLikes}
        reactionsSummary={internalReactionsSummary}
        commentsCount={resolvedCommentsList.length}
        onLikeToggle={handleLikeToggle}
        onCommentsToggle={handleCommentsToggle}
        onShare={() => {
          navigator.clipboard.writeText(window.location.origin + `/dashboard/home#post-${post.id}`);
          if (typeof window !== 'undefined' && (window as any).showToast) {
            (window as any).showToast('Đã sao chép liên kết!', 'success');
          }
        }}
        onShareToFeed={async () => {
          // Add share action dynamically
          const { createFeedPostAction } = await import('@/app/(login)/actions');
          const res = await createFeedPostAction({
            type: 'system_activity',
            message: '', // Không cần message vì post này chỉ bọc sharedPostId
            sharedPostId: post.id
          });
          if (res.error) {
            if (typeof window !== 'undefined' && (window as any).showToast) {
              (window as any).showToast(res.error, 'error');
            }
          } else {
            if (typeof window !== 'undefined' && (window as any).showToast) {
              (window as any).showToast('Đã chia sẻ lên Bảng tin của bạn', 'success');
            }
          }
        }}
      />

      {resolvedCommentsExpanded && (
        <PostComments 
          postId={post.id}
          comments={resolvedCommentsList}
          currentUserId={currentUserId}
          userRole={userRole}
          teams={teams}
          scopedTeamId={scopedTeamId}
          onLikeComment={handleLikeComment}
          onAddReply={(parentId, content) => handleAddCommentLocal(content, parentId)}
          onAddComment={(content) => handleAddCommentLocal(content)}
        />
      )}

      {isCrossPostModalOpen && (
        <CrossPostModal
          isOpen={isCrossPostModalOpen}
          onClose={() => setIsCrossPostModalOpen(false)}
          postId={post.id}
          teamId={Number(post.teamId || scopedTeamId || 1)}
        />
      )}

      <InlineFilmPlayerModal 
        slug={inlineFilmSlug || ''} 
        isOpen={!!inlineFilmSlug} 
        onClose={() => setInlineFilmSlug(null)} 
        userId={currentUserId}
        isAdmin={userRole === 'admin' || userRole === 'owner'}
        feedPostId={post.id}
      />
    </article>
  );
}
