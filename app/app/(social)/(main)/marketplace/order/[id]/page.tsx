import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { getOrderById } from '@/lib/db/marketplace-queries';
import { CheckCircle2, Package, Truck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const orderId = parseInt(resolvedParams.id, 10);
  if (isNaN(orderId)) return notFound();

  const user = await getUser();
  if (!user) redirect('/sign-in');

  const order = await getOrderById(orderId, user.id);
  if (!order) return notFound();

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 flex flex-col items-center">
      
      {/* Success Animation & Header */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 relative">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
          <CheckCircle2 className="w-10 h-10 text-emerald-400 relative z-10" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Đặt hàng thành công!</h1>
        <p className="text-white/60">Cảm ơn bạn đã mua sắm tại Ai2Hero. Mã đơn hàng: <span className="text-white font-bold">#{order.id}</span></p>
      </div>

      {/* Order Status Stepper */}
      <div className="w-full bg-[#0c0c14]/80 border border-white/5 rounded-2xl p-6 backdrop-blur-md shadow-xl mb-8">
        <div className="flex items-center justify-between relative px-4 sm:px-12">
          {/* Connecting Line */}
          <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-1 bg-white/10 rounded-full overflow-hidden">
             <div className="h-full w-1/3 bg-emerald-500 rounded-full"></div>
          </div>
          
          {/* Steps */}
          <div className="flex flex-col items-center relative z-10 gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-emerald-400">Đã đặt</span>
          </div>

          <div className="flex flex-col items-center relative z-10 gap-2">
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/40">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-white/40">Đang chuẩn bị</span>
          </div>

          <div className="flex flex-col items-center relative z-10 gap-2">
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/40">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-white/40">Đang giao</span>
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="w-full bg-[#0c0c14]/80 border border-white/5 rounded-2xl p-6 backdrop-blur-md shadow-xl mb-8 flex flex-col gap-6">
        <h2 className="text-xl font-bold text-white border-b border-white/10 pb-4">Chi tiết đơn hàng</h2>
        
        <div className="flex flex-col gap-4">
          {items.map((item: any, index: number) => (
            <div key={index} className="flex gap-4 items-center">
              <div className="w-16 h-16 bg-[#1a1a1f] rounded-lg overflow-hidden shrink-0 relative border border-white/10">
                {item.image ? (
                  <Image src={item.image} alt={item.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/5">
                    <Package className="w-6 h-6 text-white/20" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium line-clamp-1">{item.name}</h3>
                <div className="text-white/40 text-sm">Số lượng: {item.qty}</div>
              </div>
              <div className="text-pink-400 font-bold shrink-0">
                {(item.price * item.qty).toLocaleString('vi-VN')} ₫
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-4 flex justify-between items-center mt-2">
          <span className="text-white/60">Tổng thanh toán</span>
          <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">
            {order.totalAmount.toLocaleString('vi-VN')} ₫
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link href="/marketplace">
          <Button className="w-full sm:w-auto h-12 px-8 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl transition-all">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tiếp tục mua sắm
          </Button>
        </Link>
        <Link href="/profile/me?tab=orders">
          <Button className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-pink-500/25 border-none transition-all">
            Xem lịch sử mua hàng
          </Button>
        </Link>
      </div>

    </div>
  );
}
