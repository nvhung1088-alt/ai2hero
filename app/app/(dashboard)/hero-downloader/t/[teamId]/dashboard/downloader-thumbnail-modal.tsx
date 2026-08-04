'use client';

import { Eye } from 'lucide-react';

interface ThumbnailModalProps {
  video: any | null;
  onClose: () => void;
}

export function DownloaderThumbnailModal({
  video,
  onClose,
}: ThumbnailModalProps) {
  if (!video) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-gray-100 font-bold text-base">
            <Eye className="w-5 h-5 text-purple-400" />
            <span>Xem Ảnh bìa Thumbnail</span>
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

        <div className="pt-2">
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
              Không có ảnh bìa
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end pt-4 border-t border-white/10">
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
