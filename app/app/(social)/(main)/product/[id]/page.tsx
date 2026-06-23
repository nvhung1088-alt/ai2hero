import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { ProductGallery } from '@/components/marketplace/product/product-gallery';
import { ProductInfo } from '@/components/marketplace/product/product-info';
import { ProductShopSnippet } from '@/components/marketplace/product/product-shop-snippet';
import { ProductDescription } from '@/components/marketplace/product/product-description';
import { ProductReviews } from '@/components/marketplace/product/product-reviews';
import { getProductById } from '@/lib/db/marketplace-queries';
import { getUser, getTeamForUser } from '@/lib/db/queries';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const productId = parseInt(resolvedParams.id, 10);
  if (isNaN(productId)) return notFound();

  const user = await getUser();
  if (!user) redirect('/sign-in');

  const team = await getTeamForUser();
  if (!team) redirect('/dashboard');

  const product = await getProductById(team.id, productId);
  if (!product) return notFound();

  return (
    <div className="flex flex-col w-full h-full pb-20">
      {/* Search Header for Mobile overlay context if needed, usually global header handles it */}
      
      <div className="w-full px-4 md:px-6 pt-6 flex flex-col gap-6">
        
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-white/40 gap-2 mb-2">
           <span className="hover:text-pink-400 cursor-pointer">Ai2Hero</span> 
           <span>{'>'}</span>
           <span className="hover:text-pink-400 cursor-pointer">{product.category?.name || 'Sản phẩm'}</span>
           <span>{'>'}</span>
           <span className="text-white/80 truncate max-w-[200px] md:max-w-[400px]">{product.name}</span>
        </div>

        {/* Top Section: Gallery & Info */}
        <div className="flex flex-col lg:flex-row gap-6 bg-[#0c0c14]/80 border border-white/5 rounded-2xl p-4 md:p-8 backdrop-blur-md shadow-2xl">
          {/* Left: Media Gallery (approx 40%) */}
          <div className="w-full lg:w-[40%] xl:w-[45%] shrink-0">
            <ProductGallery images={product.images as string[]} />
          </div>
          
          {/* Right: Product Info & Buy Actions */}
          <div className="flex-1 min-w-0">
            <ProductInfo 
              product={product} 
              shopId={product.shopId} 
              teamId={team.id}
              imageUrl={product.images && Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : undefined}
            />
          </div>
        </div>

        {/* Shop Snippet */}
        <div className="bg-[#0c0c14]/80 border border-white/5 rounded-2xl p-4 md:p-6 backdrop-blur-md shadow-2xl">
          <ProductShopSnippet shop={product.shop} />
        </div>

        {/* Bottom Section: Description & Reviews */}
        <div className="flex flex-col gap-6 items-start w-full">
          {/* Product Details / Description */}
          <div className="w-full bg-[#0c0c14]/80 border border-white/5 rounded-2xl p-4 md:p-8 backdrop-blur-md shadow-2xl">
            <ProductDescription />
          </div>

          {/* Product Reviews */}
          <div className="w-full bg-[#0c0c14]/80 border border-white/5 rounded-2xl p-4 md:p-8 backdrop-blur-md shadow-2xl">
            <ProductReviews />
          </div>
        </div>
        
      </div>
    </div>
  );
}
