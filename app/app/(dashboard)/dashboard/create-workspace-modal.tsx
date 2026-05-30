'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Sparkles } from 'lucide-react';
import { createWorkspaceAction } from '@/app/(login)/actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

const EMOJIS = ['💼', '🚀', '⚡', '🤖', '🎮', '🎨', '🦁', '🌟', '🧁', '🎯', '🔥', '🧬'];

export function CreateWorkspaceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('💼');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setPending(true);
    setError('');

    try {
      const res = await createWorkspaceAction({ name, avatar });
      if (res.error) {
        setError(res.error);
      } else {
        setName('');
        setIsOpen(false);
        showToast('Đã tạo không gian làm việc thành công!', 'success');
        router.refresh();
      }
    } catch (err) {
      setError('Đã xảy ra lỗi không xác định.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="group border-2 border-dashed border-white/10 hover:border-orange-500/20 bg-transparent rounded-2xl p-6 flex flex-col justify-center items-center gap-3 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/2 w-full text-left"
      >
        <div className="h-10 w-10 rounded-full bg-white/5 group-hover:bg-orange-500/10 flex items-center justify-center transition-all">
          <Plus className="h-5 w-5 text-gray-500 group-hover:text-orange-400 transition-colors" />
        </div>
        <div className="text-center">
          <p className="font-extrabold text-white text-sm group-hover:text-orange-400 transition-colors">
            Tạo không gian mới
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
            Thiết lập một nhóm làm việc riêng biệt và quản lý nhanh.
          </p>
        </div>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="relative w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" />
                  <span>Workspace mới</span>
                </div>
                <h3 className="text-lg font-bold text-white">Tạo không gian làm việc</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tên không gian</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: AI2Hero Marketing, Dev Team..."
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Emoji Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Biểu tượng đại diện</label>
                <div className="grid grid-cols-6 gap-2">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`h-10 text-xl flex items-center justify-center rounded-xl border transition-all ${
                        avatar === emoji 
                          ? 'bg-orange-500/20 border-orange-500 text-white scale-110 shadow-lg shadow-orange-500/10' 
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={pending || !name.trim()}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20"
                >
                  {pending ? 'Đang tạo...' : 'Tạo không gian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
