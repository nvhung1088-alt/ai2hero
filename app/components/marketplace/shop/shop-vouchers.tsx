"use client";
import React from 'react';
import { Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ShopVouchers() {
  const vouchers = [
    { title: 'Giảm 10%', desc: 'Đơn Tối Thiểu 100k', code: 'AI2HERO10' },
    { title: 'Giảm 50K', desc: 'Đơn Tối Thiểu 300k', code: 'AI2HERO50' },
    { title: 'Freeship', desc: 'Đơn Tối Thiểu 50k', code: 'FREESHIP50' },
    { title: 'Giảm 20%', desc: 'Cho Đơn Đầu Tiên', code: 'NEWBIE20' },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <Ticket className="w-5 h-5 text-orange-400" />
        <h2 className="text-lg font-bold text-white uppercase">Mã Giảm Giá Của Shop</h2>
      </div>
      
      <div className="flex overflow-x-auto gap-4 no-scrollbar pb-2">
        {vouchers.map((v, i) => (
          <div key={i} className="flex shrink-0 w-[280px] bg-gradient-to-r from-pink-500/10 to-orange-500/10 border border-pink-500/20 rounded-xl overflow-hidden relative group">
            {/* Left part (Details) */}
            <div className="flex-1 p-4 border-r border-dashed border-pink-500/30 flex flex-col justify-center">
              <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">{v.title}</span>
              <span className="text-xs text-white/60 mt-1">{v.desc}</span>
              <div className="text-[10px] text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded inline-block w-max mt-2 border border-pink-500/20">
                Mã: {v.code}
              </div>
            </div>
            
            {/* Right part (Action) */}
            <div className="w-20 flex items-center justify-center p-2 relative bg-pink-500/5">
               {/* Semicircles cutouts */}
               <div className="absolute -top-2 -left-2 w-4 h-4 bg-[#0c0c14] rounded-full"></div>
               <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-[#0c0c14] rounded-full"></div>
               
               <Button className="w-full px-0 bg-pink-500 text-white hover:bg-pink-600 text-xs shadow-[0_0_10px_rgba(236,72,153,0.3)]">
                 Lưu
               </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
