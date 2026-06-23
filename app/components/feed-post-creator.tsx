'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Image, Smile, X, UserPlus, ShieldAlert, Globe, Tag, CheckCircle2, ShoppingBag, Newspaper, FileEdit, CalendarCheck, Upload, Plus, Share2
} from 'lucide-react';
import { getRoleByKey, type RoleKey } from '@/lib/shared-constants';
import { createFeedPostAction } from '@/app/(login)/actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { CrossPostModal } from '@/app/(social)/(main)/components/crosspost-modal';

const SIMPLE_EMOJIS = ['😀', '🔥', '🎉', '🚀', '💯', '👏', '🎯', '❤️', '💡', '👑'];

interface FeedPostCreatorProps {
  user: any;
  teams: any[];
  userRole: RoleKey;
  initialPublishTeamId: number;
  targetType?: 'team' | 'page' | 'group';
  onPostCreated?: () => void;
}

export default function FeedPostCreator({
  user,
  teams,
  userRole,
  initialPublishTeamId,
  targetType = 'team',
  onPostCreated
}: FeedPostCreatorProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [publishTeamId, setPublishTeamId] = useState<number>(initialPublishTeamId || (teams.length > 0 ? teams[0].id : 0));
  
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'task_assignment' | 'news' | 'product' | 'article'>('news');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');

  const [syncWebsite, setSyncWebsite] = useState(false);
  const [websiteCategory, setWebsiteCategory] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);

  const [taggedProducts, setTaggedProducts] = useState<any[]>([]);
  const [showTagProductModal, setShowTagProductModal] = useState(false);
  
  const [mentionDropdownOpen, setMentionDropdownOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  
  const [postAttachments, setPostAttachments] = useState<any[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pending, setPending] = useState(false);

  const [showImageUrlModal, setShowImageUrlModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const [wantsToCrossPost, setWantsToCrossPost] = useState(false);
  const [createdPostId, setCreatedPostId] = useState<number | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  // Sync publishTeamId with prop updates
  useEffect(() => {
    if (initialPublishTeamId) {
      setPublishTeamId(initialPublishTeamId);
    }
  }, [initialPublishTeamId]);

  // Handle escape key and click outside for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showImageUrlModal) {
          setShowImageUrlModal(false);
          return;
        }
        if (mentionDropdownOpen) {
          setMentionDropdownOpen(false);
          return;
        }
        if (showEmojiPicker) {
          setShowEmojiPicker(false);
          return;
        }
        handleCloseAttempt();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (mentionDropdownOpen && mentionDropdownRef.current && !mentionDropdownRef.current.contains(target)) {
        setMentionDropdownOpen(false);
      }
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(target)) {
        setShowEmojiPicker(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, postContent, postAttachments, taskTitle, showImageUrlModal, mentionDropdownOpen, showEmojiPicker]);

  const handleCloseAttempt = () => {
    if (postContent.trim() || postAttachments.length > 0 || taskTitle.trim()) {
      if (window.confirm('Bạn có muốn bỏ bài viết này không? Mọi nội dung sẽ bị mất.')) {
        closeAndReset();
      }
    } else {
      closeAndReset();
    }
  };

  const closeAndReset = () => {
    setIsOpen(false);
    setPostContent('');
    setTaskTitle('');
    setSelectedMentions([]);
    setPostAttachments([]);
    setShowEmojiPicker(false);
    setShowImageUrlModal(false);
    setSyncWebsite(false);
    setTaggedProducts([]);
    setVisibility('public');
    setWantsToCrossPost(false);
  };

  const openModal = () => {
    if (!user) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    if (userRole === 'viewer') {
      showToast('Vai trò của bạn (Viewer) không được phép đăng bài.', 'error');
      return;
    }
    setIsOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const mentionSuggestions = useMemo(() => {
    const allSuggestions: { id: string; name: string; avatar: string; role: string; type: 'member' | 'workspace' }[] = [];
    const seenIds = new Set<string>();
    
    const targetTeam = teams?.find(t => t.id === publishTeamId);
    const scopedTeams = targetTeam ? [targetTeam] : [];

    if (scopedTeams.length > 0) {
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

      for (const team of scopedTeams) {
        if (team.teamMembers) {
          for (const tm of team.teamMembers) {
            const uid = tm.user?.id || tm.userId;
            const key = `m-${uid}`;
            if (uid && !seenIds.has(key) && (!user || uid !== user.id)) {
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
  }, [mentionSearch, teams, user?.id, publishTeamId]);

  const handleTextareaChange = (val: string) => {
    setPostContent(val);
    
    const lastAtIdx = val.lastIndexOf('@');
    const threshold = Math.max(0, val.length - 15);
    if (lastAtIdx !== -1 && lastAtIdx >= threshold) {
      const textAfterAt = val.substring(lastAtIdx + 1);
      if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
        setMentionDropdownOpen(false);
      } else {
        setShowEmojiPicker(false);
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
    textareaRef.current?.focus();
  };

  const addEmojiToPost = (emoji: string) => {
    setPostContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleImageAttachment = () => {
    setImageUrlInput('');
    setShowImageUrlModal(true);
  };

  const addUrlAndKeepOpen = () => {
    if (imageUrlInput && imageUrlInput.trim()) {
      const urlTrimmed = imageUrlInput.trim();
      const fallbackName = urlTrimmed.split('/').pop()?.split('?')[0] || 'media_attachment.png';
      const mockAttachment = {
        type: urlTrimmed.match(/\.(mp4|webm|ogg)/i) ? 'video' : 'image',
        url: urlTrimmed,
        thumbnailUrl: urlTrimmed,
        fileName: fallbackName,
        caption: 'Đính kèm từ URL'
      };
      setPostAttachments(prev => [...prev, mockAttachment]);
      setImageUrlInput('');
      showToast('Đã thêm 1 tệp đính kèm!', 'success');
      return true;
    }
    return false;
  };

  const submitImageAttachment = () => {
    addUrlAndKeepOpen();
    setShowImageUrlModal(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    showToast(`Đang tải lên ${files.length} tệp...`, 'success');
    setShowImageUrlModal(false);
    
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        if (data.url) {
          const newAttachment = {
            type: file.type.startsWith('video/') ? 'video' : 'image',
            url: data.url,
            thumbnailUrl: data.url,
            fileName: file.name,
            caption: file.name
          };
          setPostAttachments(prev => [...prev, newAttachment]);
        } else {
          showToast(`Lỗi tải lên ${file.name}: ${data.error || 'Unknown'}`, 'error');
        }
      } catch (err) {
        showToast(`Lỗi mạng khi tải lên ${file.name}`, 'error');
      }
    }
  };

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
        teamIdString: `${targetType}-${publishTeamId}`,
        message: postContent,
        mentions: selectedMentions,
        attachments: postAttachments,
        syncWebsite,
        websiteCategory,
        taggedProducts,
        taskTitle: postType === 'task_assignment' ? taskTitle.trim() : undefined,
        taskAssignee: postType === 'task_assignment' ? taskAssignee : undefined,
        taskDueDate: postType === 'task_assignment' ? taskDueDate : undefined,
        visibility
      });

      if (res.error) {
        showToast(res.error, 'error');
      } else {
        if (wantsToCrossPost && res.postId) {
          setCreatedPostId(res.postId);
          // Ẩn creator modal, hiện crosspost modal
          setIsOpen(false);
        } else {
          closeAndReset();
        }
        
        showToast('🎉 Đăng bài thành công lên bảng tin!', 'success');
        
        // Refresh feed in background
        if (onPostCreated) {
          onPostCreated();
        } else {
          router.refresh();
        }
      }
    } catch (err) {
      showToast('Lỗi đăng bài viết.', 'error');
    } finally {
      setPending(false);
    }
  };

  // Callback khi Crosspost modal đóng lại
  const handleCrossPostModalClose = () => {
    setCreatedPostId(null);
    closeAndReset();
  };

  // Nếu là viewer, thay vì hiển thị khối click được, hiện khối báo lỗi tĩnh
  if (userRole === 'viewer') {
    return (
      <div className="bg-gray-900/30 border border-white/5 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col items-center justify-center text-center">
        <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4">
          <div className="h-10 w-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-2 animate-float">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <p className="font-extrabold text-white text-sm">Không gian làm việc Chỉ Xem (Viewer)</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">Vai trò hiện tại của bạn không được phép xuất bản bài đăng chia sẻ lên Bảng tin.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 1. Collapsed State: Inline Trigger */}
      <div className="bg-gray-900/30 border border-white/5 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center text-sm font-black select-none shrink-0 shadow-md text-white">
            {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
          </div>
          <button 
            onClick={openModal}
            className="flex-1 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-full px-4 py-2.5 text-sm text-left text-gray-400 transition-all cursor-pointer truncate"
          >
            Bạn muốn chia sẻ kết quả hoặc cập nhật mới nào hôm nay?
          </button>
        </div>
        <div className="flex items-center justify-around mt-3 pt-3 border-t border-white/5">
          <button onClick={openModal} className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer">
            <Image className="h-5 w-5 text-emerald-400" />
            <span className="text-xs font-semibold">Ảnh/Video</span>
          </button>
          <button onClick={openModal} className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer">
            <UserPlus className="h-5 w-5 text-blue-400" />
            <span className="text-xs font-semibold">Gắn thẻ</span>
          </button>
          <button onClick={openModal} className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer">
            <Smile className="h-5 w-5 text-amber-400" />
            <span className="text-xs font-semibold">Cảm xúc</span>
          </button>
        </div>
      </div>

      {/* 2. Expanded State: Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          {/* Backdrop Click */}
          <div className="absolute inset-0 cursor-pointer" onClick={handleCloseAttempt} />

          <div 
            ref={modalRef} 
            className="relative w-full max-w-xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-up z-10"
          >
            {/* Header */}
            <div className="relative flex items-center justify-center p-4 border-b border-white/5 bg-gray-950">
              <h2 className="text-base font-extrabold text-white">Tạo bài viết</h2>
              <button 
                onClick={handleCloseAttempt}
                className="absolute right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[80vh] flex flex-col custom-scrollbar">
              {/* User Context & Audience Selector */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center text-sm font-black select-none shrink-0 shadow-md text-white">
                  {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{user?.name || user?.email || 'Khách'}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <select
                      value={publishTeamId}
                      onChange={(e) => setPublishTeamId(Number(e.target.value))}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-0.5 text-[11px] font-semibold text-gray-300 focus:outline-none focus:border-orange-500 cursor-pointer w-fit appearance-none"
                      style={{ paddingRight: '16px' }}
                    >
                      {teams.map((team) => (
                        <option key={team.id} value={team.id} className="bg-gray-900">
                          {team.avatar || '💼'} {team.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value as 'public' | 'friends' | 'private')}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-0.5 text-[11px] font-semibold text-gray-300 focus:outline-none focus:border-orange-500 cursor-pointer w-fit appearance-none flex items-center gap-1"
                    >
                      <option value="public" className="bg-gray-900">🌎 Công khai</option>
                      <option value="friends" className="bg-gray-900">👥 Bạn bè</option>
                      <option value="private" className="bg-gray-900">🔒 Chỉ mình tôi</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative mb-2 flex-1 min-h-[120px]">
                <textarea
                  ref={textareaRef}
                  value={postContent}
                  onChange={(e) => handleTextareaChange(e.target.value)}
                  disabled={pending}
                  placeholder="Bạn đang nghĩ gì thế?"
                  className="w-full h-full min-h-[120px] bg-transparent text-lg text-white placeholder-gray-500 focus:outline-none resize-none disabled:opacity-50"
                />

                {mentionDropdownOpen && mentionSuggestions.length > 0 && (
                  <div ref={mentionDropdownRef} className="absolute z-20 left-0 top-full bg-gray-900 border border-white/10 rounded-xl mt-1 max-h-40 overflow-y-auto w-64 shadow-2xl p-1 animate-scale-up">
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

              {/* Indicators */}
              {(syncWebsite || taggedProducts.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-3 animate-fade-in">
                  {syncWebsite && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md text-[10px] font-bold text-purple-400">
                      <Globe className="w-3 h-3" />
                      Đồng bộ: Website {websiteCategory ? `(${websiteCategory})` : ''}
                      <button onClick={() => setSyncWebsite(false)} className="ml-1 hover:text-white"><X className="w-3 h-3"/></button>
                    </div>
                  )}
                  {taggedProducts.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-md text-[10px] font-bold text-orange-400">
                      <Tag className="w-3 h-3" />
                      Gắn thẻ: {taggedProducts.length} sản phẩm
                      <button onClick={() => setTaggedProducts([])} className="ml-1 hover:text-white"><X className="w-3 h-3"/></button>
                    </div>
                  )}
                </div>
              )}

              {/* Attachment Preview */}
              {postAttachments.length > 0 && (
                <div className={`grid gap-2 mb-4 ${postAttachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                  {postAttachments.map((att, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden border border-white/10 bg-gray-950 flex items-center justify-center group aspect-video">
                      {att.type === 'video' ? (
                        <video src={att.url} className="w-full h-full object-cover" controls />
                      ) : (
                        <img src={att.url} alt="Preview" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => setPostAttachments(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="bg-gray-900 border border-white/10 rounded-xl p-2 shadow-2xl flex flex-wrap gap-1.5 max-w-[280px] animate-scale-up mb-4 mx-auto">
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

              {/* Form Giao việc */}
              {postType === 'task_assignment' && (
                <div className="flex flex-col gap-3 bg-white/5 p-4 rounded-xl border border-white/5 mb-4 animate-scale-up">
                  <div className="space-y-1.5 w-full">
                    <label className="text-xs font-semibold text-gray-400">Tên nhiệm vụ:</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Cấu hình API key mới..."
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
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
                </div>
              )}

              {/* Loại bài đăng Selection */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'news', label: 'Tin tức', icon: <Newspaper className="w-4 h-4" />, color: 'emerald', roleRestricted: false },
                    { key: 'product', label: 'Sản phẩm', icon: <ShoppingBag className="w-4 h-4" />, color: 'blue', roleRestricted: false },
                    { key: 'article', label: 'Bài viết', icon: <FileEdit className="w-4 h-4" />, color: 'gray', roleRestricted: false },
                    { key: 'task_assignment', label: 'Giao việc', icon: <CalendarCheck className="w-4 h-4" />, color: 'purple', roleRestricted: true }
                  ].map((type) => {
                    const isDisabled = type.roleRestricted && userRole === 'staff';
                    const isActive = postType === type.key;
                    
                    let activeStyle = '';
                    if (isActive) {
                      if (type.color === 'emerald') activeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                      else if (type.color === 'purple') activeStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                      else if (type.color === 'blue') activeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                      else if (type.color === 'gray') activeStyle = 'bg-gray-500/10 text-gray-300 border-gray-500/20';
                    } else {
                      activeStyle = 'bg-gray-900 text-gray-400 border-transparent hover:bg-white/5 hover:border-white/10';
                    }

                    return (
                      <button
                        key={type.key}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setPostType(type.key as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${activeStyle}`}
                      >
                        {type.icon} {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add to your post Bar */}
              <div className="flex items-center justify-between border border-white/10 rounded-xl p-3 mb-4 bg-gray-950 shadow-inner">
                <span className="text-[13px] font-bold text-gray-300 select-none pl-1">Thêm vào bài viết của bạn</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowSyncModal(true)}
                    className={`p-2 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      syncWebsite
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'hover:bg-white/10 text-gray-400'
                    }`}
                    title="Đồng bộ lên Website"
                  >
                    <Globe className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setWantsToCrossPost(!wantsToCrossPost)}
                    className={`p-2 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      wantsToCrossPost
                        ? 'bg-pink-500/20 text-pink-400'
                        : 'hover:bg-white/10 text-gray-400'
                    }`}
                    title="Đăng chéo mạng xã hội"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTagProductModal(true)}
                    className={`p-2 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      taggedProducts.length > 0
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'hover:bg-white/10 text-gray-400'
                    }`}
                    title="Gắn thẻ Sản phẩm"
                  >
                    <Tag className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleImageAttachment}
                    className={`p-2 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      postAttachments.length > 0
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'hover:bg-white/10 text-gray-400'
                    }`}
                    title="Ảnh/Video"
                  >
                    <Image className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPostContent((prev) => prev + '@');
                      handleTextareaChange(postContent + '@');
                      textareaRef.current?.focus();
                    }}
                    className="p-2 rounded-full flex items-center justify-center hover:bg-white/10 text-gray-400 transition-all cursor-pointer"
                    title="Gắn thẻ người khác"
                  >
                    <UserPlus className="h-5 w-5 text-blue-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowEmojiPicker(!showEmojiPicker); setMentionDropdownOpen(false); }}
                    className={`p-2 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      showEmojiPicker
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'hover:bg-white/10 text-gray-400'
                    }`}
                    title="Cảm xúc/Hoạt động"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Post Button */}
              <button
                type="button"
                disabled={pending || (!postContent.trim() && postAttachments.length === 0)}
                onClick={handlePublishPost}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                {pending ? 'Đang đăng...' : 'Đăng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Modal */}
      {showImageUrlModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowImageUrlModal(false)} />
          <div className="relative w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4 animate-scale-up z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Thêm Ảnh/Video</h3>
              <button onClick={() => setShowImageUrlModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors">
              <div className="p-3 bg-blue-500/20 text-blue-400 rounded-full">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-gray-300">Tải lên từ máy tính của bạn</p>
              <label className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors">
                Chọn Tệp
                <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-xs text-gray-500 font-semibold uppercase">Hoặc dán URL</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <p className="text-sm text-gray-400">Nhập đường dẫn (URL) của hình ảnh/video bạn muốn đính kèm.</p>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addUrlAndKeepOpen();
                  if (e.key === 'Escape') setShowImageUrlModal(false);
                }}
                placeholder="https://example.com/media.mp4"
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                autoFocus
              />
              <button
                type="button"
                onClick={addUrlAndKeepOpen}
                disabled={!imageUrlInput.trim()}
                className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-xl text-white transition-colors cursor-pointer"
                title="Thêm và tiếp tục nhập"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-orange-400 font-semibold">
                Đã thêm: {postAttachments.length} tệp
              </span>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowImageUrlModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer">
                  Đóng
                </button>
                <button
                  onClick={submitImageAttachment}
                  className="px-5 py-2.5 rounded-xl bg-white text-black hover:bg-gray-200 text-sm font-black shadow-md transition-all cursor-pointer"
                >
                  Xong
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Website Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowSyncModal(false)} />
          <div className="relative w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4 animate-scale-up z-10">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2"><Globe className="w-5 h-5 text-purple-400"/> Đồng bộ lên Website</h3>
              <button onClick={() => setShowSyncModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
              <input type="checkbox" checked={syncWebsite} onChange={(e) => setSyncWebsite(e.target.checked)} className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500" />
              <div>
                <p className="text-sm font-bold text-white">Xuất bản lên Website</p>
                <p className="text-xs text-gray-400">Bài viết sẽ tự động hiển thị trên website của bạn.</p>
              </div>
            </label>

            {syncWebsite && (
              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-gray-300">Chọn danh mục trên Web:</label>
                <select 
                  value={websiteCategory} 
                  onChange={(e) => setWebsiteCategory(e.target.value)}
                  className="w-full bg-gray-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">-- Chọn danh mục --</option>
                  <option value="news">Tin tức mới</option>
                  <option value="blog">Blog chia sẻ</option>
                  <option value="promo">Khuyến mãi</option>
                </select>
                <p className="text-xs text-purple-400/80">Lưu ý: Danh mục này sẽ được tải động từ Website của bạn sau này.</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
              <button onClick={() => setShowSyncModal(false)} className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-black shadow-md transition-all cursor-pointer">
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Product Modal */}
      {showTagProductModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowTagProductModal(false)} />
          <div className="relative w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-scale-up z-10">
            <div className="flex items-center justify-between border-b border-white/5 p-5">
              <h3 className="text-lg font-black text-white flex items-center gap-2"><Tag className="w-5 h-5 text-orange-400"/> Gắn thẻ sản phẩm</h3>
              <button onClick={() => setShowTagProductModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              <p className="text-xs text-gray-400 mb-2">Chọn tối đa 3 sản phẩm từ cửa hàng của bạn để gắn vào bài viết.</p>
              
              {[
                { id: 1, name: 'Áo Thun Basic Hero', price: '199.000đ', img: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&q=80' },
                { id: 2, name: 'Giày Thể Thao Pro', price: '850.000đ', img: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=100&q=80' },
                { id: 3, name: 'Túi Xách Da Cao Cấp', price: '1.200.000đ', img: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=100&q=80' },
                { id: 4, name: 'Đồng Hồ Thời Trang', price: '2.500.000đ', img: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=100&q=80' },
              ].map(prod => {
                const isSelected = taggedProducts.find(p => p.id === prod.id);
                return (
                  <div 
                    key={prod.id} 
                    onClick={() => {
                      if (isSelected) {
                        setTaggedProducts(prev => prev.filter(p => p.id !== prod.id));
                      } else if (taggedProducts.length < 3) {
                        setTaggedProducts(prev => [...prev, prod]);
                      } else {
                        showToast('Chỉ được gắn tối đa 3 sản phẩm!', 'error');
                      }
                    }}
                    className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer ${isSelected ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 hover:border-white/20 bg-gray-950'}`}
                  >
                    <img src={prod.img} className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{prod.name}</p>
                      <p className="text-xs text-orange-400 font-semibold">{prod.price}</p>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-orange-500" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-gray-600" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-5 border-t border-white/5 bg-gray-950 flex justify-between items-center rounded-b-2xl">
              <span className="text-xs font-bold text-orange-400">Đã chọn: {taggedProducts.length}/3</span>
              <button onClick={() => setShowTagProductModal(false)} className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-black shadow-md transition-all cursor-pointer">
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CrossPost Modal (After Post Creation) */}
      {createdPostId !== null && (
        <CrossPostModal
          isOpen={true}
          onClose={handleCrossPostModalClose}
          postId={createdPostId}
          teamId={publishTeamId}
        />
      )}
    </>
  );
}
