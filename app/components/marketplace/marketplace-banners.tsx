"use client";
import React, { useState, useEffect } from 'react';

export function MarketplaceBanners() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    { title: "Siêu Sale Giữa Tháng - Giảm 50%", color: "from-pink-500/20 to-orange-500/20", bubble1: "bg-pink-500/30", bubble2: "bg-orange-500/30" },
    { title: "Hàng Hiệu Deal Độc Quyền", color: "from-blue-500/20 to-cyan-500/20", bubble1: "bg-blue-500/30", bubble2: "bg-cyan-500/30" },
    { title: "Freeship Mọi Đơn Hàng", color: "from-emerald-500/20 to-teal-500/20", bubble1: "bg-emerald-500/30", bubble2: "bg-teal-500/30" },
    { title: "Hoàn Xu Xtra - Lên Đến 500k", color: "from-purple-500/20 to-indigo-500/20", bubble1: "bg-purple-500/30", bubble2: "bg-indigo-500/30" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-3 h-[250px] md:h-[300px]">
      {/* Main Banner (3/4 width on desktop) */}
      <div className="lg:col-span-3 relative w-full h-full rounded-2xl overflow-hidden border border-white/5 group cursor-pointer">
        {slides.map((slide, index) => (
          <div 
            key={index}
            className={`absolute inset-0 bg-gradient-to-r ${slide.color} transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 z-10" />
            <div className="absolute inset-0 flex items-center justify-center z-0">
              {/* Animated placeholder shapes */}
              <div className={`w-64 h-64 ${slide.bubble1} blur-3xl rounded-full absolute -top-10 -left-10 animate-pulse`} />
              <div className={`w-64 h-64 ${slide.bubble2} blur-3xl rounded-full absolute -bottom-10 -right-10 animate-pulse delay-700`} />
              <span className="text-white font-bold text-2xl md:text-4xl text-center px-4 z-20 drop-shadow-lg">
                {slide.title}
              </span>
            </div>
          </div>
        ))}
        
        {/* Slider Dots */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
          {slides.map((_, idx) => (
            <button 
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSlide(idx);
              }}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === currentSlide ? 'bg-white' : 'bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
      </div>

      {/* Side Static Banners (1/4 width, hidden on small screens) */}
      <div className="hidden lg:flex flex-col gap-3 h-full">
        <div className="flex-1 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/5 flex items-center justify-center cursor-pointer hover:border-white/20 transition-colors">
          <span className="text-white/80 font-bold text-sm">Tech Zone - Mua là có quà</span>
        </div>
        <div className="flex-1 rounded-2xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-white/5 flex items-center justify-center cursor-pointer hover:border-white/20 transition-colors">
          <span className="text-white/80 font-bold text-sm">Freeship Xtra - Miễn phí</span>
        </div>
      </div>
    </div>
  );
}
