'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { type RoleKey, getRoleByKey } from '@/lib/shared-constants';
import { type FeedPost, type FeedComment, type FeedAttachment } from '@/lib/shared-constants';
import { getAppById } from '@/lib/apps-registry';
import {
  Clock,
  Globe,
  MoreHorizontal,
  Sparkles,
  Zap,
  UserPlus,
  Settings,
  Activity,
  ClipboardList,
  CheckCircle2,
  Circle,
  Image,
  PlaySquare,
  Heart,
  MessageCircle,
  Send,
  X,
  Share2,
  Search,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

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


// Maps Lucide Icon string names from the apps registry to real React components
const APP_ICON_MAP: Record<string, React.ComponentType<any>> = {
  MessageSquare: MessageCircle,
  Brain: Activity,
  Plug: Sparkles, // for API Hub
  Smartphone: Sparkles, // for SIM
  ShoppingCart: Sparkles, // for POS
  FileText: ClipboardList // for Content Hub
};

// Map system activities to pretty icons and gradient accent rings
const SYSTEM_ACTIVITY_STYLING: Record<string, { icon: React.ComponentType<any>; colorClass: string }> = {
  app_activated: { icon: Zap, colorClass: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  member_invited: { icon: UserPlus, colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  member_joined: { icon: UserPlus, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  plan_upgraded: { icon: Sparkles, colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  data_exported: { icon: ClipboardList, colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  settings_updated: { icon: Settings, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  default: { icon: Activity, colorClass: 'text-gray-400 bg-white/5 border-white/10' }
};

export interface FeedPostCardProps {
  post: FeedPost;
  isLiked: boolean;
  displayLikes: number;
  onLikeToggle: () => void;
  isCommentsExpanded: boolean;
  onCommentsToggle: () => void;
  commentInput: string;
  onCommentInputChange: (val: string) => void;
  commentsList: FeedComment[];
  onAddComment: () => void;
  isTaskCompleted: boolean;
  onTaskToggle: () => void;
  index: number;
  userRole: RoleKey;
  onPinToggle: () => void;
  onTaskStatusChange?: (newStatus: 'pending' | 'in_progress' | 'completed') => void;
  teamName?: string;
  teamAvatar?: string;
  teams?: any[];
  currentUserId?: number;
  scopedTeamId?: number; // teamId của bài viết, dùng để scope @mention
}

export default function FeedPostCard({
  post,
  isLiked,
  displayLikes,
  onLikeToggle,
  isCommentsExpanded,
  onCommentsToggle,
  commentInput,
  onCommentInputChange,
  commentsList,
  onAddComment,
  isTaskCompleted,
  onTaskToggle,
  index,
  userRole,
  onPinToggle,
  onTaskStatusChange,
  teamName,
  teamAvatar,
  teams,
  currentUserId,
  scopedTeamId
}: FeedPostCardProps) {
  const app = post.appId ? getAppById(post.appId) : undefined;
  
  // === @Mention autocomplete states for Comment ===
  const [commentMentionOpen, setCommentMentionOpen] = useState(false);
  const [commentMentionSearch, setCommentMentionSearch] = useState('');
  const [commentMentionIdx, setCommentMentionIdx] = useState(-1);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Generate mention suggestions list: Members + Workspaces
  const commentMentionSuggestions = useMemo(() => {
    const results: { id: string; name: string; avatar: string; type: 'member' | 'workspace' }[] = [];
    const seenIds = new Set<string>();

    const scopedTeam = teams?.find(t => t.id === scopedTeamId);
    const mentionTeams = scopedTeam ? [scopedTeam] : [];

    if (mentionTeams.length > 0) {
      // Group 1: Workspace suggestions
      for (const team of mentionTeams) {
        const key = `ws-${team.id}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          results.push({
            id: key,
            name: team.name || 'Không gian',
            avatar: team.avatar || '💼',
            type: 'workspace'
          });
        }
      }

      // Group 2: Member suggestions (skip current user)
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
    onCommentInputChange(val);

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
    onCommentInputChange(newVal);
    setCommentMentionOpen(false);
    
    // Focus back on input
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMvpModalOpen, setIsMvpModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canPin = userRole === 'owner' || userRole === 'admin';

  // Click outside menu handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resolve App Icon component if it exists
  const AppIconComponent = app && APP_ICON_MAP[app.icon] ? APP_ICON_MAP[app.icon] : Sparkles;

  // Render system activity styling
  let systemStyling = SYSTEM_ACTIVITY_STYLING.default;
  if (post.type === 'system_activity') {
    if (post.message.includes('Kích hoạt')) {
      systemStyling = SYSTEM_ACTIVITY_STYLING.app_activated;
    } else if (post.message.includes('Mời')) {
      systemStyling = SYSTEM_ACTIVITY_STYLING.member_invited;
    } else if (post.message.includes('gia nhập')) {
      systemStyling = SYSTEM_ACTIVITY_STYLING.member_joined;
    } else if (post.message.includes('Nâng cấp')) {
      systemStyling = SYSTEM_ACTIVITY_STYLING.plan_upgraded;
    } else if (post.message.includes('Xuất bản')) {
      systemStyling = SYSTEM_ACTIVITY_STYLING.data_exported;
    } else if (post.message.includes('Cập nhật')) {
      systemStyling = SYSTEM_ACTIVITY_STYLING.settings_updated;
    }
  }
  const SystemIcon = systemStyling.icon;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + `/dashboard/home#post-${post.id}`);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast('Đã sao chép liên kết bài viết!', 'success');
    }
    setIsMenuOpen(false);
  };

  return (
    <article 
      id={`post-${post.id}`}
      style={{ animationDelay: `${index * 0.05}s` }}
      className={`group relative rounded-2xl p-5 space-y-4 transition-all duration-300 shadow-xl animate-scale-up ${
        post.type === 'task_assignment'
          ? 'bg-amber-500/[0.02] border border-amber-500/10 hover:border-amber-500/25'
          : post.type === 'mvp_result'
          ? 'bg-violet-500/[0.02] border border-violet-500/10 hover:border-violet-500/25'
          : post.type === 'news'
          ? 'bg-emerald-500/[0.02] border border-emerald-500/10 hover:border-emerald-500/25'
          : 'bg-gray-900/30 hover:bg-gray-900/50 border border-white/5 hover:border-orange-500/20'
      }`}
    >
      {post.pinned && (
        <div className="flex items-center gap-1.5 text-xs text-orange-400 font-extrabold bg-orange-500/5 border border-orange-500/10 px-3.5 py-2 rounded-xl animate-scale-up">
          <span>📌 Bài viết được ghim</span>
          <span className="text-gray-600">•</span>
          <span className="text-gray-400 font-medium">Ghim bởi {post.pinnedBy || 'Quản trị viên'}</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center text-xl shadow-inner select-none shrink-0">
            {post.userAvatar}
          </div>
          
          <div>
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="font-extrabold text-white text-sm hover:text-orange-400 transition-colors cursor-pointer">{post.userName}</span>
              <span className="text-[10px] font-semibold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md text-gray-400">
                {post.userRole}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{post.timestamp}</span>
              <span>•</span>
              <Globe className="h-3 w-3 shrink-0" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 relative" ref={menuRef}>
          {teamName && (
            <span className="text-[10px] font-bold text-gray-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
              <span>{teamAvatar || '💼'}</span>
              <span>{teamName}</span>
            </span>
          )}
          
          <button 
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg cursor-pointer"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-20 p-1 animate-scale-up">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-white/5 text-gray-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>🔗</span> Sao chép liên kết
              </button>
              
              {canPin && (
                <button
                  type="button"
                  onClick={() => {
                    onPinToggle();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-white/5 text-orange-400 hover:text-orange-300 transition-all flex items-center gap-2 cursor-pointer border-t border-white/5"
                >
                  <span>📌</span> {post.pinned ? 'Bỏ ghim bài' : 'Ghim bài viết'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {post.type === 'system_activity' && (
        <div className="bg-gray-950/40 border border-white/5 rounded-xl p-4 flex items-start gap-3 text-sm text-gray-300">
          <div className={`h-8 w-8 rounded-lg border shrink-0 flex items-center justify-center ${systemStyling.colorClass}`}>
            <SystemIcon className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="leading-relaxed text-gray-300">
              {parseMessageMentions(post.message)}
            </p>
            <p className="text-[10px] text-gray-500 font-medium">Hoạt động tự động từ hệ thống</p>
          </div>
        </div>
      )}

      {post.type === 'news' && (
        <div className="space-y-3 animate-scale-up">
          <p className="text-sm lg:text-base text-gray-200 leading-relaxed font-medium">
            {parseMessageMentions(post.message)}
          </p>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm">
              <span>📰</span>
              <span>Tin tức</span>
            </span>
          </div>
        </div>
      )}

      {post.type === 'mvp_result' && (
        <div className="space-y-3">
          <p className="text-sm lg:text-base text-gray-200 leading-relaxed font-medium">
            {parseMessageMentions(post.message)}
          </p>

          <div className="bg-gradient-to-br from-gray-950/80 via-gray-950/40 to-transparent border border-white/5 hover:border-orange-500/20 rounded-xl p-4 space-y-3 relative overflow-hidden transition-all duration-300">
            <div className={`absolute -right-12 -top-12 w-28 h-28 rounded-full bg-gradient-to-tr ${app?.color || 'from-orange-500 to-pink-500'} opacity-5 blur-2xl pointer-events-none`} />

            {app && (
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider flex items-center gap-1.5 bg-gradient-to-r ${app.color} bg-clip-text text-transparent border-orange-500/10`}>
                  <AppIconComponent className="h-3 w-3 text-orange-400" />
                  <span>{app.name}</span>
                </span>
                <span className="text-[10px] text-gray-600 font-bold uppercase">Kết quả thực tế</span>
              </div>
            )}

            {post.resultPreview && (
              <p className="text-xs lg:text-sm text-gray-400 leading-relaxed italic border-l-2 border-orange-500/30 pl-3">
                &ldquo;{post.resultPreview}&rdquo;
              </p>
            )}

            {post.resultMetrics && post.resultMetrics.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1.5">
                {post.resultMetrics.map((met, idx) => (
                  <div key={idx} className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg p-2 text-center transition-colors">
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold truncate">
                      {met.label}
                    </span>
                    <span className="text-xs lg:text-sm text-white font-extrabold block mt-0.5 truncate">
                      {met.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Nút Xem thành phẩm */}
            <button
              onClick={() => setIsMvpModalOpen(true)}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/10 to-pink-500/10 hover:from-orange-500/20 hover:to-pink-500/20 text-orange-400 text-[11px] font-bold rounded-xl border border-orange-500/20 transition-all cursor-pointer group"
            >
              <Search className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
              <span>Xem thành phẩm chi tiết</span>
              <ArrowRight className="h-3 w-3 opacity-50 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {post.type === 'task_assignment' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-300">
            {parseMessageMentions(post.message)}
          </p>

          <div className="bg-gray-950/40 border border-white/5 hover:border-emerald-500/20 rounded-xl p-4 flex items-start gap-3 transition-colors">
            <button 
              onClick={onTaskToggle}
              className="mt-0.5 cursor-pointer text-gray-500 hover:text-emerald-400 active:scale-95 transition-all shrink-0 animate-fade-in"
            >
              {isTaskCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 animate-heart-pop" />
              ) : post.taskStatus === 'in_progress' ? (
                <div className="h-5 w-5 rounded-full border-2 border-dashed border-blue-400 animate-spin shrink-0" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>

            <div className="flex-1 space-y-1.5 min-w-0">
              <span className={`text-sm font-extrabold text-white leading-tight block ${isTaskCompleted ? 'line-through text-gray-500 transition-all' : ''}`}>
                {post.taskTitle}
              </span>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 font-semibold">
                <span className="flex items-center gap-1">
                  👤 Người giao: <span className="text-gray-400">{post.taskAssignee}</span>
                </span>
                {post.taskDueDate && (
                  <span className="flex items-center gap-1">
                    📅 Hạn: <span className="text-gray-400">{post.taskDueDate}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0">
              {isTaskCompleted ? (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider">
                  Hoàn thành
                </span>
              ) : post.taskStatus === 'in_progress' ? (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase tracking-wider animate-pulse">
                  Đang làm
                </span>
              ) : (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border bg-amber-500/10 text-amber-400 border-amber-500/20 uppercase tracking-wider">
                  Chờ làm
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 pt-1.5 pl-8">
            {!isTaskCompleted && post.taskStatus !== 'in_progress' && onTaskStatusChange && (
              <button
                onClick={() => onTaskStatusChange('in_progress')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[11px] font-bold rounded-lg border border-blue-500/20 transition-all cursor-pointer"
              >
                <Zap className="h-3 w-3 animate-pulse" />
                <span>Nhận việc</span>
              </button>
            )}
            {post.taskStatus === 'in_progress' && !isTaskCompleted && onTaskStatusChange && (
              <button
                onClick={() => onTaskStatusChange('completed')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-bold rounded-lg border border-emerald-500/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Hoàn thành</span>
              </button>
            )}
            {isTaskCompleted && onTaskStatusChange && (
              <button
                onClick={() => onTaskStatusChange('pending')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 text-[11px] font-bold rounded-lg border border-gray-500/20 transition-all cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Làm lại</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Attachment Section */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="flex flex-col gap-3 mt-3">
          {post.attachments.map((att, idx) => (
            <div key={idx} className="relative rounded-xl overflow-hidden border border-white/5 group/attachment">
              {att.type === 'image' ? (
                <div className="relative w-full bg-gray-950/40 flex items-center justify-center rounded-xl overflow-hidden max-h-[500px] p-1">
                  {att.url ? (
                    <img 
                      src={att.url} 
                      alt={att.caption || 'Attachment Image'} 
                      className="max-w-full max-h-[480px] w-auto h-auto object-contain rounded-lg transition-all hover:scale-[1.01] duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-pink-900/40 flex flex-col items-center justify-center p-4">
                      <Image className="h-10 w-10 text-white/40 mb-2" />
                      <span className="text-xs text-white/60 font-mono">{att.fileName}</span>
                    </div>
                  )}
                  {att.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-xs text-gray-200 font-semibold">{att.caption}</p>
                    </div>
                  )}
                </div>
              ) : att.type === 'video' ? (
                <div className="relative aspect-video w-full bg-gray-950 flex flex-col items-center justify-center p-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-teal-900/40 flex flex-col items-center justify-center p-4">
                    <PlaySquare className="h-12 w-12 text-white/80 hover:text-white hover:scale-110 transition-all cursor-pointer" />
                    <span className="text-xs text-white/60 font-mono mt-2">{att.fileName}</span>
                  </div>
                  {att.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 w-full">
                      <p className="text-xs text-gray-200 font-semibold">{att.caption}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-white/5 flex items-center justify-center">
                      📄
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate max-w-[200px]">{att.fileName}</p>
                      <p className="text-[10px] text-gray-500">{att.caption || 'Tài liệu đi kèm'}</p>
                    </div>
                  </div>
                  <button className="text-xs text-orange-400 font-bold hover:underline cursor-pointer">
                    Tải xuống
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-white/5 pt-3.5 flex items-center justify-between text-xs text-gray-400 font-bold">
        <div className="flex items-center gap-3">
          <button 
            onClick={onLikeToggle}
            className={`flex items-center gap-1.5 hover:text-pink-400 transition-colors cursor-pointer group ${isLiked ? 'text-pink-500' : ''}`}
          >
            <Heart className={`h-4 w-4 transition-all ${isLiked ? 'fill-pink-500 stroke-pink-500 animate-heart-pop scale-110' : 'group-hover:scale-110'}`} />
            <span>{displayLikes} Thích</span>
          </button>

          <button 
            onClick={onCommentsToggle}
            className="flex items-center gap-1.5 hover:text-orange-400 transition-colors cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{commentsList.length} Bình luận</span>
          </button>
        </div>

        <button 
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
        >
          <Share2 className="h-4 w-4" />
          <span>Chia sẻ</span>
        </button>
      </div>

      {isCommentsExpanded && (
        <div className="space-y-4 pt-3.5 border-t border-white/5 animate-fade-in">
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
                  if (e.key === 'Enter') {
                    onAddComment();
                    setCommentMentionOpen(false);
                  }
                }}
                placeholder={userRole === 'viewer' ? "Bạn không có quyền bình luận (Viewer)" : "Viết bình luận... Sử dụng @ để gắn thẻ..."}
                className="bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/10 focus:border-orange-500/30 rounded-xl px-4 py-2 w-full text-sm text-white placeholder-gray-500 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button 
                onClick={() => {
                  onAddComment();
                  setCommentMentionOpen(false);
                }}
                disabled={!commentInput.trim() || userRole === 'viewer'}
                className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-sm cursor-pointer hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all flex items-center justify-center shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>

              {/* @Mention Autocomplete Dropdown — slide-up above comments input */}
              {commentMentionOpen && commentMentionSuggestions.length > 0 && (
                <div className="absolute z-[60] left-0 bottom-full mb-2 bg-gray-900 border border-white/10 rounded-xl max-h-52 overflow-y-auto w-64 shadow-2xl p-1 animate-scale-up">
                  {/* Nhóm 1: Không gian làm việc */}
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

                  {/* Nhóm 2: Thành viên */}
                  {commentMentionSuggestions.filter(s => s.type === 'member').length > 0 && (
                    <div className="space-y-0.5 mt-1 border-t border-white/5 pt-1">
                      <p className="text-[9px] text-gray-500 font-bold uppercase p-1.5 tracking-widest">
                        👥 Thành viên
                      </p>
                      {commentMentionSuggestions.filter(s => s.type === 'member').map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => selectCommentMention(s.name)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer border-0"
                        >
                          <div className="flex items-center gap-2 max-w-[75%]">
                            <div className="h-5 w-5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-black flex items-center justify-center text-blue-400 shrink-0">
                              {s.avatar}
                            </div>
                            <span className="font-semibold truncate">{s.name}</span>
                          </div>
                          <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-bold shrink-0">
                            Thành viên
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {commentsList.length > 0 && (
            <div className="space-y-3 pl-11 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
              {commentsList.map((comm) => (
                <div key={comm.id} className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-1 relative animate-scale-up">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-gray-200">{comm.userAvatar}</span>
                      <span className="font-bold text-white hover:text-orange-400 transition-colors cursor-pointer">{comm.userName}</span>
                    </div>
                    <span className="text-gray-500 font-semibold">{comm.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed pl-5">
                    {parseMessageMentions(comm.content)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* ═══ MVP Result Detail Modal ═══ */}
      {isMvpModalOpen && post.type === 'mvp_result' && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsMvpModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header gradient */}
            <div className={`p-6 bg-gradient-to-r ${app?.color || 'from-orange-500 to-pink-500'} relative overflow-hidden`}>
              <div className="absolute inset-0 bg-black/30" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <AppIconComponent className="h-5 w-5 text-white" />
                  <span className="text-sm font-bold text-white">{app?.name || 'Ứng dụng'}</span>
                </div>
                <h3 className="text-lg font-extrabold text-white">Báo cáo thành phẩm</h3>
                <p className="text-xs text-white/70 mt-1">{post.timestamp}{teamName ? ` • ${teamName}` : ''}</p>
              </div>
              <button
                onClick={() => setIsMvpModalOpen(false)}
                className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer border-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Preview quote */}
              {post.resultPreview && (
                <div className="border-l-2 border-orange-500/40 pl-4">
                  <p className="text-sm text-gray-300 italic leading-relaxed">&ldquo;{post.resultPreview}&rdquo;</p>
                </div>
              )}

              {/* Metrics Grid enlarged */}
              {post.resultMetrics && post.resultMetrics.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {post.resultMetrics.map((met, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold truncate">{met.label}</span>
                      <span className="text-xl text-white font-extrabold block mt-1 truncate">{met.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Simulated result */}
              <div className="bg-gray-950/50 border border-white/5 rounded-xl p-4 space-y-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Chi tiết kết quả</span>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {post.resultPreview || 'Chưa có mô tả chi tiết kết quả vận hành.'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-gray-600">Powered by AI2Hero</span>
              <button
                onClick={() => setIsMvpModalOpen(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs text-gray-300 font-bold rounded-lg border border-white/10 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
