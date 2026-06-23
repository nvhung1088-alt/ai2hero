'use client';

import React, { useEffect, useState } from 'react';
import { Clapperboard, MoreHorizontal, ChevronRight, Play, Loader2 } from 'lucide-react';
import { getSuggestedReelsAction } from '@/lib/db/social-reels-actions';

export function SuggestedReelsBox() {
  const [reels, setReels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReels = async () => {
      try {
        const res = await getSuggestedReelsAction(5);
        if (res.data) {
          setReels(res.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải Reels', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReels();
  }, []);

  if (!isLoading && reels.length === 0) return null;

  return (
    <div className="bg-[#161618] rounded-2xl border border-white/5 overflow-hidden mb-4 animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-gray-300" />
          <h3 className="font-semibold text-[17px] text-white">Reels</h3>
        </div>
        <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors cursor-pointer">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* List */}
      <div className="px-4 pb-4 pt-2 relative min-h-[300px]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
             <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x [&::-webkit-scrollbar]:hidden">
              {reels.map((reel) => (
                <div key={reel.id} className="relative flex-none w-[160px] sm:w-[180px] h-[280px] sm:h-[320px] bg-[#18191A] rounded-xl overflow-hidden flex flex-col snap-start group cursor-pointer border border-white/5">
                  {/* Background Video/Image */}
                  <div className="absolute inset-0 z-0 bg-black">
                    {reel.url.match(/\.(mp4|webm|ogg)$/i) ? (
                       <video 
                         src={reel.url} 
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                         muted
                         loop
                         playsInline
                         onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                         onMouseOut={(e) => {
                           const v = e.target as HTMLVideoElement;
                           v.pause();
                           v.currentTime = 0;
                         }}
                       />
                    ) : (
                      <img 
                        src={reel.image || '/placeholder-video.jpg'} 
                        alt={reel.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                      />
                    )}
                  </div>

                  {/* Lớp phủ mờ (Gradient) */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 z-10 pointer-events-none" />

                  {/* Lượt xem (Góc trái dưới) */}
                  <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1">
                    <Play className="w-4 h-4 text-white fill-white" />
                    <span className="text-white text-[13px] font-semibold drop-shadow-md">{reel.views}</span>
                  </div>

                  {/* Tuỳ chọn (Góc phải trên) */}
                  <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>

                  {/* Title hiển thị giữa / dưới cùng */}
                  <div className="absolute bottom-10 left-3 right-3 z-20">
                    <h4 className="text-white text-sm font-bold leading-snug drop-shadow-lg line-clamp-3">
                      {reel.title}
                    </h4>
                  </div>
                  
                  {/* Người đăng */}
                  <div className="absolute top-2 left-2 flex items-center gap-2 z-20">
                     <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20">
                       <img src={reel.userAvatar || '/placeholder-user.jpg'} alt="" className="w-full h-full object-cover" />
                     </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Nút cuộn phải */}
            {reels.length > 3 && (
              <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 w-12 h-12 rounded-full bg-[#3E4042] hover:bg-[#4E5052] flex items-center justify-center text-white shadow-xl z-20 hidden sm:flex border border-white/10 cursor-pointer pointer-events-none">
                <ChevronRight className="w-7 h-7" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
