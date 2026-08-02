'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, MoreHorizontal } from 'lucide-react';

interface Story {
  id: number;
  imageUrl?: string | null;
  textContent?: string | null;
  bgClass?: string | null;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    avatar?: string | null;
  };
}

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: Story[];
  initialStoryIndex: number;
  currentUser: any;
}

export function StoryViewerModal({ isOpen, onClose, stories, initialStoryIndex, currentUser }: StoryViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const STORY_DURATION = 5000; // 5 seconds per story
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialStoryIndex);
      setProgress(0);
      setIsPaused(false);
    }
  }, [isOpen, initialStoryIndex]);

  useEffect(() => {
    if (!isOpen || isPaused) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const updateInterval = 50; // Update progress every 50ms
    const step = (updateInterval / STORY_DURATION) * 100;

    progressIntervalRef.current = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      setProgress((prev) => {
        if (prev + step >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, updateInterval);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isOpen, currentIndex, isPaused, stories.length]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose(); // Đóng nếu hết tin
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  if (!isOpen || stories.length === 0) return null;

  const currentStory = stories[currentIndex];

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Vừa xong';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} phút`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} ngày`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} tháng`;
    
    return `${Math.floor(diffInMonths / 12)} năm`;
  };

  const timeAgo = getTimeAgo(currentStory.createdAt);

  return (
    <div className="fixed inset-0 z-[100] flex bg-black">
      {/* Logo và nút tắt */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-[#3E4042] hover:bg-[#4E5052] flex items-center justify-center text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <span className="text-white font-bold text-xl tracking-tight hidden sm:block">Ai2Hero</span>
      </div>

      {/* Cột chính giữa (Viewer) */}
      <div className="flex-1 flex items-center justify-center relative h-full">
        
        {/* Nút Prev */}
        {currentIndex > 0 && (
          <button 
            onClick={handlePrev}
            className="absolute left-4 sm:left-auto sm:right-[calc(50%+220px)] w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white backdrop-blur-sm z-50 transition-colors"
          >
            <ChevronLeft className="w-8 h-8 mr-1" />
          </button>
        )}

        {/* Khung Story */}
        <div className="relative w-full max-w-[400px] h-full sm:h-[90vh] sm:max-h-[850px] sm:rounded-xl overflow-hidden bg-[#242526] shadow-2xl flex flex-col group">
          
          {/* Lớp hiển thị ảnh / nền */}
          <div 
            className="absolute inset-0 z-0 flex items-center justify-center select-none"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {currentStory.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={currentStory.imageUrl} 
                alt="Story" 
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className={`w-full h-full ${currentStory.bgClass || 'bg-gray-800'} flex items-center justify-center p-8`}>
                <span className="text-white font-bold text-2xl md:text-3xl text-center whitespace-pre-wrap break-words leading-relaxed">
                  {currentStory.textContent}
                </span>
              </div>
            )}
            {/* Dark gradient overlay for header readability */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
            {/* Dark gradient overlay for footer readability */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </div>

          {/* Header (Progress bars + User Info) */}
          <div className="absolute top-0 left-0 right-0 p-3 z-10 flex flex-col gap-3 pointer-events-none">
            {/* Progress bars */}
            <div className="flex gap-1">
              {stories.map((_, idx) => (
                <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                  <div 
                    className="h-full bg-white transition-all duration-75 ease-linear"
                    style={{ 
                      width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                    }}
                  />
                </div>
              ))}
            </div>

            {/* User info */}
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden border border-white/20">
                  {currentStory.user?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentStory.user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-500 text-white font-bold text-sm">
                      {currentStory.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-semibold text-[15px] leading-tight drop-shadow-md flex items-center gap-1">
                    {currentStory.user?.name || 'Người dùng'}
                  </span>
                  <span className="text-white/80 text-xs font-medium drop-shadow-md">
                    {timeAgo}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-white">
                <button 
                  onClick={() => setIsPaused(!isPaused)} 
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  {isPaused ? <Play className="w-5 h-5 drop-shadow-md" /> : <Pause className="w-5 h-5 drop-shadow-md" />}
                </button>
                <button className="p-1 hover:bg-white/20 rounded-full transition-colors">
                  <Volume2 className="w-5 h-5 drop-shadow-md" />
                </button>
                <button className="p-1 hover:bg-white/20 rounded-full transition-colors">
                  <MoreHorizontal className="w-5 h-5 drop-shadow-md" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer (Reply input) */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10 flex items-center gap-3">
            <input 
              type="text" 
              placeholder="Trả lời tin..." 
              className="flex-1 bg-transparent border border-white/40 text-white placeholder-white/80 rounded-full py-2.5 px-4 outline-none focus:border-white focus:bg-white/10 transition-all backdrop-blur-sm shadow-sm"
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
            />
            <button className="text-2xl hover:scale-110 transition-transform">❤️</button>
            <button className="text-2xl hover:scale-110 transition-transform">😆</button>
            <button className="text-2xl hover:scale-110 transition-transform">😢</button>
          </div>
        </div>

        {/* Nút Next */}
        {currentIndex < stories.length - 1 && (
          <button 
            onClick={handleNext}
            className="absolute right-4 sm:right-auto sm:left-[calc(50%+220px)] w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white backdrop-blur-sm z-50 transition-colors"
          >
            <ChevronRight className="w-8 h-8 ml-1" />
          </button>
        )}

      </div>
    </div>
  );
}
