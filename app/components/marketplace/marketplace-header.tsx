"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Store, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart-context';
import { CartDrawer } from './cart-drawer';

export function MarketplaceHeader() {
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { totalItems } = useCart();
  const searchOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchOverlayRef.current && !searchOverlayRef.current.contains(event.target as Node)) {
        setShowMobileSearch(false);
      }
    }
    
    if (showMobileSearch) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileSearch]);

  return (
    <div className="w-full max-w-[1000px] flex items-center justify-end md:justify-center">
      {/* Desktop View */}
      <div className="hidden md:flex w-full items-center gap-6 mt-1">
        {/* Logo Area */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
            <Store className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent hidden sm:block">
            iMarket
          </span>
        </div>

        {/* Search Bar */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="relative flex w-full h-11 bg-white/5 border border-white/10 hover:border-pink-500/50 focus-within:border-pink-500/50 focus-within:bg-white/10 transition-all rounded-xl overflow-hidden p-1">
            <input 
              type="text" 
              placeholder="Tìm kiếm sản phẩm, thương hiệu..." 
              className="flex-1 bg-transparent border-none outline-none text-white px-3 text-sm placeholder-white/40"
            />
            <Button className="h-full px-5 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white rounded-lg border-none">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Cart */}
        <div 
          onClick={() => setIsCartOpen(true)}
          className="shrink-0 relative cursor-pointer p-2 hover:bg-white/5 rounded-xl transition-colors"
        >
          <ShoppingCart className="w-7 h-7 text-white/90" />
          {totalItems > 0 && (
            <div className="absolute top-0 right-0 min-w-5 h-5 px-1 bg-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#08080c]">
              {totalItems}
            </div>
          )}
        </div>
      </div>

      {/* Mobile View */}
      <div className="flex md:hidden items-center gap-1">
        <button 
          onClick={() => setShowMobileSearch(true)}
          className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all"
        >
          <Search className="w-5 h-5" />
        </button>
        <div 
          onClick={() => setIsCartOpen(true)}
          className="relative cursor-pointer p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all"
        >
          <ShoppingCart className="w-5 h-5" />
          {totalItems > 0 && (
            <div className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-[2px] bg-pink-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-[#08080c]">
              {totalItems}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div 
          ref={searchOverlayRef}
          className="absolute inset-0 z-50 bg-gray-950 flex items-center px-4 gap-2 md:hidden border-b border-white/10 shadow-2xl"
        >
          <div className="relative flex flex-1 h-10 bg-white/5 border border-white/10 focus-within:border-pink-500/50 focus-within:bg-white/10 transition-all rounded-xl overflow-hidden p-1">
            <input 
              autoFocus
              type="text" 
              placeholder="Tìm kiếm sản phẩm..." 
              className="flex-1 bg-transparent border-none outline-none text-white px-3 text-sm placeholder-white/40"
            />
            <Button className="h-full px-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-lg border-none">
              <Search className="w-4 h-4" />
            </Button>
          </div>
          <button 
            onClick={() => setShowMobileSearch(false)}
            className="p-2 text-white/60 hover:text-white bg-white/5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
