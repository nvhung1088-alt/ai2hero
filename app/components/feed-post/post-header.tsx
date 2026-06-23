'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock, Globe, MoreHorizontal, Bookmark, EyeOff, Edit2, Trash2, MapPin, Users, Crown, ShieldAlert } from 'lucide-react';
import { type RoleKey } from '@/lib/shared-constants';

interface PostHeaderProps {
  postId: number;
  userAvatar: string;
  userName: string;
  userRole: string;
  timestamp: string;
  feeling?: string;
  location?: string;
  taggedUsers?: string[];
  pinned?: boolean;
  pinnedBy?: string;
  teamName?: string;
  teamAvatar?: string;
  canPin?: boolean;
  onPinToggle?: () => void;
  onAction?: (actionType: 'edit' | 'delete' | 'save' | 'hide' | 'crosspost') => void;
  page?: { id: number; name: string; avatar?: string | null };
  group?: { id: number; name: string; coverUrl?: string | null };
}

export default function PostHeader({
  postId, userAvatar, userName, userRole, timestamp, 
  feeling, location, taggedUsers,
  pinned, pinnedBy, teamName, teamAvatar, 
  canPin, onPinToggle, onAction, page, group
}: PostHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + `/dashboard/home#post-${postId}`);
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast('Đã sao chép liên kết bài viết!', 'success');
    }
    setIsMenuOpen(false);
  };

  const handleAction = (type: 'edit' | 'delete' | 'save' | 'hide' | 'crosspost') => {
    if (onAction) onAction(type);
    setIsMenuOpen(false);
  };

  // Construct meta text: "is feeling happy with A and B at X"
  const renderMetaText = () => {
    if (!feeling && !location && (!taggedUsers || taggedUsers.length === 0)) return null;
    
    return (
      <span className="text-gray-400 font-normal">
        {feeling && <span> đang cảm thấy <span className="font-bold text-gray-300">{feeling}</span></span>}
        {taggedUsers && taggedUsers.length > 0 && (
          <span>
            {feeling ? ' cùng với ' : ' đang ở cùng '}
            <span className="font-bold text-gray-300 hover:underline cursor-pointer">{taggedUsers[0]}</span>
            {taggedUsers.length > 1 && (
              <span> và <span className="font-bold text-gray-300 hover:underline cursor-pointer">{taggedUsers.length - 1} người khác</span></span>
            )}
          </span>
        )}
        {location && (
          <span> tại <span className="font-bold text-gray-300 hover:underline cursor-pointer">{location}</span></span>
        )}
      </span>
    );
  };

  return (
    <>
      {pinned && (
        <div className="flex items-center gap-1.5 text-xs text-orange-400 font-extrabold bg-orange-500/5 border border-orange-500/10 px-3.5 py-2 rounded-xl mb-4 animate-scale-up">
          <span>📌 Bài viết được ghim</span>
          <span className="text-gray-600">•</span>
          <span className="text-gray-400 font-medium">Ghim bởi {pinnedBy || 'Quản trị viên'}</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center text-xl shadow-inner select-none shrink-0 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden">
            {page && page.avatar ? (
              <img src={page.avatar} className="w-full h-full object-cover rounded-xl" alt={page.name} />
            ) : userAvatar && (userAvatar.startsWith('http') || userAvatar.startsWith('/') || userAvatar.includes('.') || userAvatar.length > 5) ? (
              <img src={userAvatar} className="w-full h-full object-cover rounded-xl" alt={userName} />
            ) : (
              userAvatar || '👤'
            )}
          </div>
          
          <div>
            <div className="flex flex-wrap items-center gap-1.5 leading-none mb-1.5">
              {page ? (
                <>
                  <span className="font-bold text-white hover:underline cursor-pointer">{page.name}</span>
                  <span className="text-blue-400" title="Đã xác minh"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg></span>
                  {renderMetaText()}
                </>
              ) : group ? (
                <>
                  <span className="font-bold text-white hover:underline cursor-pointer">{userName}</span>
                  <span className="text-white/40 text-xs">▶</span>
                  <span className="font-bold text-white hover:underline cursor-pointer">{group.name}</span>
                  {renderMetaText()}
                </>
              ) : (
                <>
                  <span className="font-bold text-white hover:underline cursor-pointer">{userName}</span>
                  {renderMetaText()}
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                {userRole === 'owner' ? <Crown className="w-3.5 h-3.5 text-orange-400" /> : userRole === 'admin' ? <ShieldAlert className="w-3.5 h-3.5 text-blue-400" /> : null}
                {page ? `Bởi ${userName}` : userRole}
              </span>
              <span>•</span>
              <a href={`/p/${postId}`} className="flex items-center gap-1 hover:underline group">
                <Clock className="w-3 h-3 group-hover:text-white/80 transition-colors" />
                <span className="group-hover:text-white/80 transition-colors">{timestamp}</span>
              </a>
              {teamName && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60">
                    {teamName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 relative" ref={menuRef}>
          
          <button 
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-500 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-full cursor-pointer"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-60 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-20 p-1.5 animate-scale-up">
              <button
                type="button"
                onClick={() => handleAction('save')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-white/5 text-gray-200 transition-all flex items-center gap-3 cursor-pointer"
              >
                <Bookmark className="h-4 w-4" /> 
                <div>
                   <p className="font-semibold">Lưu bài viết</p>
                   <p className="text-[10px] text-gray-500">Thêm vào danh sách đã lưu</p>
                </div>
              </button>
              
              <div className="h-px bg-white/5 my-1 mx-2" />
              
              <button
                type="button"
                onClick={() => handleAction('edit')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-white/5 text-gray-200 transition-all flex items-center gap-3 cursor-pointer"
              >
                <Edit2 className="h-4 w-4" /> <span>Chỉnh sửa bài viết</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-white/5 text-gray-200 transition-all flex items-center gap-3 cursor-pointer"
              >
                <span>🔗</span> <span>Sao chép liên kết</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction('crosspost')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-white/5 text-pink-400 hover:text-pink-300 transition-all flex items-center gap-3 cursor-pointer font-medium"
              >
                <Globe className="h-4 w-4" /> <span>Đăng chéo (Crosspost)</span>
              </button>

              {canPin && onPinToggle && (
                <button
                  type="button"
                  onClick={() => {
                    onPinToggle();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-white/5 text-orange-400 hover:text-orange-300 transition-all flex items-center gap-3 cursor-pointer"
                >
                  <span>📌</span> <span>{pinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}</span>
                </button>
              )}

              <div className="h-px bg-white/5 my-1 mx-2" />

              <button
                type="button"
                onClick={() => handleAction('hide')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-white/5 text-gray-200 transition-all flex items-center gap-3 cursor-pointer"
              >
                <EyeOff className="h-4 w-4" /> 
                <div>
                   <p className="font-semibold">Ẩn bài viết</p>
                   <p className="text-[10px] text-gray-500">Ẩn bớt các bài viết tương tự</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAction('delete')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-red-500/10 text-red-400 transition-all flex items-center gap-3 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" /> <span>Chuyển vào thùng rác</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
