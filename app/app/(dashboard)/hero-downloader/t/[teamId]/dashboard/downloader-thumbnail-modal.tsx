'use client';

import { Eye, Sparkles, Languages } from 'lucide-react';

interface ThumbnailModalProps {
  video: any | null;
  onClose: () => void;
  onTranslate: (videoId: number) => void;
  isTranslating: boolean;
  hasAiConnection: boolean;
  selectedLang: string;
}

export function DownloaderThumbnailModal({
  video,
  onClose,
  onTranslate,
  isTranslating,
  hasAiConnection,
  selectedLang
}: ThumbnailModalProps) {
  if (!video) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 max-w-3xl w-full shadow-2xl space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-gray-100 font-bold text-base">
            <Eye className="w-5 h-5 text-purple-400" />
            <span>Xem & So sánh Ảnh bìa Thumbnail</span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-400 truncate" title={video.title}>
          {video.title}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Ảnh bìa gốc */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 uppercase font-semibold">Ảnh bìa gốc (Trung Quốc)</span>
            </div>
            {video.thumbnailUrl ? (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black/50 aspect-video flex items-center justify-center">
                <img 
                  src={video.thumbnailUrl} 
                  alt="Thumbnail Gốc" 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="aspect-video bg-white/5 rounded-xl flex items-center justify-center text-gray-600 text-xs">
                Không có ảnh bìa gốc
              </div>
            )}
          </div>

          {/* Ảnh bìa đã dịch */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-teal-400 uppercase font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Ảnh bìa đã dịch ({selectedLang})
              </span>
            </div>
            {video.translatedThumbnailUrl ? (
              <div className="rounded-xl overflow-hidden border border-teal-500/40 bg-black/50 aspect-video flex items-center justify-center">
                <img 
                  src={video.translatedThumbnailUrl} 
                  alt="Thumbnail Đã Dịch" 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="aspect-video bg-white/5 rounded-xl flex items-center justify-center text-gray-500 text-xs flex-col gap-2 border border-dashed border-white/10">
                <Languages className="w-6 h-6 text-gray-600" />
                <span>Chưa thực hiện Dịch Thumbnail</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          {video.thumbnailUrl && (
            <button
              onClick={() => {
                onTranslate(video.id);
                onClose();
              }}
              disabled={isTranslating || !hasAiConnection}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all flex items-center gap-2 disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4" />
              <span>{video.translatedThumbnailUrl ? 'Dịch & Redesign Lại' : 'Dịch & Redesign Ngay'}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs border border-white/10 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
