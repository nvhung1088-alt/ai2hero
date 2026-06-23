'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface MediaItem {
  id?: number;
  url: string;
  type: string; // image | video_upload | video_external
}

interface PhotoGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaItem[];
  initialIndex: number;
}

export function PhotoGallery({ isOpen, onClose, media, initialIndex }: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Lọc chỉ lấy các file hình ảnh để hiển thị trong slide show
  const images = media.filter(m => m.type === 'image' || m.type === 'image_upload' || !m.type.startsWith('video'));

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, media]);

  // Lắng nghe sự kiện bàn phím (Mũi tên trái/phải để chuyển ảnh, ESC để đóng)
  useEffect(() => {
    if (!isOpen) return;

    // Khóa cuộn trang bên dưới
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && images.length > 1) {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }
      if (e.key === 'ArrowLeft' && images.length > 1) {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, images, onClose]);

  if (!isOpen || images.length === 0) return null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const currentImage = images[currentIndex];
  if (!currentImage) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Image container & navigation arrows */}
      <div className="relative w-full max-w-5xl aspect-auto max-h-[80vh] flex items-center justify-center p-4">
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 z-50 p-3 rounded-full bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <img
          src={currentImage.url}
          alt={`Photo ${currentIndex + 1}`}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-[80vh] object-contain rounded-lg select-none shadow-2xl animate-in zoom-in-95 duration-200"
        />

        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 z-50 p-3 rounded-full bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Index indicator */}
      {images.length > 1 && (
        <div className="mt-4 text-xs font-semibold text-white/40 tracking-wider">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}