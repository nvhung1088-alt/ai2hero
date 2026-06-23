'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Edit3, MessageSquare, Loader2, Megaphone, Settings, MoreHorizontal, ThumbsUp, UserCheck, UserPlus } from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { Button } from '@/components/ui/button';
import { updatePageAction, toggleFollowPageAction } from '@/lib/db/social-page-actions';

interface PageHeaderProps {
  currentUser: any;
  pageData: any;
  isAdmin: boolean;
  isFollowing: boolean;
}

export function PageHeader({
  currentUser,
  pageData,
  isAdmin,
  isFollowing,
}: PageHeaderProps) {
  const router = useRouter();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const initial = (pageData.name || '?').charAt(0).toUpperCase();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentUser) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }

    if (type === 'avatar') setUploadingAvatar(true);
    else setUploadingCover(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        await updatePageAction(pageData.id, { 
          ...(type === 'avatar' ? { avatarUrl: base64 } : { coverUrl: base64 }) 
        });
        window.location.reload();
      } catch (err: any) {
        showToast(err.message || 'Lỗi tải ảnh', 'error');
        if (type === 'avatar') setUploadingAvatar(false);
        else setUploadingCover(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFollow = async () => {
    if (!currentUser) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    setFollowLoading(true);
    await toggleFollowPageAction(pageData.id);
    window.location.reload();
  };

  return (
    <div className="bg-[#161618] rounded-2xl border border-white/5 overflow-hidden shadow-xl text-white">
      {/* Cover Image */}
      <div className="h-64 sm:h-[350px] w-full bg-white/5 relative group/cover">
        {pageData.coverUrl && (
          <img src={pageData.coverUrl} className="w-full h-full object-cover" alt="Cover" />
        )}
        {isAdmin && (
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white/90 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all opacity-0 group-hover/cover:opacity-100 cursor-pointer z-20 pointer-events-auto"
          >
            {uploadingCover ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            Thay đổi ảnh bìa
          </button>
        )}
        <input
          type="file"
          ref={coverInputRef}
          onChange={(e) => handleFileChange(e, 'cover')}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Profile Info Details */}
      <div className="px-6 pb-6 relative flex flex-col md:flex-row items-end justify-between gap-6 -mt-16 md:-mt-20">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-4 text-center md:text-left w-full md:w-auto">
          {/* Avatar Container */}
          <div className="relative group/avatar">
            <div className="h-28 w-28 md:h-32 md:w-32 rounded-full border-4 border-[#161618] overflow-hidden bg-gray-900 shrink-0 shadow-2xl relative flex items-center justify-center font-bold text-white text-3xl">
              {pageData.avatarUrl ? (
                <img src={pageData.avatarUrl} className="w-full h-full object-cover" alt={pageData.name} />
              ) : (
                initial
              )}
            </div>
            {isAdmin && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover/avatar:opacity-100 transition-all cursor-pointer text-white border-4 border-transparent z-20 pointer-events-auto"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Camera className="h-5 w-5" />
                )}
              </button>
            )}
            <input
              type="file"
              ref={avatarInputRef}
              onChange={(e) => handleFileChange(e, 'avatar')}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="mb-2">
            <h1 className="text-xl md:text-2xl font-black text-white">{pageData.name}</h1>
            <p className="text-xs text-white/45 mt-1">@{pageData.username}</p>
            <div className="flex flex-col md:flex-row md:items-center gap-3 mt-3">
              <div className="text-xs text-white/60 font-semibold text-center md:text-left">
                <span>{pageData.followersCount?.toLocaleString()} người theo dõi</span>
                <span className="text-white/45 ml-1.5">• {pageData.category || 'Khác'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 shrink-0 w-full md:w-auto justify-center md:justify-end">
          {isAdmin ? (
            <>
              <Button
                onClick={() => showToast('Tính năng đang phát triển', 'success')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl px-4 py-2 h-auto"
              >
                <Megaphone className="h-3.5 w-3.5 mr-1.5" /> Quảng cáo
              </Button>
              <Button
                onClick={() => router.push(`/pages/${pageData.id}/admin`)}
                className="bg-white/5 border border-white/10 text-white hover:bg-white/10 font-semibold text-xs rounded-xl px-4 py-2 h-auto"
              >
                <Settings className="h-3.5 w-3.5 mr-1.5" /> Quản lý
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleFollow}
                disabled={followLoading}
                className={isFollowing 
                  ? "bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl px-4 py-2 h-auto" 
                  : "bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl px-4 py-2 h-auto"}
              >
                {followLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : (isFollowing ? <UserCheck className="h-3.5 w-3.5 mr-1.5" /> : <UserPlus className="h-3.5 w-3.5 mr-1.5" />)} 
                {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
              </Button>
              <Button
                onClick={() => {
                  router.push(`/messages?pageId=${pageData.id}`);
                }}
                className="bg-white/5 border border-white/10 text-white hover:bg-white/10 font-semibold text-xs rounded-xl px-4 py-2 h-auto"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Nhắn tin
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
