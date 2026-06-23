'use client';

import { useState, useRef, useMemo } from 'react';
import { Send } from 'lucide-react';
import { ReactionPicker } from '@/app/(social)/(main)/reaction-picker';
import { type RoleKey, type FeedComment } from '@/lib/shared-constants';

// Helper parse @mention thành thẻ HTML tô cam nổi bật
function parseMessageMentions(text: string) {
  if (!text) return '';
  const parts = text.split(/(@[a-zA-Z0-9À-ỹ\s]+?(?=\s|$|[.,!?;]))/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} className="text-orange-400 font-bold hover:underline cursor-pointer">
          {part}
        </span>
      );
    }
    return part;
  });
}

// Helper insert reply into tree recursively
export function insertCommentIntoTree(comments: any[], newComment: any): any[] {
  if (!newComment.parentId) {
    return [newComment, ...comments];
  }
  return comments.map(c => {
    if (c.id === newComment.parentId) {
      return {
        ...c,
        replies: [...(c.replies || []), newComment]
      };
    }
    if (c.replies && c.replies.length > 0) {
      return {
        ...c,
        replies: insertCommentIntoTree(c.replies, newComment)
      };
    }
    return c;
  });
}

interface CommentItemProps {
  comment: any;
  depth?: number;
  postId: number;
  currentUserId?: number;
  userRole: RoleKey | string;
  onLikeComment: (commentId: number, reactionType: string) => void;
  onAddReply: (commentId: number, content: string) => void;
}

