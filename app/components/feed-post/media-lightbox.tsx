'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, PlaySquare } from 'lucide-react';
import { type FeedAttachment } from '@/lib/shared-constants';

interface MediaLightboxProps {
  attachments: FeedAttachment[];
  initialIndex: number;
  onClose: () => void;
}

export default function MediaLightbox({ attachments, initialIndex, onClose }: MediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);
  
  const currentMedia = attachments[currentIndex];
  
  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    document.addEventListener('keydown', handleKeyDown);
    // Prevent scrolling when lightbox is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [currentIndex, onClose]);
  
  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : attachments.length - 1));
  };
  
  const handleNext = () => {
    setCurrentIndex(prev => (prev < attachments.length - 1 ? prev + 1 : 0));
  };

  if (!mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10 cursor-pointer"
      >
        <X className="h-6 w-6" />
      </button>

      {attachments.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10 cursor-pointer"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10 cursor-pointer"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      <div 
        className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center justify-center p-4 cursor-default relative"
        onClick={(e) => e.stopPropagation()}
      >
        {currentMedia.type === 'image' && currentMedia.url && (
          <img 
            src={currentMedia.url} 
            alt={currentMedia.caption || 'Media'} 
            className="max-h-[85vh] max-w-full object-contain rounded-lg animate-scale-up"
          />
        )}
        
        {currentMedia.type === 'video' && currentMedia.url && (
          <video 
            src={currentMedia.url} 
            controls 
            autoPlay 
            className="max-h-[85vh] max-w-full object-contain rounded-lg animate-scale-up"
          />
        )}
        
        {currentMedia.caption && (
          <div className="mt-4 text-center">
            <p className="text-white text-lg font-medium">{currentMedia.caption}</p>
          </div>
        )}

        <div className="mt-4 text-white/50 text-sm font-semibold">
          {currentIndex + 1} / {attachments.length}
        </div>
      </div>
    </div>,
    document.body
  );
}
