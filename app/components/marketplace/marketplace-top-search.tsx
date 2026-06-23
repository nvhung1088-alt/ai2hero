"use client";
import React, { useRef, useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MarketplaceTopSearch() {
  const items = [
    { id: 1, name: "Nước Tẩy Trang L'Oreal Paris 3 In 1", sales: '177k+', image: 'bg-gradient-to-br from-cyan-100 to-blue-200' },
    { id: 2, name: "Giấy Vệ Sinh Cuộn", sales: '171k+', image: 'bg-gradient-to-br from-amber-100 to-orange-200' },
    { id: 3, name: "Mi Giả 3D Cao Cấp", sales: '148k+', image: 'bg-gradient-to-br from-stone-100 to-neutral-200' },
    { id: 4, name: "Sữa Rửa Mặt Cerave", sales: '139k+', image: 'bg-gradient-to-br from-emerald-100 to-teal-200' },
    { id: 5, name: "Quạt Mini Cầm Tay", sales: '133k+', image: 'bg-gradient-to-br from-lime-100 to-green-200' },
    { id: 6, name: "Quần Lót Nữ Cotton", sales: '119k+', image: 'bg-gradient-to-br from-rose-100 to-pink-200' },
    { id: 7, name: "Nước Tẩy Trang L'Oreal Paris 3 In 1", sales: '177k+', image: 'bg-gradient-to-br from-cyan-100 to-blue-200' },
    { id: 8, name: "Giấy Vệ Sinh Cuộn", sales: '171k+', image: 'bg-gradient-to-br from-amber-100 to-orange-200' },
    { id: 9, name: "Mi Giả 3D Cao Cấp", sales: '148k+', image: 'bg-gradient-to-br from-stone-100 to-neutral-200' },
    { id: 10, name: "Sữa Rửa Mặt Cerave", sales: '139k+', image: 'bg-gradient-to-br from-emerald-100 to-teal-200' },
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
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <h2 className="text-pink-500 font-bold text-lg uppercase tracking-tight">Tìm Kiếm Hàng Đầu</h2>
        <Button variant="ghost" className="text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 h-8 px-2 text-sm">
          Xem Tất Cả <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      <div className="relative">
        {showLeft && (
          <button 
            onClick={() => scroll('left')}
            className="absolute left-2 top-[40%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md transition-all duration-300 hover:scale-125"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {showRight && (
          <button 
            onClick={() => scroll('right')}
            className="absolute right-2 top-[40%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md transition-all duration-300 hover:scale-125"
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
              <div key={item.id} className="w-[180px] flex flex-col group/item cursor-pointer">
                <div className={`w-full aspect-square ${item.image} relative overflow-hidden rounded-t-lg border border-white/5`}>
                  <div className="absolute top-0 left-0 bg-pink-500 text-white font-bold text-[10px] px-1.5 py-1 rounded-br-lg shadow-md z-10 flex flex-col items-center leading-tight">
                    <span>TOP</span>
                  </div>
                  {/* Sales Bar absolute positioned at bottom of image */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm text-white text-center text-[11px] py-1.5 font-medium">
                    Bán {item.sales} / tháng
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-b-lg border border-t-0 border-white/5 group-hover/item:bg-white/10 transition-colors h-[72px]">
                  <p className="text-sm text-white/90 line-clamp-2 leading-tight">
                    {item.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
