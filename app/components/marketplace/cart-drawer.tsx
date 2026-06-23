"use client";

import React from 'react';
import { X, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart-context';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQty, removeItem, totalPrice } = useCart();
  const router = useRouter();

  if (!isOpen) return null;

  const handleCheckout = () => {
    onClose();
    router.push('/marketplace/checkout');
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0c0c14] border-l border-white/10 shadow-2xl z-[101] flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-white">
            <ShoppingCart className="w-5 h-5" />
            <h2 className="font-bold text-lg">Giỏ hàng của bạn</h2>
          </div>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/40">
              <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
              <p>Giỏ hàng đang trống</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex gap-4 p-3 bg-white/5 border border-white/5 rounded-xl">
                <div className="w-20 h-20 bg-[#1a1a1f] rounded-lg overflow-hidden shrink-0 border border-white/10 relative">
                  {item.image ? (
                     <Image src={item.image} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <ShoppingCart className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="text-white text-sm font-medium line-clamp-2 leading-tight">{item.name}</h3>
                  <div className="text-pink-400 font-bold mt-1 text-sm">{item.price.toLocaleString('vi-VN')} ₫</div>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center border border-white/10 rounded-lg overflow-hidden h-7 bg-white/5">
                      <button onClick={() => updateQty(item.productId, item.qty - 1)} className="w-7 h-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <div className="w-8 h-full flex items-center justify-center text-xs font-medium text-white border-x border-white/10 bg-[#0c0c14]">{item.qty}</div>
                      <button onClick={() => updateQty(item.productId, item.qty + 1)} className="w-7 h-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button onClick={() => removeItem(item.productId)} className="text-white/40 hover:text-red-400 text-xs underline">
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-white/10 bg-[#0c0c14]/80 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
              <span className="text-white/60">Tổng thanh toán</span>
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">
                {totalPrice.toLocaleString('vi-VN')} ₫
              </span>
            </div>
            <Button 
              onClick={handleCheckout}
              className="w-full h-12 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-bold rounded-xl text-base shadow-lg shadow-pink-500/25 border-none transition-all hover:scale-[1.02] active:scale-95"
            >
              Đặt hàng ngay
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
