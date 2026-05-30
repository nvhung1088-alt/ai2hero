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
import FeedPostCard from '@/components/feed-post-card';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { 
  createFeedPostAction, 
  toggleFeedLikeAction, 
  addFeedCommentAction, 
  toggleFeedPinAction, 
  changeTaskStatusAction 
} from '@/app/(login)/actions';
import { markSingleAnnouncementAsReadAction } from '@/lib/db/notification-actions';

const SIMPLE_EMOJIS = ['😀', '🔥', '🎉', '🚀', '💯', '👏', '🎯', '❤️', '💡', '👑'];

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

  const [isPublishing, setIsPublishing] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'task_assignment' | 'system_activity' | 'news'>('news');
  
  const [publishTeamId, setPublishTeamId] = useState<number>(
    teams.length > 0 ? teams[0].id : 0
  );
  const [dismissedBanner, setDismissedBanner] = useState(false);
  
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

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

  // Mentions
  const [mentionDropdownOpen, setMentionDropdownOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  
  // Attachments
  const [postAttachments, setPostAttachments] = useState<any[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pending, setPending] = useState(false);

  // Image URL Modal
  const [showImageUrlModal, setShowImageUrlModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Sync state with server-side props
  useEffect(() => {
    setFeedPosts(initialPosts);
  }, [initialPosts]);

  // Static list of possible members & workspaces to mention based on database or mock data
  const mentionSuggestions = useMemo(() => {
    const allSuggestions: { id: string; name: string; avatar: string; role: string; type: 'member' | 'workspace' }[] = [];
    const seenIds = new Set<string>();
    
    const targetTeam = teams?.find(t => t.id === publishTeamId);
    const scopedTeams = targetTeam ? [targetTeam] : [];

    if (scopedTeams.length > 0) {
      // Group 1: Workspaces
      for (const team of scopedTeams) {
        const key = `ws-${team.id}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          allSuggestions.push({
            id: key,
            name: team.name || 'Không gian',
            avatar: team.avatar || '💼',
            role: 'workspace',
            type: 'workspace'
          });
        }
      }

      // Group 2: Members
      for (const team of scopedTeams) {
        if (team.teamMembers) {
          for (const tm of team.teamMembers) {
            const uid = tm.user?.id || tm.userId;
            const key = `m-${uid}`;
            if (uid && !seenIds.has(key) && uid !== user.id) {
              seenIds.add(key);
              allSuggestions.push({
                id: key,
                name: tm.user.name || tm.user.email || 'Thành viên',
                avatar: (tm.user.name || tm.user.email || '?').charAt(0).toUpperCase(),
                role: tm.role || 'member',
                type: 'member'
              });
            }
          }
        }
      }
    }
    
    if (!mentionSearch) return allSuggestions.slice(0, 10);
    return allSuggestions.filter((m) =>
      m.name.toLowerCase().includes(mentionSearch.toLowerCase())
    ).slice(0, 10);
  }, [mentionSearch, teams, user.id, publishTeamId]);

  const handleTextareaChange = (val: string) => {
    setPostContent(val);
    
    const lastAtIdx = val.lastIndexOf('@');
    const threshold = Math.max(0, val.length - 15);
    if (lastAtIdx !== -1 && lastAtIdx >= threshold) {
      const textAfterAt = val.substring(lastAtIdx + 1);
      if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
        setMentionDropdownOpen(false);
      } else {
        setMentionDropdownOpen(true);
        setMentionSearch(textAfterAt);
        setMentionIndex(lastAtIdx);
      }
    } else {
      setMentionDropdownOpen(false);
    }
  };

  const selectMemberToMention = (memberName: string) => {
    if (mentionIndex === -1) return;
    const beforeAt = postContent.substring(0, mentionIndex);
    const newContent = `${beforeAt}@${memberName} `;
    setPostContent(newContent);
    setMentionDropdownOpen(false);
    
    if (!selectedMentions.includes(memberName)) {
      setSelectedMentions((prev) => [...prev, memberName]);
    }
  };

  const addEmojiToPost = (emoji: string) => {
    setPostContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleImageAttachment = () => {
    if (postAttachments.length > 0) {
      setPostAttachments([]);
      showToast('Đã gỡ bỏ ảnh đính kèm!', 'info');
    } else {
      setImageUrlInput('');
      setShowImageUrlModal(true);
    }
  };

  const submitImageAttachment = (url: string) => {
    if (url && url.trim()) {
      const urlTrimmed = url.trim();
      const fallbackName = urlTrimmed.split('/').pop()?.split('?')[0] || 'image_attachment.png';
      const mockAttachment = {
        type: 'image',
        url: urlTrimmed,
        thumbnailUrl: urlTrimmed,
        fileName: fallbackName.endsWith('.png') || fallbackName.endsWith('.jpg') || fallbackName.endsWith('.jpeg') || fallbackName.endsWith('.gif') ? fallbackName : `${fallbackName}.png`,
        caption: 'Ảnh đính kèm từ người dùng'
      };
      setPostAttachments([mockAttachment]);
      showToast('📸 Đã đính kèm ảnh thành công!', 'success');
    }
    setShowImageUrlModal(false);
    setImageUrlInput('');
  };

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

  const handlePublishPost = async () => {
    if (!postContent.trim()) {
      showToast('Vui lòng nhập nội dung bài viết!', 'error');
      return;
    }

    if (postType === 'task_assignment' && !taskTitle.trim()) {
      showToast('Vui lòng nhập tiêu đề công việc!', 'error');
      return;
    }

    setPending(true);

    try {
      const res = await createFeedPostAction({
        type: postType,
        teamIdString: `team-${publishTeamId}`,
        message: postContent,
        mentions: selectedMentions,
        attachments: postAttachments,
        taskTitle: postType === 'task_assignment' ? taskTitle.trim() : undefined,
        taskAssignee: postType === 'task_assignment' ? taskAssignee : undefined,
        taskDueDate: postType === 'task_assignment' ? taskDueDate : undefined
      });

      if (res.error) {
        showToast(res.error, 'error');
      } else {
        setPostContent('');
        setTaskTitle('');
        setSelectedMentions([]);
        setPostAttachments([]);
        setShowEmojiPicker(false);
        setIsPublishing(false);
        setCurrentPage(1);
        showToast('🎉 Đăng bài thành công lên bảng tin!', 'success');
        router.refresh();
      }
    } catch (err) {
      showToast('Lỗi đăng bài viết.', 'error');
    } finally {
      setPending(false);
    }
  };

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
      <div className="bg-gray-900/30 border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden">
        {userRole === 'viewer' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-4">
            <div className="h-10 w-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-2 animate-float">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <p className="font-extrabold text-white text-sm">Không gian làm việc Chỉ Xem (Viewer)</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">Vai trò hiện tại của bạn không được phép xuất bản bài đăng chia sẻ lên Bảng tin.</p>
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center text-sm font-black select-none shrink-0 shadow-md text-white">
            {(user.name || user.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 space-y-3">
            <div className="relative">
              <textarea
                value={postContent}
                onChange={(e) => handleTextareaChange(e.target.value)}
                onFocus={() => setIsPublishing(true)}
                placeholder="Bạn muốn chia sẻ kết quả hoặc cập nhật mới nào hôm nay? Sử dụng @ để gắn thẻ đồng nghiệp..."
                rows={isPublishing ? 3 : 1}
                className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/10 focus:border-orange-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-all resize-none"
              />

              {/* Mention Autocomplete Dropdown */}
              {mentionDropdownOpen && mentionSuggestions.length > 0 && (
                <div className="absolute z-20 left-0 top-full bg-gray-900 border border-white/10 rounded-xl mt-1 max-h-40 overflow-y-auto w-64 shadow-2xl p-1 animate-scale-up">
                  <p className="text-[10px] text-gray-500 font-bold uppercase p-1.5 border-b border-white/5 tracking-widest">
                    Gợi ý nhắc tên (@)
                  </p>
                  {mentionSuggestions.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => selectMemberToMention(member.name)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm shrink-0">{member.avatar}</span>
                        <span className="font-semibold truncate">{member.name}</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                        member.type === 'workspace'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {member.type === 'workspace' ? 'Không gian' : member.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Emoji Picker Panel */}
            {showEmojiPicker && (
              <div className="bg-gray-900 border border-white/10 rounded-xl p-2 shadow-2xl flex flex-wrap gap-1.5 max-w-[280px] animate-scale-up mt-1">
                {SIMPLE_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => addEmojiToPost(emoji)}
                    className="h-8 w-8 text-lg flex items-center justify-center rounded-lg hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Attachments list */}
            {postAttachments.length > 0 && (
              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-gray-950 max-h-[160px] max-w-[280px] aspect-video flex items-center justify-center group mt-2">
                <img 
                  src={postAttachments[0].url} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPostAttachments([])}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-[10px] text-gray-300 font-semibold truncate">
                  📎 {postAttachments[0].fileName}
                </div>
              </div>
            )}

            {/* Attachment Actions Bar */}
            {isPublishing && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/5 bg-white/[0.02] rounded-xl p-3 mt-2">
                <span className="text-[11px] font-bold text-gray-400">Thêm vào bài viết của bạn</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleImageAttachment}
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                      postAttachments.length > 0
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                        : 'hover:bg-white/5 text-gray-400 hover:text-white'
                    }`}
                    title="Đính kèm ảnh từ URL"
                  >
                    <Image className="h-4 w-4 text-emerald-400" />
                    <span className="hidden sm:inline">Ảnh/Video</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setPostContent((prev) => prev + '@');
                      handleTextareaChange(postContent + '@');
                    }}
                    className="p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4 text-blue-400" />
                    <span className="hidden sm:inline">Gắn thẻ</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                      showEmojiPicker
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20'
                        : 'hover:bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Smile className="h-4 w-4 text-amber-400" />
                    <span className="hidden sm:inline">Cảm xúc</span>
                  </button>
                </div>
              </div>
            )}
            
            {isPublishing && (
              <div className="space-y-4 pt-2 border-t border-white/5 animate-fade-in">
                {/* Không gian đăng bài */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest shrink-0">
                    Không gian đăng:
                  </span>
                  <select
                    value={publishTeamId}
                    onChange={(e) => setPublishTeamId(Number(e.target.value))}
                    className="bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.avatar || '💼'} {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Loại bài đăng */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest shrink-0">
                    Loại bài đăng:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'news', label: '📰 Tin tức', color: 'emerald', roleRestricted: false },
                      { key: 'task_assignment', label: '📅 Giao việc', color: 'amber', roleRestricted: true },
                      { key: 'system_activity', label: '⚡ Thông báo', color: 'blue', roleRestricted: true }
                    ].map((type) => {
                      const isDisabled = type.roleRestricted && userRole === 'staff';
                      const isActive = postType === type.key;
                      
                      let activeStyle = '';
                      if (isActive) {
                        if (type.color === 'emerald') activeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        else if (type.color === 'amber') activeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                        else if (type.color === 'blue') activeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                      } else {
                        activeStyle = 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10';
                      }

                      return (
                        <button
                          key={type.key}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => setPostType(type.key as any)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${activeStyle}`}
                        >
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Form Giao việc (chỉ hiện khi chọn task_assignment) */}
                {postType === 'task_assignment' && (
                  <div className="flex flex-col sm:flex-row gap-3 bg-white/5 p-4 rounded-xl border border-white/5 items-end animate-scale-up">
                    <div className="space-y-1.5 flex-1 w-full">
                      <label className="text-xs font-semibold text-gray-400">Tên nhiệm vụ:</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Cấu hình API key mới..."
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1 w-full">
                      <label className="text-xs font-semibold text-gray-400">Giao cho:</label>
                      <select
                        value={taskAssignee}
                        onChange={(e) => setTaskAssignee(e.target.value)}
                        className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="">— Chọn người nhận —</option>
                        {(() => {
                          const targetTeam = teams.find((t) => t.id === publishTeamId);
                          if (!targetTeam?.teamMembers) return null;
                          return targetTeam.teamMembers.map((tm: any) => (
                            <option key={tm.user?.id} value={tm.user?.name || tm.user?.email}>
                              {tm.user?.name || tm.user?.email} ({tm.role})
                            </option>
                          ));
                        })()}
                        <option value="Tất cả thành viên">Tất cả thành viên</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 flex-1 w-full">
                      <label className="text-xs font-semibold text-gray-400">Hạn chót:</label>
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPublishing(false);
                      setPostContent('');
                    }}
                    disabled={pending}
                    className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={pending || !postContent.trim()}
                    onClick={handlePublishPost}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-95 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-orange-500/10 cursor-pointer"
                  >
                    {pending ? 'Đang xuất bản...' : 'Xuất bản bài đăng'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
                    onCommentInputChange={(val) => handleCommentInputChange(pinnedPost.id, val)}
                    commentsList={pinnedPost.comments}
                    onAddComment={() => addComment(pinnedPost.id)}
                    isTaskCompleted={pinnedPost.taskStatus === 'completed'}
                    onTaskToggle={() => toggleTask(pinnedPost.id)}
                    index={0}
                    userRole={userRole}
                    onPinToggle={() => togglePin(pinnedPost.id)}
                    onTaskStatusChange={(status) => changeTaskStatus(pinnedPost.id, status)}
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
                            onCommentInputChange={(val) => handleCommentInputChange(post.id, val)}
                            commentsList={commentsList}
                            onAddComment={() => addComment(post.id)}
                            isTaskCompleted={isTaskCompleted}
                            onTaskToggle={() => toggleTask(post.id)}
                            index={index}
                            userRole={userRole}
                            onPinToggle={() => togglePin(post.id)}
                            onTaskStatusChange={(status) => changeTaskStatus(post.id, status)}
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

      {showImageUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-4">
          <div className="bg-gray-900/90 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Image className="h-5 w-5 text-orange-400" />
                Đính kèm hình ảnh
              </h3>
              <button 
                onClick={() => { setShowImageUrlModal(false); setImageUrlInput(''); }}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-xs text-gray-400 leading-relaxed">
              Nhập liên kết (URL) của hình ảnh từ internet (hỗ trợ JPG, PNG, GIF, v.v.). Hình ảnh sẽ được hiển thị trên bài viết của bạn.
            </p>
            
            <input
              type="text"
              placeholder="https://example.com/image.jpg"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submitImageAttachment(imageUrlInput);
                } else if (e.key === 'Escape') {
                  setShowImageUrlModal(false);
                  setImageUrlInput('');
                }
              }}
            />
            
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowImageUrlModal(false); setImageUrlInput(''); }}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => submitImageAttachment(imageUrlInput)}
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 rounded-xl transition-all active:scale-95 shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                Đính kèm
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
