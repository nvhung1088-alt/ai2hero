'use client';

import React from 'react';
import { X, Play, Loader2 } from 'lucide-react';

export interface UploadItem {
  id: string;
  url: string; // Object URL hoặc R2 URL
  type: 'image' | 'video';
  file: File;
  progress: number; // 0 - 100
  uploadedUrl?: string; // R2 URL sau khi upload thành công
  thumbnailUrl?: string; // R2/Canvas URL cho video
  error?: string;
}

interface ImageUploadGridProps {
  items: UploadItem[];
  onRemove: (id: string) => void;
}

export function ImageUploadGrid({ items, onRemove }: ImageUploadGridProps) {
  if (items.length === 0) return null;

  const count = items.length;

  // Quyết định số cột của grid dựa trên số lượng ảnh
  let gridClass = 'grid-cols-1';
  if (count === 2) gridClass = 'grid-cols-2';
  else if (count >= 3) gridClass = 'grid-cols-2 sm:grid-cols-3';

  return (
    <div className={`grid gap-2 rounded-xl overflow-hidden border border-white/5 bg-black/20 p-2 ${gridClass}`}>
      {items.map((item) => {
        const isUploading = item.progress < 100 && !item.error;
        const isVideo = item.type === 'video';

        return (
          <div
            key={item.id}
            className={`relative aspect-video rounded-lg overflow-hidden border border-white/5 bg-gray-950 flex items-center justify-center group/item ${
              count === 1 ? 'max-h-[360px] w-full aspect-auto' : ''
            }`}
          >
            {/* Image / Video thumbnail preview */}
            {isVideo ? (
              <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-blue-900/40 to-teal-900/40">
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="Video Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <Play className="h-8 w-8 text-white/50" />
                )}
                <span className="absolute bottom-2 left-2 text-[9px] font-black uppercase tracking-wider bg-black/55 text-white px-1.5 py-0.5 rounded border border-white/10">
                  Video
                </span>
              </div>
            ) : (
              <img
                src={item.url}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            )}

            {/* Overlay loading/upload progress */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 text-pink-500 animate-spin" />
                <span className="text-[10px] text-white/60 font-semibold">{item.progress}%</span>
              </div>
            )}

            {/* Error display */}
            {item.error && (
              <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center p-3 text-center border border-red-500/50 rounded-lg">
                <span className="text-xs text-red-400 font-bold">Lỗi tải lên</span>
                <span className="text-[9px] text-red-300/80 mt-1 line-clamp-2">{item.error}</span>
              </div>
            )}

            {/* Delete button */}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white/70 hover:text-white border border-white/10 hover:bg-black/90 transition-all opacity-0 group-hover/item:opacity-100 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}