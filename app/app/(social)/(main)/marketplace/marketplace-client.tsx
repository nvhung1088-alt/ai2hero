"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { MarketplaceHeader } from '@/components/marketplace/marketplace-header';
import { MarketplaceBanners } from '@/components/marketplace/marketplace-banners';
import { MarketplaceQuickLinks } from '@/components/marketplace/marketplace-quick-links';
import { MarketplaceCategories } from '@/components/marketplace/marketplace-categories';
import { MarketplaceFlashSale } from '@/components/marketplace/marketplace-flash-sale';
import { MarketplaceTopSearch } from '@/components/marketplace/marketplace-top-search';
import { MarketplaceShopeeMall } from '@/components/marketplace/marketplace-shopee-mall';
import { MarketplaceProductCard } from '@/components/marketplace/marketplace-product-card';

interface MarketplaceClientProps {
  currentUser: any;
  initialProducts: any[];
}

export function MarketplaceClient({ currentUser, initialProducts }: MarketplaceClientProps) {
  const [visibleItems, setVisibleItems] = useState(50);
  const products = initialProducts || [];

  return (
    <div className="flex flex-col w-full h-full pb-20">
      <div className="w-full px-4 md:px-6 flex flex-col gap-6 pt-6">
        <MarketplaceBanners />
        <MarketplaceQuickLinks />
        <MarketplaceCategories />
        <MarketplaceFlashSale />
        <MarketplaceShopeeMall />
        <MarketplaceTopSearch />
        
        {/* Marketplace Items Grid */}
        <div className="w-full mt-6 flex flex-col items-center">
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white uppercase tracking-wide">Gợi ý hôm nay</h2>
            </div>
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/40 border border-dashed border-white/10 rounded-xl">
                <p>Chưa có sản phẩm nào trong không gian này.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4">
                {products.slice(0, visibleItems).map((product) => (
                  <MarketplaceProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
          
          {visibleItems < products.length && (
            <button 
              onClick={() => setVisibleItems(prev => prev + 50)}
              className="mt-8 px-10 py-3 bg-white/5 hover:bg-white/10 hover:text-pink-400 border border-white/10 rounded-xl text-white font-medium transition-all hover:scale-105 active:scale-95"
            >
              Xem thêm
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
