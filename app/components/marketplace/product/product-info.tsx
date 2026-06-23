"use client";
import React, { useState } from 'react';
import { Star, ShieldCheck, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

interface ProductInfoProps {
  product?: any;
  shopId?: number;
  teamId?: number;
  imageUrl?: string;
}

export function ProductInfo({ product, shopId, teamId, imageUrl }: ProductInfoProps) {
  const [qty, setQty] = useState(1);
  const [selectedColor, setSelectedColor] = useState('Đen');
  const colors = ['Đen', 'Trắng', 'Hồng', 'Xanh lam'];
  
  const { addItem } = useCart();
  const router = useRouter();
  const { showToast } = useToast();

  const handleAddToCart = () => {
    if (!product || !shopId || !teamId) {
      showToast('Không thể thêm sản phẩm này.', 'error');
      return;
    }
    
    addItem({
      productId: product.id,
      shopId,
      teamId,
      name: product.name,
      price: product.price,
      image: imageUrl,
      qty,
    });
    
    showToast(`Đã thêm ${qty} x ${product.name} vào giỏ hàng`, 'success');
  };

  const handleBuyNow = () => {
    if (!product || !shopId || !teamId) return;
    
    addItem({
      productId: product.id,
      shopId,
      teamId,
      name: product.name,
      price: product.price,
      image: imageUrl,
      qty,
    });
    
    router.push('/marketplace/checkout');
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Badges & Title */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shadow-lg shadow-pink-500/20">Yêu thích</span>
          <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shadow-lg shadow-orange-500/20">Mall</span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-white leading-snug">
          {product?.name || 'Tai Nghe Bluetooth Không Dây Ai2Hero Pro Chống Ồn Chủ Động ANC'}
        </h1>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm divide-x divide-white/10">
        <div className="flex items-center gap-1 text-pink-400">
          <span className="font-bold underline text-lg">4.9</span>
          <div className="flex">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
          </div>
        </div>
        <div className="pl-4 text-white/80">
          <span className="font-bold text-white border-b border-white/30 mr-1 text-lg">1.2k</span> Đánh giá
        </div>
        <div className="pl-4 text-white/80">
          <span className="font-bold text-white mr-1 text-lg">5.4k</span> Đã bán
        </div>
      </div>

      {/* Price Block */}
      <div className="bg-[#1a1a1f] border border-white/5 rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 blur-3xl rounded-full"></div>
        <div className="flex items-center gap-3 relative z-10">
          {product?.comparePrice && (
            <span className="text-white/40 line-through text-lg">{product.comparePrice.toLocaleString('vi-VN')} ₫</span>
          )}
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">
              {product?.price ? product.price.toLocaleString('vi-VN') : '750.000'} ₫
            </span>
            {product?.comparePrice && product.price < product.comparePrice && (
              <span className="bg-pink-500/20 text-pink-400 text-xs font-bold px-2 py-0.5 rounded mb-1.5 border border-pink-500/30">
                GIẢM {Math.round((1 - product.price / product.comparePrice) * 100)}%
              </span>
            )}
          </div>
        </div>
        <div className="text-xs text-orange-400 font-medium mt-1 relative z-10 flex items-center gap-1">
          Rẻ hơn hoàn tiền - Trả góp 0%
        </div>
      </div>

      {/* Variations */}
      <div className="flex flex-col gap-5 mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <span className="text-white/60 w-20 shrink-0 text-sm">Màu sắc</span>
          <div className="flex flex-wrap gap-2">
            {colors.map(c => (
              <button 
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`px-4 py-2 border rounded-lg text-sm transition-all ${selectedColor === c ? 'border-pink-500 text-pink-400 bg-pink-500/10 shadow-[0_0_10px_rgba(236,72,153,0.1)]' : 'border-white/10 text-white/80 hover:border-white/30 hover:bg-white/5'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-2">
          <span className="text-white/60 w-20 shrink-0 text-sm">Số lượng</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-white/10 rounded-lg overflow-hidden h-9 bg-white/5">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors"><Minus className="w-4 h-4" /></button>
              <div className="w-12 h-full flex items-center justify-center text-sm font-medium text-white border-x border-white/10 bg-[#0c0c14]">{qty}</div>
              <button onClick={() => setQty(qty + 1)} className="w-9 h-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors"><Plus className="w-4 h-4" /></button>
            </div>
            <span className="text-white/40 text-sm">{product?.stock || 0} sản phẩm có sẵn</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <Button 
          onClick={handleAddToCart}
          className="flex-1 h-14 bg-pink-500/10 border border-pink-500 text-pink-400 hover:bg-pink-500/20 text-base font-bold transition-all hover:scale-[1.02] active:scale-95"
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          Thêm Vào Giỏ Hàng
        </Button>
        <Button 
          onClick={handleBuyNow}
          className="flex-1 h-14 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white text-base font-bold shadow-lg shadow-pink-500/25 border-none transition-all hover:scale-[1.02] active:scale-95"
        >
          Mua Ngay
        </Button>
      </div>

      {/* Shopee Guarantee */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 text-sm text-white/60">
        <ShieldCheck className="w-5 h-5 text-emerald-400" />
        <span className="text-white/80 font-medium">Ai2Hero Đảm Bảo</span>
        <span>3 Ngày Trả Hàng / Hoàn Tiền</span>
      </div>
    </div>
  );
}
