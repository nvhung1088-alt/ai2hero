'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Edit3, MessageSquare, Loader2, Plus } from 'lucide-react';
import { updateAvatarAction, updateCoverAction } from '@/lib/db/social-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { EditProfileModal } from './edit-profile-modal';
import { Button } from '@/components/ui/button';
import { SuggestedFriendsBox } from '@/components/suggested-friends-box';

interface ProfileHeaderProps {
  currentUser: any; // user hiện tại đang login
  targetUser: any; // user chủ của profile
  isOwnProfile: boolean;
  friendsCount: number;
  mutualFriendsCount: number;
  mutualFriendsAvatars?: any[];
}

export function ProfileHeader({
  currentUser,
  targetUser,
  isOwnProfile,
  friendsCount,
  mutualFriendsCount,
  mutualFriendsAvatars = []
}: ProfileHeaderProps) {
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size client-side
    const maxMB = type === 'avatar' ? 5 : 10;
    if (file.size > maxMB * 1024 * 1024) {
      showToast(`Dung lượng ảnh vượt quá giới hạn cho phép là ${maxMB}MB`, 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    if (type === 'avatar') setUploadingAvatar(true);
    else setUploadingCover(true);

    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || uploadData.error) {
        showToast(uploadData.error || 'Tải ảnh lên thất bại', 'error');
        return;
      }

      const fileUrl = uploadData.url;

      if (type === 'avatar') {
        const updateRes = await updateAvatarAction(fileUrl);
        if (updateRes.error) {
          showToast(updateRes.error, 'error');
        } else {
          showToast('Cập nhật ảnh đại diện thành công!', 'success');
          router.refresh();
        }
      } else {
        const updateRes = await updateCoverAction(fileUrl);
        if (updateRes.error) {
          showToast(updateRes.error, 'error');
        } else {
          showToast('Cập nhật ảnh bìa thành công!', 'success');
          router.refresh();
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Đã xảy ra lỗi hệ thống', 'error');
    } finally {
      if (type === 'avatar') setUploadingAvatar(false);
      else setUploadingCover(false);
    }
  };

  const targetProfile = targetUser.profile || {};
  const initial = (targetUser.name || targetUser.email || '?').charAt(0).toUpperCase();

  return (
    <div className="bg-[#161618] rounded-2xl border border-white/5 overflow-hidden shadow-xl text-white">
      {/* Cover Image */}
      <div className="h-64 sm:h-[350px] w-full bg-white/5 relative group/cover">
        {targetProfile.coverUrl && (
          <img src={targetProfile.coverUrl} className="w-full h-full object-cover" alt="Cover" />
        )}
        {isOwnProfile && (
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
              {targetUser.avatarUrl ? (
                <img src={targetUser.avatarUrl} className="w-full h-full object-cover" alt={targetUser.name} />
              ) : (
                initial
              )}
            </div>
            {isOwnProfile && (
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
            <h1 className="text-xl md:text-2xl font-black text-white">{targetUser.name || 'Người dùng AI2Hero'}</h1>
            <p className="text-xs text-white/45 mt-1">{targetUser.email}</p>
            <div className="flex flex-col md:flex-row md:items-center gap-3 mt-3">
              <div className="text-xs text-white/60 font-semibold text-center md:text-left">
                <span>{friendsCount} bạn bè</span>
                {!isOwnProfile && mutualFriendsCount > 0 && (
                  <span className="text-white/45 ml-1.5">• {mutualFriendsCount} bạn chung</span>
                )}
              </div>
              {mutualFriendsAvatars && mutualFriendsAvatars.length > 0 && (
                <div className="flex -space-x-1.5 overflow-hidden justify-center md:justify-start">
                  {mutualFriendsAvatars.map((friend: any) => (
                    <div
                      key={friend.id}
                      className="inline-block h-5 w-5 rounded-full ring-2 ring-[#161618] bg-gray-950 overflow-hidden shrink-0"
                      title={friend.name}
                    >
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} className="h-full w-full object-cover" alt={friend.name} />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[8px] font-bold bg-gradient-to-br from-pink-500 to-rose-600 text-white">
                          {friend.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 shrink-0 w-full md:w-auto justify-center md:justify-end">
          {isOwnProfile ? (
            <>
              <Button
                onClick={() => showToast('Tính năng đăng tin (Story) đang được phát triển và sẽ sớm ra mắt!', 'success')}
                className="bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs rounded-xl px-4 py-2"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Thêm vào tin
              </Button>
              <Button
                onClick={() => setIsEditModalOpen(true)}
                className="bg-white/5 border border-white/10 text-white hover:bg-white/10 font-semibold text-xs rounded-xl px-4 py-2"
              >
                <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Chỉnh sửa hồ sơ
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                if (!currentUser) {
                  window.dispatchEvent(new Event('open-auth-modal'));
                  return;
                }
                router.push(`/messages?userId=${targetUser.id}`);
              }}
              className="bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs rounded-xl px-4 py-2"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Nhắn tin
            </Button>
          )}
        </div>
      </div>



      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={{ ...targetProfile, name: targetUser.name }}
        />
      )}
    </div>
  );
}