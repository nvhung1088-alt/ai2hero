"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Heart, MessageCircle, Share2, MoreHorizontal, Bookmark, Music } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface ReelPlayerProps {
  reel: any;
  currentUser: any;
}

export function ReelPlayer({ reel, currentUser }: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(reel.isLiked);
  const [likesCount, setLikesCount] = useState(reel.likesCount);

  // Intersection Observer to play/pause video when scrolling
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.6, // Phát khi 60% video nằm trong màn hình
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (videoRef.current) {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          }
        } else {
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }
      });
    }, options);

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div 
      className="relative w-full h-full group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={togglePlay}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl}
        loop
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Play/Pause Overlay Icon (Center) */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${!isPlaying ? 'opacity-100 bg-black/20' : (isHovered ? 'opacity-100' : 'opacity-0')}`}>
        <div className="bg-black/40 text-white rounded-full p-4 backdrop-blur-sm border border-white/10">
          {isPlaying ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
        </div>
      </div>

      {/* Bottom Info Overlay (Left Side) */}
      <div className="absolute bottom-0 left-0 w-[85%] p-4 pb-6 flex flex-col gap-3 text-white pointer-events-none bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Avatar className="h-10 w-10 border border-white/20 cursor-pointer">
            <AvatarImage src={reel.creator.avatarUrl} />
            <AvatarFallback>{reel.creator.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[15px] cursor-pointer hover:underline">{reel.creator.name}</span>
            <span className="text-white/60 text-xs">•</span>
            <button onClick={(e) => {
              e.stopPropagation();
              if (!currentUser) {
                if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
              }
            }} className="text-blue-400 font-semibold text-[14px] hover:text-white transition-colors">Theo dõi</button>
          </div>
        </div>
        <p className="text-sm font-normal line-clamp-2 pr-4">{reel.caption}</p>
        <div className="flex items-center gap-2 text-[13px] bg-white/10 w-max px-3 py-1.5 rounded-full backdrop-blur-md pointer-events-auto cursor-pointer hover:bg-white/20 transition-colors">
          <Music className="h-3.5 w-3.5" />
          <span className="max-w-[150px] truncate">{reel.musicInfo}</span>
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="absolute bottom-6 right-4 flex flex-col items-center gap-5 z-10">
        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={handleLike}
            className="h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all transform hover:scale-110 active:scale-95"
          >
            <Heart className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
          <span className="text-white text-xs font-semibold drop-shadow-md">{formatNumber(likesCount)}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (!currentUser) {
                if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
              }
            }}
            className="h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all transform hover:scale-110"
          >
            <MessageCircle className="h-6 w-6 fill-current" />
          </button>
          <span className="text-white text-xs font-semibold drop-shadow-md">{formatNumber(reel.commentsCount)}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={(e) => e.stopPropagation()}
            className="h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all transform hover:scale-110"
          >
            <Share2 className="h-6 w-6" />
          </button>
          <span className="text-white text-xs font-semibold drop-shadow-md">{formatNumber(reel.sharesCount)}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={(e) => e.stopPropagation()}
            className="h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all transform hover:scale-110"
          >
            <MoreHorizontal className="h-6 w-6" />
          </button>
        </div>
        
        {/* Audio disc thumbnail (Bottom Right) */}
        <div className="mt-2 h-10 w-10 rounded-xl overflow-hidden border-2 border-white/20 animate-[spin_4s_linear_infinite] cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <img src={reel.creator.avatarUrl} className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}
