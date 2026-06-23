import React from 'react';
import { Star, ThumbsUp } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function ProductReviews() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#1a1a1f] px-4 py-3 rounded-xl inline-block">
        <h2 className="text-lg font-bold text-white uppercase tracking-wide">Đánh giá sản phẩm</h2>
      </div>
      
      {/* Summary Box */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 flex flex-col md:flex-row gap-6 md:items-center shadow-inner">
        <div className="flex flex-col items-center justify-center shrink-0 md:w-32">
          <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">
            4.9<span className="text-xl text-white/40 font-normal">/5</span>
          </div>
          <div className="flex text-pink-500 mt-2">
             {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-current drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]" />)}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 flex-1">
          <button className="px-4 py-2 border border-pink-500 bg-pink-500/10 text-pink-400 text-sm rounded-lg font-medium shadow-[0_0_10px_rgba(236,72,153,0.1)]">Tất cả</button>
          <button className="px-4 py-2 border border-white/10 hover:border-white/30 text-white/80 text-sm rounded-lg bg-white/5 transition-colors">5 Sao (1.1k)</button>
          <button className="px-4 py-2 border border-white/10 hover:border-white/30 text-white/80 text-sm rounded-lg bg-white/5 transition-colors">4 Sao (85)</button>
          <button className="px-4 py-2 border border-white/10 hover:border-white/30 text-white/80 text-sm rounded-lg bg-white/5 transition-colors">Có Hình Ảnh (450)</button>
          <button className="px-4 py-2 border border-white/10 hover:border-white/30 text-white/80 text-sm rounded-lg bg-white/5 transition-colors">Có Bình Luận (890)</button>
        </div>
      </div>

      {/* Review List */}
      <div className="flex flex-col gap-6 mt-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex gap-4 border-b border-white/5 pb-6">
            <Avatar className="w-10 h-10 border border-white/10 shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-orange-500 text-white font-bold text-xs">U{item}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white/90">nguyenvana_{item}</span>
                <span className="text-xs text-white/40">12/05/2026 14:30</span>
              </div>
              <div className="flex text-pink-500">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
              </div>
              <div className="text-xs text-white/40 font-medium">Phân loại hàng: Màu Đen</div>
              <p className="text-sm text-white/80 mt-1 leading-relaxed">
                Giao hàng nhanh, đóng gói cẩn thận. Tai nghe nghe rất ấm, bass đập căng đét. Chống ồn khá tốt trong tầm giá này. Vote 5 sao cho shop nhé!
              </p>
              {/* Review Images */}
              <div className="flex gap-2 mt-2">
                 <div className="w-20 h-20 bg-white/5 hover:bg-white/10 transition-colors rounded-xl border border-white/10 flex items-center justify-center text-xs text-white/30 cursor-pointer">Ảnh {item}</div>
              </div>
              {/* Action */}
              <div className="flex items-center gap-4 mt-3">
                <button className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-pink-400 transition-colors">
                  <ThumbsUp className="w-4 h-4" /> Hữu ích (12)
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
