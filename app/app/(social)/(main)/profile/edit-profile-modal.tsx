'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { updateSocialProfileAction } from '@/lib/db/social-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    name?: string | null;
    bio: string | null;
    location: string | null;
    birthday: string | null;
    website: string | null;
    relationship: string | null;
    visibility: string;
  };
  onSuccess?: () => void;
}

const RELATIONSHIP_OPTIONS = [
  { value: '', label: 'Chưa xác định' },
  { value: 'single', label: 'Độc thân' },
  { value: 'in_relationship', label: 'Đang hẹn hò' },
  { value: 'engaged', label: 'Đã đính hôn' },
  { value: 'married', label: 'Đã kết hôn' },
  { value: 'complicated', label: 'Mối quan hệ phức tạp' },
  { value: 'separated', label: 'Ly thân' },
  { value: 'divorced', label: 'Đã ly hôn' },
  { value: 'widowed', label: 'Góa phụ/Góa phu' }
];

export function EditProfileModal({ isOpen, onClose, profile, onSuccess }: EditProfileModalProps) {
  const [name, setName] = useState(profile.name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location || '');
  const [birthday, setBirthday] = useState(profile.birthday || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [relationship, setRelationship] = useState(profile.relationship || '');
  const [visibility, setVisibility] = useState(profile.visibility || 'public');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError('');

    try {
      const result = await updateSocialProfileAction({
        name,
        bio,
        location,
        birthday,
        website,
        relationship,
        visibility
      });

      if (result.error) {
        setError(result.error);
        showToast(result.error, 'error');
      } else {
        showToast('Cập nhật hồ sơ thành công!', 'success');
        if (onSuccess) onSuccess();
        onClose();
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống');
      showToast(err.message || 'Lỗi hệ thống', 'error');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#161618] border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-2xl flex flex-col text-white shadow-2xl relative overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-center p-4 border-b border-white/10 shrink-0">
          <h3 className="text-xl font-bold">Chỉnh sửa trang cá nhân</h3>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Ảnh đại diện & Bìa (Notice) */}
            <div className="border-b border-white/10 pb-6">
              <h4 className="text-lg font-bold mb-2">Ảnh hồ sơ</h4>
              <p className="text-sm text-white/50 bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-2">
                <span className="text-xl">📸</span> Để thay đổi Ảnh đại diện hoặc Ảnh bìa, vui lòng đóng hộp thoại này và bấm trực tiếp vào biểu tượng Camera trên trang cá nhân của bạn.
              </p>
            </div>

            {/* Khối Cơ bản */}
            <div className="border-b border-white/10 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold">Thông tin cơ bản</h4>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60 font-medium">Họ tên hiển thị</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập họ tên của bạn..."
                  className="w-full bg-transparent border border-white/10 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500/50 focus:bg-white/5 transition-all"
                />
              </div>
            </div>

            {/* Khối Tiểu sử */}
            <div className="border-b border-white/10 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold">Tiểu sử</h4>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60 font-medium">Giới thiệu ngắn về bản thân</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Mô tả bản thân..."
                  rows={3}
                  className="w-full bg-transparent border border-white/10 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500/50 focus:bg-white/5 resize-none transition-all"
                />
                <p className="text-[10px] text-white/40 text-right mt-1">Còn lại {101 - bio.length} ký tự (Khuyên dùng)</p>
              </div>
            </div>

            {/* Khối Chi tiết */}
            <div className="border-b border-white/10 pb-6 space-y-4">
              <h4 className="text-lg font-bold mb-2">Tùy chỉnh chi tiết</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-white/60 font-medium">Nơi sống hiện tại</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="VD: Hà Nội, Việt Nam"
                    className="w-full bg-transparent border border-white/10 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500/50 focus:bg-white/5 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/60 font-medium">Ngày sinh</label>
                  <input
                    type="text"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    placeholder="VD: 01/01/1990"
                    className="w-full bg-transparent border border-white/10 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500/50 focus:bg-white/5 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1 mt-4">
                <label className="text-xs text-white/60 font-medium">Mối quan hệ</label>
                <div className="relative">
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full appearance-none bg-transparent border border-white/10 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500/50 focus:bg-white/5 transition-all"
                  >
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#161618] text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-white/40">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Khối Liên kết */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold mb-2">Liên kết</h4>
              <div className="space-y-1">
                <label className="text-xs text-white/60 font-medium">Trang web</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full bg-transparent border border-white/10 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-pink-500/50 focus:bg-white/5 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/10 p-4 bg-[#161618] shrink-0 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="edit-profile-form"
            disabled={pending}
            className="py-2.5 px-8 bg-pink-500 hover:bg-pink-600 disabled:bg-white/5 disabled:text-white/20 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer shadow-lg shadow-pink-500/20"
          >
            {pending ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>

      </div>
    </div>
  );
}