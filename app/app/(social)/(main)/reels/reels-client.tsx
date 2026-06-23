"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ReelPlayer } from './reel-player';

interface ReelsClientProps {
  currentUser: any;
  initialReels: any[];
}

export function ReelsClient({ currentUser, initialReels }: ReelsClientProps) {
  const [reels, setReels] = useState(initialReels);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus vào container để có thể dùng phím mũi tên lên/xuống ngay lập tức nếu cần
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-[#08080c] overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-hide flex flex-col items-center outline-none"
      tabIndex={0}
    >
      {reels.map((reel, index) => (
        <div 
          key={reel.id} 
          className="w-full h-full shrink-0 flex items-center justify-center snap-center snap-always pb-4 pt-4 md:pt-6 md:pb-6"
        >
          {/* Reel Container */}
          <div className="relative h-full w-full max-w-[450px] md:rounded-2xl overflow-hidden bg-black shadow-2xl flex items-center justify-center">
            <ReelPlayer reel={reel} currentUser={currentUser} />
          </div>
        </div>
      ))}
    </div>
  );
}
