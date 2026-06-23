import React from 'react';
import { Store, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { type MarketplaceShop } from '@/lib/db/schema';

interface ProductShopSnippetProps {
  shop?: MarketplaceShop | null;
}

export function ProductShopSnippet({ shop }: ProductShopSnippetProps) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      {/* Shop Info & Buttons */}
      <div className="flex items-center justify-between md:justify-start gap-4 border-b md:border-b-0 md:border-r border-white/5 pb-4 md:pb-0 md:pr-6 w-full md:w-auto shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center relative shadow-lg shadow-pink-500/20 overflow-hidden shrink-0">
            {shop?.avatarUrl ? (
              <img src={shop.avatarUrl} alt={shop.name} className="w-full h-full object-cover" />
            ) : (
              <Store className="w-8 h-8 text-white" />
            )}
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-[#161618] rounded-full z-10"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg">{shop?.name || "Cửa hàng"}</span>
            <span className="text-xs text-white/40 mt-0.5">Online 5 phút trước</span>
            <div className="flex gap-2 mt-2">
              <Button size="sm" className="h-8 bg-pink-500/10 border border-pink-500/50 text-pink-400 hover:bg-pink-500/20 text-xs px-3">
                <MessageSquare className="w-3 h-3 mr-1.5" />
                Chat Ngay
              </Button>
              <Link href={shop ? `/profile/${shop.userId}?tab=shop` : '#'}>
                <Button size="sm" variant="outline" className="h-8 border-white/10 text-white hover:bg-white/10 hover:text-white text-xs px-3">
                  <Store className="w-3 h-3 mr-1.5" />
                  Xem Shop
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Shop Stats */}
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm w-full">
        <div className="flex flex-col gap-1">
          <span className="text-white/40">Đánh giá</span>
          <span className="text-pink-400 font-bold text-base">142,5k</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-white/40">Tỉ lệ phản hồi</span>
          <span className="text-pink-400 font-bold text-base">98%</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-white/40">Sản phẩm</span>
          <span className="text-pink-400 font-bold text-base">1,245</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-white/40">Người theo dõi</span>
          <span className="text-pink-400 font-bold text-base">345,1k</span>
        </div>
      </div>
    </div>
  );
}

