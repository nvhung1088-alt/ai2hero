'use client';

import { useState, useRef } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { ReactionPicker } from '@/app/(social)/(main)/reaction-picker';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface PostFooterProps {
  isLiked: boolean;
  myReactionType?: string | null;
  likesCount: number;
  reactionsSummary?: Record<string, number>;
  commentsCount: number;
  onLikeToggle: (reactionType?: string) => void;
  onCommentsToggle: () => void;
  onShare: () => void;
  onShareToFeed?: () => void;
}

export default function PostFooter({
  isLiked, myReactionType, likesCount, reactionsSummary, commentsCount,
  onLikeToggle, onCommentsToggle, onShare, onShareToFeed
}: PostFooterProps) {
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

  const handleReactionSelect = (type: string) => {
    onLikeToggle(type);
    setShowReactionPicker(false);
  };

  const handleLikeToggle = () => {
    if (isLiked) {
      onLikeToggle(); // Toggle off
    } else {
      onLikeToggle('like');
    }
  };

  return (
    <div className="border-t border-white/5 pt-3.5 flex items-center justify-between text-xs text-gray-400 font-bold">
      <div className="flex items-center gap-3">
        <div 
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button 
            onClick={handleLikeToggle}
            className={`flex items-center gap-1.5 hover:text-pink-400 active:scale-95 transition-all cursor-pointer group ${isLiked ? 'text-pink-500' : ''}`}
          >
            <span className="text-base select-none">
              {myReactionType === 'like' && '👍'}
              {myReactionType === 'love' && '❤️'}
              {myReactionType === 'haha' && '😆'}
              {myReactionType === 'wow' && '😮'}
              {myReactionType === 'sad' && '😢'}
              {myReactionType === 'angry' && '😡'}
              {!myReactionType && <Heart className={`h-4 w-4 transition-all ${isLiked ? 'fill-pink-500 stroke-pink-500 scale-110' : 'group-hover:scale-110'}`} />}
            </span>
            <span>
              {myReactionType === 'like' && 'Thích'}
              {myReactionType === 'love' && 'Yêu thích'}
              {myReactionType === 'haha' && 'Haha'}
              {myReactionType === 'wow' && 'Wow'}
              {myReactionType === 'sad' && 'Buồn'}
              {myReactionType === 'angry' && 'Phẫn nộ'}
              {!myReactionType && 'Thích'}
            </span>
          </button>

          {showReactionPicker && (
            <ReactionPicker
              onReact={handleReactionSelect}
              onClose={() => setShowReactionPicker(false)}
            />
          )}
        </div>

        {likesCount > 0 && (
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
            <span className="flex items-center -space-x-1 select-none">
              {Object.entries(reactionsSummary || {}).slice(0, 3).map(([type]) => {
                if (type === 'like') return <span key={type}>👍</span>;
                if (type === 'love') return <span key={type}>❤️</span>;
                if (type === 'haha') return <span key={type}>😆</span>;
                if (type === 'wow') return <span key={type}>😮</span>;
                if (type === 'sad') return <span key={type}>😢</span>;
                if (type === 'angry') return <span key={type}>😡</span>;
                return null;
              })}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">{likesCount}</span>
          </div>
        )}

        <button 
          onClick={onCommentsToggle}
          className="flex items-center gap-1.5 hover:text-orange-400 active:scale-95 transition-all cursor-pointer"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{commentsCount} Bình luận</span>
        </button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 hover:text-white active:scale-95 transition-all cursor-pointer outline-none">
            <Share2 className="h-4 w-4" />
            <span>Chia sẻ</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-[#18191A] border-white/10 text-white w-48">
          <DropdownMenuItem onClick={onShare} className="cursor-pointer hover:bg-white/5">
            Sao chép liên kết
          </DropdownMenuItem>
          {onShareToFeed && (
            <DropdownMenuItem onClick={onShareToFeed} className="cursor-pointer hover:bg-white/5">
              Chia sẻ lên Bảng tin của tôi
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
