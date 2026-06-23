"use client";
import React, { useRef, useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MarketplaceFlashSale() {
  const items = [
    { id: 1, price: '1.012.000 ₫', soldPercent: 85, image: 'bg-gradient-to-br from-pink-100 to-rose-200' },
    { id: 2, price: '50.760 ₫', soldPercent: 90, image: 'bg-gradient-to-br from-blue-100 to-cyan-200' },
    { id: 3, price: '21.000 ₫', soldPercent: 40, image: 'bg-gradient-to-br from-purple-100 to-fuchsia-200' },
    { id: 4, price: '57.884 ₫', soldPercent: 70, image: 'bg-gradient-to-br from-yellow-100 to-orange-200' },
    { id: 5, price: '159.000 ₫', soldPercent: 60, image: 'bg-gradient-to-br from-green-100 to-emerald-200' },
    { id: 6, price: '70.300 ₫', soldPercent: 95, image: 'bg-gradient-to-br from-indigo-100 to-violet-200' },
    { id: 7, price: '1.012.000 ₫', soldPercent: 85, image: 'bg-gradient-to-br from-pink-100 to-rose-200' },
    { id: 8, price: '50.760 ₫', soldPercent: 90, image: 'bg-gradient-to-br from-blue-100 to-cyan-200' },
    { id: 9, price: '21.000 ₫', soldPercent: 40, image: 'bg-gradient-to-br from-purple-100 to-fuchsia-200' },
    { id: 10, price: '57.884 ₫', soldPercent: 70, image: 'bg-gradient-to-br from-yellow-100 to-orange-200' },
    { id: 11, price: '159.000 ₫', soldPercent: 60, image: 'bg-gradient-to-br from-green-100 to-emerald-200' },
    { id: 12, price: '70.300 ₫', soldPercent: 95, image: 'bg-gradient-to-br from-indigo-100 to-violet-200' },
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
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#1c1c24] rounded-xl overflow-hidden border border-white/5">
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center text-pink-500 font-black text-xl italic">
            <Zap className="w-6 h-6 mr-1" fill="currentColor" />
            FLASH SALE
          </div>
          <div className="flex items-center gap-1 text-white font-bold">
            <span className="bg-black text-white px-2 rounded-md text-sm">02</span>
            <span>:</span>
            <span className="bg-black text-white px-2 rounded-md text-sm">28</span>
            <span>:</span>
            <span className="bg-black text-white px-2 rounded-md text-sm">00</span>
          </div>
        </div>
        <Button variant="ghost" className="text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 h-8 px-2 text-sm">
          Xem tất cả <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      <div className="relative">
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
          className="p-4 overflow-x-auto no-scrollbar scroll-smooth"
        >
          <div className="flex gap-4 min-w-max">
            {items.map((item) => (
              <div key={item.id} className="w-[160px] flex flex-col gap-2 group/item cursor-pointer">
                <div className={`w-full aspect-square ${item.image} rounded-lg relative overflow-hidden border border-white/5`}>
                   <div className="absolute top-0 right-0 bg-pink-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-bl-lg">
                     -45%
                   </div>
                </div>
                <div className="text-center text-pink-500 font-semibold text-lg">
                  {item.price}
                </div>
                <div className="relative w-full h-4 bg-pink-500/20 rounded-full overflow-hidden flex items-center justify-center">
                  <div 
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-pink-500 to-orange-500"
                    style={{ width: `${item.soldPercent}%` }}
                  />
                  <span className="relative z-10 text-[10px] font-bold text-white uppercase shadow-sm">
                    Đang bán chạy
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

