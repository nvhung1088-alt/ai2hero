'use client';

import { useState } from 'react';
import { editFeedPostAction } from '@/app/(login)/actions';
import { Loader2 } from 'lucide-react';

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

interface PostContentProps {
  postId?: number;
  message: string;
  type: string;
  isEditing?: boolean;
  onEditComplete?: () => void;
}

export default function PostContent({ postId, message, type, isEditing, onEditComplete }: PostContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editMessage, setEditMessage] = useState(message);
  const [isSaving, setIsSaving] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(message);
  
  // Facebook roughly limits text to 4 lines before showing "See More"
  // A rough character count approximation (e.g. 250 chars) or CSS line-clamp.
  // We'll use CSS line-clamp and a manual check, but since CSS line-clamp 
  // is hard to measure in React without a ref, we'll do a simple length check.
  const MAX_CHARS = 250;
  const isLong = currentMessage && currentMessage.length > MAX_CHARS;

  const contentToRender = isExpanded || !isLong 
    ? currentMessage 
    : `${currentMessage.substring(0, MAX_CHARS)}...`;

  const baseStyle = type === 'news' 
    ? "text-sm lg:text-base text-gray-200 leading-relaxed font-medium"
    : "text-sm text-gray-200 leading-relaxed";

  const handleSaveEdit = async () => {
    if (!postId || editMessage.trim().length === 0) return;
    setIsSaving(true);
    try {
      const res = await editFeedPostAction({ postId, message: editMessage });
      if (res.error) {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(res.error, 'error');
        }
      } else {
        setCurrentMessage(editMessage.trim());
        if (onEditComplete) onEditComplete();
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast('Sửa bài viết thành công!', 'success');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMessage(currentMessage);
    if (onEditComplete) onEditComplete();
  };

  if (isEditing) {
    return (
      <div className="space-y-3 animate-fade-in">
        <textarea 
          className="w-full bg-gray-900/50 text-white rounded-lg p-3 text-sm border border-white/10 focus:border-orange-500/50 outline-none resize-none min-h-[100px]"
          value={editMessage}
          onChange={(e) => setEditMessage(e.target.value)}
          placeholder="Nhập nội dung mới..."
          disabled={isSaving}
        />
        <div className="flex justify-end gap-2">
          <button 
            className="text-xs px-4 py-2 rounded-full font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
            onClick={handleCancelEdit}
            disabled={isSaving}
          >
            Hủy
          </button>
          <button 
            className="text-xs px-4 py-2 rounded-full font-bold bg-orange-500 hover:bg-orange-600 text-white transition flex items-center gap-2"
            onClick={handleSaveEdit}
            disabled={isSaving || editMessage.trim() === currentMessage || editMessage.trim().length === 0}
          >
            {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
            Lưu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-scale-up">
      <p className={`${baseStyle} whitespace-pre-wrap break-words`}>
        {parseMessageMentions(contentToRender)}
        {isLong && !isExpanded && (
          <button 
            onClick={() => setIsExpanded(true)}
            className="ml-2 text-gray-400 hover:text-white font-bold hover:underline"
          >
            Xem thêm
          </button>
        )}
      </p>

      {type === 'news' && (
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm">
            <span>📰</span>
            <span>Tin tức</span>
          </span>
        </div>
      )}
    </div>
  );
}
