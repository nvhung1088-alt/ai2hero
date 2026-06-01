'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, Film, Loader2 } from 'lucide-react';
import { useFileSystem } from './file-system-context';

interface VideoCardProps {
  file: File;
  onDeleteSuccess: () => void;
}

export function VideoCard({ file, onDeleteSuccess }: VideoCardProps) {
  const { deleteVideoFile } = useFileSystem();
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setLocalUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + ' MB';
  };

  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn video "${file.name}" khỏi máy tính không?`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const success = await deleteVideoFile(file.name);
      if (success) {
        onDeleteSuccess();
      } else {
        alert('Lỗi: Không thể xóa file này.');
        setIsDeleting(false);
      }
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
      alert('Lỗi hệ thống khi xóa.');
    }
  };

  return (
    <div className="group relative flex flex-col bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 hover:border-pink-500/50 rounded-xl overflow-hidden transition-all duration-300 shadow-xl shadow-black/40">
      <div className="relative aspect-[9/16] bg-zinc-950/80 w-full overflow-hidden flex flex-col items-center justify-center">
        {localUrl ? (
          <video
            ref={videoRef}
            src={localUrl}
            controls
            className="w-full h-full object-cover"
            preload="metadata"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
             <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-zinc-200 line-clamp-2 leading-tight" title={file.name}>
          {file.name}
        </h3>
        
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>{new Date(file.lastModified).toLocaleString('vi-VN')}</span>
          <span>{formatSize(file.size)}</span>
        </div>
      </div>

      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-rose-500/90 text-zinc-400 hover:text-white rounded-lg backdrop-blur-md transition-all z-20"
        title="Xóa Video này"
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
