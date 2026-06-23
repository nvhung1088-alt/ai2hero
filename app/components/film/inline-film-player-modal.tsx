'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import HeroFilmWatchClient from '@/app/(social)/(main)/film/[slug]/watch-client';
import { getViewerSeriesDetailAction } from '@/lib/db/film-actions';
import { Loader2, AlertCircle } from 'lucide-react';
import { parseFilmUrl } from '@/lib/utils/film-url';

interface InlineFilmPlayerModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  userId?: number;
  isAdmin?: boolean;
  feedPostId?: number;
}

export function InlineFilmPlayerModal({ slug, isOpen, onClose, userId, isAdmin = false, feedPostId }: InlineFilmPlayerModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let storedOriginalUrl = '';
    
    if (isOpen && slug) {
      if (typeof window !== 'undefined') {
        storedOriginalUrl = window.location.pathname + window.location.search + window.location.hash;
      }
      
      setLoading(true);
      setError(null);
      
      const { slug: cleanSlug, ep } = parseFilmUrl(slug);
      
      getViewerSeriesDetailAction(cleanSlug, userId)
        .then((res) => {
          if (res && res.series && res.episodes && res.episodes.length > 0) {
            setData({
              ...res,
              series: {
                ...res.series,
                feedPostId: res.series.feedPostId || feedPostId
              },
              initialEpisodeNumber: ep || 1
            });
          } else {
            setError('Không tìm thấy phim hoặc phim chưa có tập nào.');
          }
        })
        .catch(() => setError('Có lỗi xảy ra khi tải phim.'))
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
    
    // Cleanup: Khôi phục lại URL ban đầu khi tắt modal
    return () => {
      if (storedOriginalUrl && typeof window !== 'undefined') {
        window.history.replaceState(null, '', storedOriginalUrl);
      }
    };
  }, [isOpen, slug, userId, feedPostId]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 m-0 transition-all">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer" onClick={onClose} onMouseDown={onClose} />
        {loading && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a]">
            <Loader2 className="h-10 w-10 text-pink-500 animate-spin mb-4" />
            <p className="text-white/60 text-sm font-medium">Đang chuẩn bị phim...</p>
          </div>
        )}
        
        {!loading && error && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a]">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4 opacity-80" />
            <p className="text-white/90 mb-6 font-medium">{error}</p>
            <button onClick={onClose} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all active:scale-95 border border-white/10 shadow-xl">
              Đóng trang xem
            </button>
          </div>
        )}
        
        {!loading && !error && data && (
          <div className="relative w-full max-w-[480px] h-[90vh] bg-black rounded-3xl overflow-hidden shadow-2xl z-10">
            <div className="w-full h-full overflow-y-auto no-scrollbar relative">
              <HeroFilmWatchClient
                series={data.series}
                episodes={data.episodes}
                initialEpisodeNumber={data.initialEpisodeNumber}
                initialBookmarked={data.isBookmarked || false}
                initialLiked={data.isLiked || false}
                userId={userId}
                isAdmin={isAdmin}
                isPopup={true}
                onClosePopup={onClose}
              />
            </div>
          </div>
        )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
