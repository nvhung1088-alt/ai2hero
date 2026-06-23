"use client";

import React, { useState } from 'react';
import { useCart } from '@/lib/cart-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { createOrderAction } from '@/lib/db/marketplace-actions';
import { Button } from '@/components/ui/button';
import { MapPin, ShoppingCart, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

export function CheckoutClient() {
  const { items, totalPrice, clearCart } = useCart();
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simple form state for MVP
  const [formData, setFormData] = useState({
    name: 'Ai2Hero User',
    phone: '0987654321',
    address: '123 Đường Công Nghệ, Quận Thủ Đức, TP.HCM'
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShoppingCart className="w-20 h-20 text-white/20" />
        <h1 className="text-2xl font-bold">Giỏ hàng trống</h1>
        <p className="text-white/60">Vui lòng thêm sản phẩm vào giỏ hàng để tiếp tục.</p>
        <Button onClick={() => router.push('/marketplace')} className="mt-4">
          Quay lại mua sắm
        </Button>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    
    try {
      // In a real app with multi-shop cart, we'd group items by shopId
      // and create multiple orders. For MVP, we'll assume one shop
      // or just pick the first shopId.
      const shopId = items[0].shopId;
      const teamId = items[0].teamId;
      
      const res = await createOrderAction({
        shopId,
        teamId,
        items: items.map(i => ({
          productId: i.productId,
          qty: i.qty,
          price: i.price,
          name: i.name,
          image: i.image
        }))
      });

      if (res.success && res.data) {
        clearCart();
        showToast('Đặt hàng thành công! Cảm ơn bạn đã mua sắm tại Ai2Hero.', 'success');
        router.push(`/marketplace/order/${res.data.id}`);
      } else {
        showToast(res.error || 'Vui lòng thử lại sau', 'error');
      }
    } catch (e) {
      showToast('Đã xảy ra sự cố kỹ thuật', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-8">Thanh toán</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Address & Items */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Address Box */}
          <div className="bg-[#0c0c14]/80 border border-white/5 rounded-2xl p-6 backdrop-blur-md shadow-xl">
            <div className="flex items-center gap-2 text-pink-400 mb-4">
              <MapPin className="w-5 h-5" />
              <h2 className="text-lg font-bold text-white">Địa chỉ nhận hàng</h2>
            </div>
            
            <div className="flex flex-col gap-2 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="font-bold flex gap-4">
                <span>{formData.name}</span>
                <span className="text-white/60">{formData.phone}</span>
              </div>
              <div className="text-white/80">{formData.address}</div>
              <button className="text-pink-400 text-sm font-medium text-left mt-2 w-fit">
                Thay đổi
              </button>
            </div>
          </div>

          {/* Items Box */}
          <div className="bg-[#0c0c14]/80 border border-white/5 rounded-2xl p-6 backdrop-blur-md shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">Sản phẩm</h2>
            
            <div className="flex flex-col gap-4">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-4 p-4 bg-white/5 border border-white/5 rounded-xl">
                  <div className="w-20 h-20 bg-[#1a1a1f] rounded-lg overflow-hidden shrink-0 relative">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-white/20" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1">
                    <h3 className="text-white font-medium line-clamp-2">{item.name}</h3>
                    <div className="text-white/60 text-sm mt-1">Số lượng: {item.qty}</div>
                    <div className="text-pink-400 font-bold mt-auto">{item.price.toLocaleString('vi-VN')} ₫</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#0c0c14]/80 border border-white/5 rounded-2xl p-6 backdrop-blur-md shadow-xl sticky top-24">
            <h2 className="text-lg font-bold text-white mb-4">Tổng quan đơn hàng</h2>
            
            <div className="flex flex-col gap-3 text-sm border-b border-white/10 pb-4 mb-4">
              <div className="flex justify-between">
                <span className="text-white/60">Tổng tiền hàng</span>
                <span>{totalPrice.toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Phí vận chuyển</span>
                <span>0 ₫</span>
              </div>
            </div>
            
            <div className="flex justify-between items-end mb-6">
              <span className="text-white/80 font-medium">Tổng thanh toán</span>
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">
                {totalPrice.toLocaleString('vi-VN')} ₫
              </span>
            </div>
            
            <Button 
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-bold rounded-xl text-base shadow-lg shadow-pink-500/25 border-none transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
            </Button>
            
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-white/40">
              <ShieldCheck className="w-4 h-4" />
              <span>Thanh toán an toàn & bảo mật qua Ai2Hero</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
