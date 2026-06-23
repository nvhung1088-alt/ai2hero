'use client';

import { useState } from 'react';
import { updateSocialProfileAction } from '@/lib/db/social-actions';
import { Shield, Lock, Globe, Users, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

export function SettingsClient({ user, profile, defaultTeamId }: { user: any, profile: any, defaultTeamId?: number }) {
  const router = useRouter();
  const [name, setName] = useState(user.name || '');
  const [visibility, setVisibility] = useState(profile.visibility || 'public');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await updateSocialProfileAction({
        name,
        visibility
      });
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast('Đã lưu cài đặt thành công', 'success');
        router.refresh();
      }
    } catch (e: any) {
      showToast('Lỗi lưu cài đặt', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-black text-white">Cài đặt</h1>
        <p className="text-white/60 mt-2">Quản lý cài đặt tài khoản và quyền riêng tư của bạn trên hệ thống iSocial.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          {/* Menu Sidebar (Visual) */}
          <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
            <button className="flex items-center gap-3 p-3 rounded-xl bg-pink-500 text-white font-bold text-sm shadow-lg shadow-pink-500/20 text-left">
              <Shield className="h-5 w-5" /> Cài đặt chung & Quyền riêng tư
            </button>
            <button className="flex items-center gap-3 p-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white font-semibold text-sm transition-colors text-left" onClick={() => showToast('Tính năng sắp ra mắt', 'info')}>
              <Lock className="h-5 w-5" /> Đổi mật khẩu / Bảo mật
            </button>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* General Settings */}
          <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-white/5 pb-4 mb-4">Cài đặt chung</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Họ tên hiển thị</label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="bg-white/5 border-white/10 text-white text-base py-6 rounded-xl"
                  placeholder="Nhập tên của bạn"
                />
                <p className="text-xs text-white/40 flex items-center gap-1.5 mt-1">
                  <Info className="h-3 w-3" /> Tên này sẽ hiển thị trên trang cá nhân và các bài viết của bạn.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Email (Không thể thay đổi)</label>
                <Input 
                  value={user.email} 
                  disabled
                  className="bg-white/5 border-white/5 text-white/40 text-base py-6 rounded-xl opacity-70 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white border-b border-white/5 pb-4 mb-4">Quyền riêng tư hồ sơ</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Ai có thể xem trang cá nhân của bạn?</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Public */}
                  <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${visibility === 'public' ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                    <input type="radio" name="visibility" value="public" className="hidden" checked={visibility === 'public'} onChange={() => setVisibility('public')} />
                    <Globe className={`h-6 w-6 mb-2 ${visibility === 'public' ? 'text-pink-500' : 'text-white/60'}`} />
                    <span className={`text-sm font-bold ${visibility === 'public' ? 'text-pink-500' : 'text-white/80'}`}>Công khai</span>
                  </label>

                  {/* Friends */}
                  <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${visibility === 'friends' ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                    <input type="radio" name="visibility" value="friends" className="hidden" checked={visibility === 'friends'} onChange={() => setVisibility('friends')} />
                    <Users className={`h-6 w-6 mb-2 ${visibility === 'friends' ? 'text-pink-500' : 'text-white/60'}`} />
                    <span className={`text-sm font-bold ${visibility === 'friends' ? 'text-pink-500' : 'text-white/80'}`}>Chỉ bạn bè</span>
                  </label>

                  {/* Private */}
                  <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${visibility === 'private' ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                    <input type="radio" name="visibility" value="private" className="hidden" checked={visibility === 'private'} onChange={() => setVisibility('private')} />
                    <Lock className={`h-6 w-6 mb-2 ${visibility === 'private' ? 'text-pink-500' : 'text-white/60'}`} />
                    <span className={`text-sm font-bold ${visibility === 'private' ? 'text-pink-500' : 'text-white/80'}`}>Chỉ mình tôi</span>
                  </label>
                </div>
                <p className="text-xs text-white/40 mt-2">
                  Lưu ý: Ngay cả khi bạn để "Chỉ mình tôi", ảnh đại diện và tên của bạn vẫn luôn hiển thị với mọi người.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button 
              onClick={handleUpdate} 
              disabled={loading}
              className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-6 px-10 rounded-xl text-base shadow-lg shadow-pink-500/20"
            >
              {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
