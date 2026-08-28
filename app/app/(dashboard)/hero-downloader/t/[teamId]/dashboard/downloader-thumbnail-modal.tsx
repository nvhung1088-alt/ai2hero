'use client';

import { useState } from 'react';
import { Eye, ExternalLink, Image as ImageIcon, Sparkles, Download, Check, AlertCircle } from 'lucide-react';

interface ThumbnailModalProps {
  video: any | null;
  onClose: () => void;
}

export function DownloaderThumbnailModal({
  video,
  onClose,
}: ThumbnailModalProps) {
  const [hasError, setHasError] = useState(false);
  const [showTranslated, setShowTranslated] = useState(Boolean(video?.translatedThumbnailUrl));
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | 'offline' | null>(null);

  if (!video) return null;

  const currentThumb = showTranslated && video.translatedThumbnailUrl 
    ? video.translatedThumbnailUrl 
    : video.thumbnailUrl;

  const handleSaveToLocal = async () => {
    if (!video.localPath || !currentThumb) return;
    setIsSavingLocal(true);
    setSaveStatus(null);
    try {
      const res = await fetch('http://127.0.0.1:19998/update_thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localPath: video.localPath,
          thumbnailData: currentThumb
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      setSaveStatus('offline');
    } finally {
      setIsSavingLocal(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
          <div className="flex items-center gap-2 text-gray-100 font-bold text-base">
            <Eye className="w-5 h-5 text-teal-400" />
            <span>Xem Ảnh bìa Thumbnail</span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Video Title & Platform info */}
        <div className="shrink-0 flex items-center justify-between gap-2">
          <p className="text-xs text-gray-300 truncate font-medium" title={video.title}>
            {video.title}
          </p>
          {video.translatedThumbnailUrl && (
            <div className="flex items-center gap-1 shrink-0 bg-white/5 p-0.5 rounded-lg border border-white/10 text-xs">
              <button
                onClick={() => { setShowTranslated(false); setHasError(false); }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${!showTranslated ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Gốc
              </button>
              <button
                onClick={() => { setShowTranslated(true); setHasError(false); }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${showTranslated ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <Sparkles className="w-3 h-3 text-teal-400" /> Đã dịch AI
              </button>
            </div>
          )}
        </div>

        {/* Thumbnail Preview Area (Responsive Aspect Ratio) */}
        <div className="flex-1 min-h-0 flex items-center justify-center bg-black/60 rounded-xl border border-white/10 overflow-hidden p-2">
          {currentThumb && !hasError ? (
            <img 
              src={currentThumb} 
              alt="Thumbnail Preview" 
              className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-md transition-all duration-200" 
              referrerPolicy="no-referrer"
              onError={() => setHasError(true)}
            />
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-gray-500 gap-2">
              <ImageIcon className="w-10 h-10 text-gray-600 opacity-40" />
              <p className="text-xs text-gray-400">
                {hasError ? 'Không thể tải ảnh bìa (Ảnh đã hết hạn hoặc bị chặn bởi CDN)' : 'Chưa có ảnh bìa'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            {video.localPath && currentThumb && !hasError && (
              <button
                onClick={handleSaveToLocal}
                disabled={isSavingLocal}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border font-medium transition-all ${
                  saveStatus === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : saveStatus === 'error'
                    ? 'bg-red-500/20 text-red-300 border-red-500/30'
                    : saveStatus === 'offline'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30'
                }`}
                title="Ghi đè file ảnh này vào thư mục máy tính"
              >
                {saveStatus === 'success' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã lưu vào máy!</span>
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>Lỗi ghi đè file</span>
                  </>
                ) : saveStatus === 'offline' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Worker chưa chạy</span>
                  </>
                ) : (
                  <>
                    <Download className={`w-3.5 h-3.5 ${isSavingLocal ? 'animate-bounce' : ''}`} />
                    <span>{isSavingLocal ? 'Đang lưu...' : 'Lưu đè vào máy tính'}</span>
                  </>
                )}
              </button>
            )}

            {currentThumb && !hasError && !currentThumb.startsWith('data:') && (
              <a
                href={currentThumb}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs border border-white/10 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở ảnh gốc</span>
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs border border-white/10 transition-colors font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
