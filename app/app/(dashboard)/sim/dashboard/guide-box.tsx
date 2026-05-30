'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';

export default function SimGuideBox() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isClosed = localStorage.getItem('simguard_guide_closed');
      if (!isClosed) {
        setIsOpen(true);
      }
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('simguard_guide_closed', 'true');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="relative bg-gradient-to-br from-[#0a1628] to-[#0d1f3c] border border-cyan-500/15 rounded-2xl p-6 backdrop-blur-xl animate-fade-in shadow-2xl shadow-cyan-500/5 space-y-5">
      {/* Close button X */}
      <button 
        onClick={handleClose}
        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
        title="Đóng hướng dẫn"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header Info */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-cyan-950/80 text-cyan-400 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-cyan-500/20">
            🚀 Bắt đầu
          </span>
          <h2 className="font-extrabold text-sm text-white tracking-tight">Chào mừng bạn đến với SimGuard!</h2>
        </div>
        <p className="text-xs text-gray-400 max-w-4xl leading-relaxed">
          Chỉ với 3 bước đơn giản, doanh nghiệp của bạn có thể quản lý và bảo vệ toàn bộ SIM cùng tài khoản seeding, tránh rủi ro thu hồi SIM gây mất mát tài sản số:
        </p>
      </div>

      {/* 3 Step Cards Grid — Nền sáng khớp mockup */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="bg-white/[0.06] border border-white/10 p-4 rounded-xl flex gap-3 hover:bg-white/[0.09] hover:border-cyan-500/20 transition-all duration-300">
          <div className="h-7 w-7 rounded-full bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/30">
            1
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-white text-sm leading-snug">Import danh sách SIM</h4>
            <p className="text-xs text-gray-400 leading-relaxed">Tải file Excel SIM hiện có của doanh nghiệp lên hệ thống.</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white/[0.06] border border-white/10 p-4 rounded-xl flex gap-3 hover:bg-white/[0.09] hover:border-cyan-500/20 transition-all duration-300">
          <div className="h-7 w-7 rounded-full bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/30">
            2
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-white text-sm leading-snug">Liên kết tài khoản</h4>
            <p className="text-xs text-gray-400 leading-relaxed">Gắn tài khoản Facebook, Shopee, TikTok... vào SIM nhận OTP.</p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white/[0.06] border border-white/10 p-4 rounded-xl flex gap-3 hover:bg-white/[0.09] hover:border-cyan-500/20 transition-all duration-300">
          <div className="h-7 w-7 rounded-full bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/30">
            3
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-white text-sm leading-snug">Cài nhận tin Telegram</h4>
            <p className="text-xs text-gray-400 leading-relaxed">Nhận cảnh báo tự động khi SIM sắp hết hạn, nv nghỉ việc...</p>
          </div>
        </div>
      </div>

      {/* Action Nút "Bắt đầu ngay" */}
      <div className="flex justify-end pt-1">
        <button
          onClick={handleClose}
          className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          Bắt đầu ngay <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
