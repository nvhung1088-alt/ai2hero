"use client";
import React, { useRef, useState, useEffect } from 'react';
import { 
  Zap, 
  Store, 
  Ticket, 
  Smartphone, 
  Globe, 
  Coins, 
  CreditCard, 
  Gift,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export function MarketplaceQuickLinks() {
  const links = [
    { icon: Zap, label: 'Khung Giờ\nSăn Sale', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { icon: Store, label: 'Shopee\nMall', color: 'text-red-500', bg: 'bg-red-500/10' },
    { icon: Ticket, label: 'Mã\nGiảm Giá', color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { icon: Smartphone, label: 'Nạp Thẻ &\nDịch Vụ', color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { icon: Globe, label: 'Hàng\nQuốc Tế', color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { icon: Coins, label: 'Bắt Trend\n- Giá Sốc', color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { icon: CreditCard, label: 'Thanh Toán\nTiện Lợi', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { icon: Gift, label: 'Quà Tặng\nMiễn Phí', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
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
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative">
      {showLeft && (
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-[40%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md transition-all duration-300 hover:scale-125"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {showRight && (
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-[40%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md transition-all duration-300 hover:scale-125"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="w-full overflow-x-auto no-scrollbar scroll-smooth pb-4"
      >
        <div className="flex items-start justify-between min-w-max gap-4 px-2">
          {links.map((link, idx) => {
            const Icon = link.icon;
            return (
              <div 
                key={idx} 
                className="flex flex-col items-center gap-3 cursor-pointer group w-[100px]"
              >
                <div className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center ${link.bg} border border-white/5 group-hover:-translate-y-1 group-hover:scale-105 transition-all duration-300 shadow-lg`}>
                  <Icon className={`w-6 h-6 ${link.color}`} />
                </div>
                <span className="text-xs text-center text-white/80 group-hover:text-white transition-colors whitespace-pre-line font-medium leading-tight">
                  {link.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
