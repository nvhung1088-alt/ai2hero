"use client";
import React, { useRef, useState, useEffect } from 'react';
import { Shirt, Smartphone, Baby, Monitor, Watch, Book, Car, Music, Camera, Umbrella, Coffee, Scissors, PenTool, Speaker, Gamepad, Tv, Headset, Plane, Briefcase, Heart, ChevronLeft, ChevronRight } from 'lucide-react';

export function MarketplaceCategories() {
  const categories = [
    { name: 'Thời Trang Nam', icon: Shirt, color: 'text-blue-400' },
    { name: 'Điện Thoại & Phụ Kiện', icon: Smartphone, color: 'text-indigo-400' },
    { name: 'Mẹ & Bé', icon: Baby, color: 'text-pink-400' },
    { name: 'Thiết Bị Điện Tử', icon: Monitor, color: 'text-sky-400' },
    { name: 'Đồng Hồ', icon: Watch, color: 'text-slate-400' },
    { name: 'Nhà Sách Online', icon: Book, color: 'text-orange-400' },
    { name: 'Ô Tô & Xe Máy', icon: Car, color: 'text-red-400' },
    { name: 'Bách Hóa Online', icon: Coffee, color: 'text-amber-400' },
    { name: 'Máy Ảnh - Máy Quay', icon: Camera, color: 'text-zinc-400' },
    { name: 'Thời Trang Nữ', icon: Umbrella, color: 'text-rose-400' },
    { name: 'Sắc Đẹp', icon: Scissors, color: 'text-fuchsia-400' },
    { name: 'Phụ Kiện Máy Tính', icon: PenTool, color: 'text-cyan-400' },
    { name: 'Thiết Bị Âm Thanh', icon: Speaker, color: 'text-violet-400' },
    { name: 'Máy Chơi Game', icon: Gamepad, color: 'text-emerald-400' },
    { name: 'Điện Gia Dụng', icon: Tv, color: 'text-teal-400' },
    { name: 'Tai Nghe', icon: Headset, color: 'text-blue-500' },
    { name: 'Du Lịch & Phượt', icon: Plane, color: 'text-sky-500' },
    { name: 'Túi Xách Nam', icon: Briefcase, color: 'text-amber-500' },
    { name: 'Sức Khỏe', icon: Heart, color: 'text-red-500' },
    { name: 'Nhạc Cụ', icon: Music, color: 'text-purple-400' }
  ];

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeft(scrollLeft > 0);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -360 : 360;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full bg-gray-900/50 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <h2 className="text-lg font-bold text-white/90 uppercase tracking-wide">Danh Mục</h2>
      </div>

      {/* Grid Container */}
      <div className="relative w-full">
        {showLeft && (
          <button 
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md transition-all duration-300 hover:scale-125"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {showRight && (
          <button 
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md transition-all duration-300 hover:scale-125"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full overflow-x-auto no-scrollbar scroll-smooth"
        >
          <div className="grid grid-rows-2 grid-flow-col min-w-max">
            {categories.map((cat, index) => {
              const Icon = cat.icon;
              return (
                <div 
                  key={index} 
                  className="w-[120px] h-[130px] border-r border-b border-white/5 flex flex-col items-center justify-center p-3 cursor-pointer group hover:bg-white/5 transition-colors relative"
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
                    <Icon className={`w-7 h-7 ${cat.color} group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all`} />
                  </div>
                  <span className="text-xs text-center text-white/70 group-hover:text-white transition-colors line-clamp-2">
                    {cat.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
