import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface ProductProps {
  product: any;
}

export function MarketplaceProductCard({ product }: ProductProps) {
  // Assuming images is an array of strings
  const images = Array.isArray(product.images) ? product.images : [];
  const imageUrl = images.length > 0 ? images[0] : 'https://placehold.co/300x300/1a1a1f/fff?text=No+Image';

  const discountPercent = product.comparePrice && product.price < product.comparePrice 
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : 0;

  return (
    <Link href={`/product/${product.id}`}>
      <div className="bg-[#1a1a1f] border border-white/5 rounded-xl flex flex-col overflow-hidden hover:border-pink-500/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.15)] transition-all cursor-pointer group h-full">
        <div className="relative aspect-square w-full bg-white/5 flex items-center justify-center">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {discountPercent > 0 && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow-lg">
              -{discountPercent}%
            </div>
          )}
        </div>
        <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
          <h3 className="text-xs text-white/90 font-medium line-clamp-2 leading-tight">
            {product.name}
          </h3>
          <div className="flex flex-col mt-1">
            <div className="text-orange-500 font-bold text-sm">
              {product.price.toLocaleString('vi-VN')}₫
            </div>
            {product.comparePrice ? (
              <div className="text-[10px] text-white/40 line-through h-3">
                {product.comparePrice.toLocaleString('vi-VN')}₫
              </div>
            ) : (
               <div className="h-3"></div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
