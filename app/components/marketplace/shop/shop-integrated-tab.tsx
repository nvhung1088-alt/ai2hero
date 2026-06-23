"use client";
import React, { useState } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { ShopVouchers } from '@/components/marketplace/shop/shop-vouchers';
import { MarketplaceProductCard } from '@/components/marketplace/marketplace-product-card';
import { type MarketplaceShop, type MarketplaceProduct } from '@/lib/db/schema';

interface ShopIntegratedTabProps {
  shop?: MarketplaceShop | null;
  products?: MarketplaceProduct[];
}

export function ShopIntegratedTab({ shop, products = [] }: ShopIntegratedTabProps) {
  const [activeFilter, setActiveFilter] = useState('Phổ Biến');
  const filters = ['Phổ Biến', 'Mới Nhất', 'Bán Chạy'];

  return (
    <div className="flex flex-col gap-8 bg-[#161618] border border-white/5 rounded-2xl p-6">
      <ShopVouchers />

      {/* Hero Banner */}
      <div className="w-full h-[200px] md:h-[260px] rounded-2xl bg-gradient-to-r from-indigo-950 via-purple-900 to-pink-900 overflow-hidden relative group shadow-lg border border-white/5 flex items-center p-6 md:p-10">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] z-0"></div>
        {shop?.coverUrl && (
          <img 
            src={shop.coverUrl} 
            alt={shop.name} 
            className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 group-hover:scale-105 transition-transform duration-700" 
          />
        )}
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 w-full">
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-white/5 border-2 border-pink-500/50 flex items-center justify-center overflow-hidden shrink-0 shadow-xl shadow-pink-500/10">
            {shop?.avatarUrl ? (
              <img src={shop.avatarUrl} alt={shop.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl md:text-4xl font-black text-white bg-gradient-to-br from-pink-500 to-purple-600 w-full h-full flex items-center justify-center">
                {shop?.name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col text-center md:text-left gap-1 md:gap-2">
            <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
              {shop?.name || "Cửa Hàng"}
            </h2>
            <p className="text-white/70 text-sm max-w-xl line-clamp-2">
              {shop?.description || "Chào mừng bạn đến với cửa hàng của chúng tôi trên AI2Hero Marketplace!"}
            </p>
          </div>
        </div>
      </div>

      {/* Featured Products */}
      {products.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Sản Phẩm Nổi Bật</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.slice(0, 5).map((product) => (
              <MarketplaceProductCard product={product} key={product.id} />
            ))}
          </div>
        </div>
      )}

      {/* All Products Section */}
      <div className="pt-8 border-t border-white/5 mt-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tất cả sản phẩm</h2>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#1a1a1f] border border-white/5 rounded-xl p-2 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-sm text-white/40 mr-2 flex items-center gap-1 shrink-0 px-2">
              <Filter className="w-4 h-4" /> Sắp xếp theo
            </span>
            {filters.map(f => (
              <button 
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-all shrink-0 ${activeFilter === f ? 'bg-pink-500 text-white font-medium shadow-[0_0_10px_rgba(236,72,153,0.3)]' : 'bg-white/5 text-white/80 hover:bg-white/10'}`}
              >
                {f}
              </button>
            ))}
            <button className="px-4 py-2 bg-white/5 text-white/80 hover:bg-white/10 text-sm rounded-lg flex items-center gap-2 shrink-0">
              Giá <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.length > 0 ? (
            products.map((product) => (
              <MarketplaceProductCard product={product} key={product.id} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-white/40 bg-white/5 border border-white/5 rounded-2xl">
              Cửa hàng chưa có sản phẩm nào.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

