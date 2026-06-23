"use client";
import React, { useRef, useState, useEffect } from 'react';
import { ChevronRight, ShieldCheck, ArrowUpLeft, Truck, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MarketplaceShopeeMall() {
  const brands = [
    { id: 1, name: "L'Oréal Paris", promo: "Ưu đãi đến 50%", image: "bg-gradient-to-br from-indigo-100 to-blue-200" },
    { id: 2, name: "Unilever", promo: "Mua 1 tặng 1", image: "bg-gradient-to-br from-purple-100 to-fuchsia-200" },
    { id: 3, name: "Vaseline", promo: "Mua 1 tặng 1", image: "bg-gradient-to-br from-blue-100 to-sky-200" },
    { id: 4, name: "Coolmate", promo: "Mua 1 tặng 1", image: "bg-gradient-to-br from-slate-800 to-slate-600" },
    { id: 5, name: "Cocoon", promo: "Mua 1 tặng 1", image: "bg-gradient-to-br from-yellow-800 to-amber-700" },
    { id: 6, name: "Omo", promo: "Mua 1 được 2", image: "bg-gradient-to-br from-red-500 to-rose-600" },
    { id: 7, name: "Anessa", promo: "Mua là có quà", image: "bg-gradient-to-br from-amber-100 to-yellow-200" },
    { id: 8, name: "La Roche-Posay", promo: "MUA LÀ CÓ QUÀ", image: "bg-gradient-to-br from-cyan-100 to-blue-300" },
    { id: 9, name: "L'Oréal Paris", promo: "Ưu đãi đến 50%", image: "bg-gradient-to-br from-indigo-100 to-blue-200" },
    { id: 10, name: "Unilever", promo: "Mua 1 tặng 1", image: "bg-gradient-to-br from-purple-100 to-fuchsia-200" },
    { id: 11, name: "Vaseline", promo: "Mua 1 tặng 1", image: "bg-gradient-to-br from-blue-100 to-sky-200" },
    { id: 12, name: "Coolmate", promo: "Mua 1 tặng 1", image: "bg-gradient-to-br from-slate-800 to-slate-600" },
    { id: 13, name: "Cocoon", promo: "Mua 1 tặng 1", image: "bg-gradient-to-br from-yellow-800 to-amber-700" },
    { id: 14, name: "Omo", promo: "Mua 1 được 2", image: "bg-gradient-to-br from-red-500 to-rose-600" },
    { id: 15, name: "Anessa", promo: "Mua là có quà", image: "bg-gradient-to-br from-amber-100 to-yellow-200" },
    { id: 16, name: "La Roche-Posay", promo: "MUA LÀ CÓ QUÀ", image: "bg-gradient-to-br from-cyan-100 to-blue-300" },
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
    <div className="bg-[#1c1c24] rounded-xl overflow-hidden border border-white/5 mt-4">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 flex-wrap gap-2">
        <div className="flex items-center gap-6 flex-wrap">
          <h2 className="text-pink-500 font-bold text-lg uppercase tracking-wider flex items-center gap-2">
            THƯƠNG HIỆU LỚN
          </h2>
          <div className="hidden md:flex items-center gap-4 text-[11px] text-white/70">
            <div className="flex items-center gap-1">
              <ArrowUpLeft className="w-3.5 h-3.5 text-pink-500" />
              <span>Trả Hàng Miễn Phí 15 Ngày</span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-pink-500" />
              <span>Hàng Chính Hãng 100%</span>
            </div>
            <div className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-pink-500" />
              <span>Miễn Phí Vận Chuyển</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" className="text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 h-8 px-2 text-sm font-medium">
          Xem Tất Cả <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      
      {/* Content Layout */}
      <div className="flex flex-col md:flex-row p-4 gap-4">
        {/* Big Banner Left */}
        <div className="w-full md:w-[32%] shrink-0">
          <div className="w-full aspect-[4/5] bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl flex items-center justify-center p-6 relative overflow-hidden group cursor-pointer shadow-lg">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="text-white font-black text-4xl xl:text-5xl italic drop-shadow-xl mb-4 leading-tight">
                SĂN DEAL <br /> SIÊU HOT
              </div>
              <div className="bg-white text-pink-600 font-black px-4 py-2 rounded-full transform -rotate-3 shadow-lg border-2 border-pink-500">
                GIẢM ĐẾN 50%
              </div>
            </div>
            <div className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded transform -rotate-12 -translate-x-1 translate-y-1">
              VOUCHER<br/>ĐỘC QUYỀN
            </div>
          </div>
        </div>

        {/* Brands Grid Right */}
        <div className="flex-1 relative">
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
            className="overflow-x-auto no-scrollbar scroll-smooth h-full"
          >
            <div className="grid grid-rows-2 grid-flow-col gap-4 h-full min-h-[300px]">
              {brands.map((brand) => (
                <div key={brand.id} className="w-[120px] md:w-auto flex flex-col group/item cursor-pointer justify-between">
                  <div className={`w-full aspect-square ${brand.image} rounded-full mb-2 shadow-sm border-2 border-white/5 group-hover/item:border-pink-500 transition-all relative overflow-hidden flex items-center justify-center mx-auto max-w-[120px]`}>
                    {/* Mock Brand Logo Placeholder */}
                    <div className="text-black/30 font-black text-2xl uppercase tracking-widest">{brand.name.charAt(0)}</div>
                  </div>
                  <div className="text-pink-500 font-medium text-xs text-center line-clamp-1 w-full mt-auto">
                    {brand.promo}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