function CommentItem({ comment, depth = 0, postId, currentUserId, userRole, onLikeComment, onAddReply }: CommentItemProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const pickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current);
    setShowReactionPicker(true);
  };

  const handleMouseLeave = () => {
    pickerTimeoutRef.current = setTimeout(() => {
      setShowReactionPicker(false);
    }, 500);
  };

  const handleReplySubmit = () => {
    if (replyText.trim()) {
      onAddReply(comment.id, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
    }
  };

  const activeReaction = comment.reactionType;
  const reactionsList = comment.reactionsSummary ? Object.entries(comment.reactionsSummary) : [];

  return (
    <div className="space-y-2 relative">
      <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-1 relative animate-scale-up">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center text-[10px] shadow-inner overflow-hidden shrink-0 select-none">
              {comment.userAvatar && (comment.userAvatar.startsWith('http') || comment.userAvatar.startsWith('/') || comment.userAvatar.includes('.') || comment.userAvatar.length > 5) ? (
                <img src={comment.userAvatar} className="w-full h-full object-cover rounded-full" alt={comment.userName} />
              ) : (
                comment.userAvatar || '👤'
              )}
            </div>
            <span className="font-bold text-white hover:text-orange-400 transition-colors cursor-pointer">{comment.userName}</span>
          </div>
          <span className="text-gray-500 font-semibold">{comment.timestamp || 'Vừa xong'}</span>
        </div>
        
        <p className="text-xs text-gray-300 leading-relaxed pl-5">
          {parseMessageMentions(comment.content)}
        </p>

        <div className="flex items-center gap-4 text-[10px] pl-5 pt-1 text-gray-400 font-bold">
          <div 
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={() => onLikeComment(comment.id, 'like')}
              className={`hover:text-pink-400 transition-colors flex items-center gap-1 ${
                activeReaction ? 'text-pink-500' : ''
              }`}
            >
              <span>{activeReaction === 'like' && '👍'}</span>
              <span>{activeReaction === 'love' && '❤️'}</span>
              <span>{activeReaction === 'haha' && '😆'}</span>
              <span>{activeReaction === 'wow' && '😮'}</span>
              <span>{activeReaction === 'sad' && '😢'}</span>
              <span>{activeReaction === 'angry' && '😡'}</span>
              <span>
                {!activeReaction && 'Thích'}
                {activeReaction === 'like' && 'Thích'}
                {activeReaction === 'love' && 'Yêu thích'}
                {activeReaction === 'haha' && 'Haha'}
                {activeReaction === 'wow' && 'Wow'}
                {activeReaction === 'sad' && 'Buồn'}
                {activeReaction === 'angry' && 'Phẫn nộ'}
              </span>
            </button>

            {showReactionPicker && (
              <ReactionPicker
                onReact={(type) => {
                  onLikeComment(comment.id, type);
                  setShowReactionPicker(false);
                }}
                onClose={() => setShowReactionPicker(false)}
              />
            )}
          </div>

          <button
            onClick={() => setShowReplyInput(!showReplyInput)}
            className="hover:text-orange-400 transition-colors"
          >
            Trả lời
          </button>

          {comment.likesCount > 0 && (
            <div className="flex items-center gap-1.5 ml-auto text-gray-500 font-medium bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
              <span className="flex items-center -space-x-1">
                {reactionsList.slice(0, 3).map(([type]) => {
                  if (type === 'like') return <span key={type}>👍</span>;
                  if (type === 'love') return <span key={type}>❤️</span>;
                  if (type === 'haha') return <span key={type}>😆</span>;
                  if (type === 'wow') return <span key={type}>😮</span>;
                  if (type === 'sad') return <span key={type}>😢</span>;
                  if (type === 'angry') return <span key={type}>😡</span>;
                  return null;
                })}
              </span>
              <span>{comment.likesCount}</span>
            </div>
          )}
        </div>
      </div>

      {showReplyInput && (
        <div className="flex gap-2 pl-6 pt-1">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleReplySubmit();
            }}
            placeholder="Trả lời bình luận..."
            className="bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/10 focus:border-orange-500/30 rounded-xl px-3 py-1.5 w-full text-xs text-white placeholder-gray-500 focus:outline-none transition-all"
          />
          <button
            onClick={handleReplySubmit}
            disabled={!replyText.trim()}
            className="p-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-xs cursor-pointer hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-6 border-l border-white/5 space-y-3 pt-2">
          {comment.replies.map((reply: any) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              postId={postId}
              currentUserId={currentUserId}
              userRole={userRole}
              onLikeComment={onLikeComment}
              onAddReply={onAddReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PostCommentsProps {
  postId: number;
  comments: any[];
  currentUserId?: number;
  userRole: RoleKey | string;
  teams?: any[];
  scopedTeamId?: number;
  onLikeComment: (commentId: number, reactionType: string) => void;
  onAddReply: (commentId: number, content: string) => void;
  onAddComment: (content: string) => void;
}

export default function PostComments({
  postId, comments, currentUserId, userRole, teams, scopedTeamId,
  onLikeComment, onAddReply, onAddComment
}: PostCommentsProps) {
  const [commentInput, setCommentInput] = useState('');
  
  // === @Mention autocomplete states for Comment ===
  const [commentMentionOpen, setCommentMentionOpen] = useState(false);
  const [commentMentionSearch, setCommentMentionSearch] = useState('');
  const [commentMentionIdx, setCommentMentionIdx] = useState(-1);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const commentMentionSuggestions = useMemo(() => {
    const results: { id: string; name: string; avatar: string; type: 'member' | 'workspace' }[] = [];
    const seenIds = new Set<string>();

    const scopedTeam = teams?.find(t => t.id === scopedTeamId);
    const mentionTeams = scopedTeam ? [scopedTeam] : [];

    if (mentionTeams.length > 0) {
      for (const team of mentionTeams) {
        const key = `ws-${team.id}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          results.push({ id: key, name: team.name || 'Không gian', avatar: team.avatar || '💼', type: 'workspace' });
        }
      }
      for (const team of mentionTeams) {
        if (team.teamMembers) {
          for (const tm of team.teamMembers) {
            const uid = tm.user?.id || tm.userId;
            const key = `m-${uid}`;
            if (uid && uid !== currentUserId && !seenIds.has(key)) {
              seenIds.add(key);
              results.push({
                id: key,
                name: tm.user?.name || tm.user?.email || 'Thành viên',
                avatar: (tm.user?.name || tm.user?.email || '?').charAt(0).toUpperCase(),
                type: 'member'
              });
            }
          }
        }
      }
    }

    if (!commentMentionSearch) return results.slice(0, 10);
    return results.filter(r =>
      r.name.toLowerCase().includes(commentMentionSearch.toLowerCase())
    ).slice(0, 10);
  }, [commentMentionSearch, teams, currentUserId, scopedTeamId]);

  const handleCommentChange = (val: string) => {
    setCommentInput(val);

    const lastAtIdx = val.lastIndexOf('@');
    const threshold = Math.max(0, val.length - 20);
    if (lastAtIdx !== -1 && lastAtIdx >= threshold) {
      const textAfterAt = val.substring(lastAtIdx + 1);
      if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
        setCommentMentionOpen(false);
      } else {
        setCommentMentionOpen(true);
        setCommentMentionSearch(textAfterAt);
        setCommentMentionIdx(lastAtIdx);
      }
    } else {
      setCommentMentionOpen(false);
    }
  };

  const selectCommentMention = (name: string) => {
    if (commentMentionIdx === -1) return;
    const before = commentInput.substring(0, commentMentionIdx);
    const newVal = `${before}@${name} `;
    setCommentInput(newVal);
    setCommentMentionOpen(false);
    
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  const handleSubmit = () => {
    if (commentInput.trim()) {
      onAddComment(commentInput.trim());
      setCommentInput('');
      setCommentMentionOpen(false);
    }
  };

  return (
    <div className="space-y-4 pt-3.5 animate-fade-in">
      <div className="flex gap-3">
        <div className="h-8 w-8 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-black flex items-center justify-center shrink-0">
          🦸‍♂️
        </div>
        
        <div className="flex-1 flex gap-2 relative">
          <input 
            type="text"
            ref={commentInputRef}
            value={commentInput}
            disabled={userRole === 'viewer'}
            onChange={(e) => handleCommentChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder={userRole === 'viewer' ? "Bạn không có quyền bình luận (Viewer)" : "Viết bình luận... Sử dụng @ để gắn thẻ..."}
            className="bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/10 focus:border-orange-500/30 rounded-xl px-4 py-2 w-full text-sm text-white placeholder-gray-500 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button 
            onClick={handleSubmit}
            disabled={!commentInput.trim() || userRole === 'viewer'}
            className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-sm cursor-pointer hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all flex items-center justify-center shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>

          {commentMentionOpen && commentMentionSuggestions.length > 0 && (
            <div className="absolute z-[60] left-0 bottom-full mb-2 bg-gray-900 border border-white/10 rounded-xl max-h-52 overflow-y-auto w-64 shadow-2xl p-1 animate-scale-up">
              {commentMentionSuggestions.filter(s => s.type === 'workspace').length > 0 && (
                <div className="space-y-0.5">
                  <p className="text-[9px] text-gray-500 font-bold uppercase p-1.5 border-b border-white/5 tracking-widest">
                    💼 Không gian làm việc
                  </p>
                  {commentMentionSuggestions.filter(s => s.type === 'workspace').map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectCommentMention(s.name)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer border-0"
                    >
                      <div className="flex items-center gap-2 max-w-[70%]">
                        <span className="text-sm shrink-0">{s.avatar}</span>
                        <span className="font-semibold truncate">{s.name}</span>
                      </div>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold shrink-0">
                        Không gian
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {commentMentionSuggestions.filter(s => s.type === 'member').length > 0 && (
                <div className="space-y-0.5 mt-1 pt-1 border-t border-white/5">
                  <p className="text-[9px] text-gray-500 font-bold uppercase p-1.5 border-b border-white/5 tracking-widest">
                    👤 Thành viên
                  </p>
                  {commentMentionSuggestions.filter(s => s.type === 'member').map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectCommentMention(s.name)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer border-0"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                          {s.avatar}
                        </div>
                        <span className="font-semibold">{s.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {comments.length > 0 && (
        <div className="space-y-4 mt-4 pl-1">
          {comments.map((c: any) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={postId}
              currentUserId={currentUserId}
              userRole={userRole}
              onLikeComment={onLikeComment}
              onAddReply={onAddReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
