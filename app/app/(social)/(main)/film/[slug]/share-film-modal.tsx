'use client';

import { useState, useEffect } from 'react';
import { X, Send, Users, Globe, Flag, Loader2 } from 'lucide-react';
import { sharePostToFeedAction, getUserGroupsAndPagesAction } from '@/app/(login)/actions';
import { FilmSeries } from '@/lib/db/schema';

interface ShareFilmModalProps {
  series: FilmSeries & { feedPostId?: number | null };
  isOpen: boolean;
  onClose: () => void;
}

export function ShareFilmModal({ series, isOpen, onClose }: ShareFilmModalProps) {
  const [message, setMessage] = useState('');
  const [destination, setDestination] = useState<'profile' | 'group' | 'page'>('profile');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadDestinations = async () => {
        setLoadingDestinations(true);
        try {
          const res = await getUserGroupsAndPagesAction();
          setGroups(res.groups || []);
          setPages(res.pages || []);
        } catch (error) {
          console.error(error);
        } finally {
          setLoadingDestinations(false);
        }
      };
      loadDestinations();
      setMessage('');
      setDestination('profile');
      setSelectedGroupId(null);
      setSelectedPageId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleShare = async () => {
    if (!series.feedPostId) {
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Phim này chưa có bài đăng để chia sẻ.', 'error');
      } else {
        alert('Phim này chưa có bài đăng để chia sẻ.');
      }
      return;
    }

    if (destination === 'group' && !selectedGroupId) {
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Vui lòng chọn nhóm để chia sẻ.', 'error');
      } else {
        alert('Vui lòng chọn nhóm để chia sẻ.');
      }
      return;
    }

    if (destination === 'page' && !selectedPageId) {
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Vui lòng chọn trang để chia sẻ.', 'error');
      } else {
        alert('Vui lòng chọn trang để chia sẻ.');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sharePostToFeedAction({
        sharedPostId: series.feedPostId,
        message: message.trim(),
        groupId: destination === 'group' ? selectedGroupId : null,
        pageId: destination === 'page' ? selectedPageId : null,
      });

      if (res.error) {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(res.error, 'error');
        } else {
          alert(res.error);
        }
      } else {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(res.success || 'Đã chia sẻ thành công!', 'success');
        } else {
          alert(res.success || 'Đã chia sẻ thành công!');
        }
        onClose();
      }
    } catch (err) {
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Đã xảy ra lỗi khi chia sẻ.', 'error');
      } else {
        alert('Đã xảy ra lỗi khi chia sẻ.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-bold text-lg">Chia sẻ Phim</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          
          {/* Destination Selector */}
          <div>
            <label className="text-xs text-gray-400 font-bold mb-2 block uppercase">Chia sẻ lên</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setDestination('profile')}
                className={`p-2 rounded-xl text-xs font-medium border flex flex-col items-center gap-1 transition ${destination === 'profile' ? 'bg-pink-500/10 border-pink-500 text-pink-400' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                <Globe className="h-4 w-4" /> Bảng tin
              </button>
              <button 
                onClick={() => setDestination('group')}
                className={`p-2 rounded-xl text-xs font-medium border flex flex-col items-center gap-1 transition ${destination === 'group' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                <Users className="h-4 w-4" /> Nhóm
              </button>
              <button 
                onClick={() => setDestination('page')}
                className={`p-2 rounded-xl text-xs font-medium border flex flex-col items-center gap-1 transition ${destination === 'page' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                <Flag className="h-4 w-4" /> Trang
              </button>
            </div>
          </div>

          {/* Target Selectors */}
          {destination === 'group' && (
            <div className="animate-in slide-in-from-top-2">
              {loadingDestinations ? (
                <div className="text-xs text-gray-500 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin"/> Đang tải nhóm...</div>
              ) : groups.length === 0 ? (
                <div className="text-xs text-red-400">Bạn chưa tham gia nhóm nào.</div>
              ) : (
                <select 
                  value={selectedGroupId || ''} 
                  onChange={e => setSelectedGroupId(Number(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option value="" disabled>-- Chọn nhóm để chia sẻ --</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
            </div>
          )}

          {destination === 'page' && (
            <div className="animate-in slide-in-from-top-2">
              {loadingDestinations ? (
                <div className="text-xs text-gray-500 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin"/> Đang tải trang...</div>
              ) : pages.length === 0 ? (
                <div className="text-xs text-red-400">Bạn chưa có trang nào.</div>
              ) : (
                <select 
                  value={selectedPageId || ''} 
                  onChange={e => setSelectedPageId(Number(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-purple-500"
                >
                  <option value="" disabled>-- Chọn trang để chia sẻ --</option>
                  {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>
          )}

          {/* Message Input */}
          <div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Nói gì đó về bộ phim này..."
              className="w-full bg-black/50 border border-white/10 focus:border-pink-500 rounded-xl p-3 text-sm text-white placeholder-gray-500 outline-none resize-none h-24"
            />
          </div>

          {/* Film Preview */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3">
            <img src={series.coverUrl || '/placeholder.png'} className="w-16 h-20 object-cover rounded-lg" alt={series.title} />
            <div className="flex-1">
              <h4 className="text-white font-bold text-sm line-clamp-1">{series.title}</h4>
              <p className="text-gray-400 text-xs mt-1 line-clamp-2">{series.description}</p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition"
          >
            Hủy
          </button>
          <button 
            onClick={handleShare}
            disabled={isSubmitting || (destination === 'group' && !selectedGroupId) || (destination === 'page' && !selectedPageId)}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-pink-500 hover:bg-pink-600 text-white disabled:opacity-50 transition"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Đăng ngay
          </button>
        </div>

      </div>
    </div>
  );
}
