'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';

export function openAuthModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('open-auth-modal'));
  }
}

export function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-auth-modal', handleOpen);
    return () => window.removeEventListener('open-auth-modal', handleOpen);
  }, []);

  // Hydration safety
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0 cursor-pointer" onClick={() => setIsOpen(false)} />
      <div className="relative w-full max-w-[400px] bg-zinc-900 border border-zinc-800/80 rounded-3xl shadow-2xl overflow-hidden animate-scale-up z-10">
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-8 space-y-6">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-hero-gradient text-white shadow-lg shadow-orange-500/20">
              <Sparkles className="h-7 w-7" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-white">Tham gia cộng đồng</h2>
            <p className="mt-2 text-sm text-zinc-400">Đăng nhập để tương tác, kết bạn và lưu giữ những khoảnh khắc tuyệt vời cùng Ai2Hero.</p>
          </div>

          <div className="space-y-4">
            <a
              href="/api/auth/google"
              className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-zinc-800 rounded-full shadow-md text-sm font-semibold text-white bg-[#111113] hover:bg-zinc-800/80 transition-all cursor-pointer"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              Tiếp tục với Google
            </a>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800/40" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-zinc-900 text-zinc-500 text-xs uppercase tracking-wider">Hoặc</span>
              </div>
            </div>

            <Button
              className="w-full flex justify-center items-center py-3 px-4 border border-zinc-800 rounded-full shadow-lg text-sm font-semibold text-white bg-transparent hover:bg-zinc-800 transition-all cursor-pointer"
              onClick={() => {
                window.location.href = '/sign-in';
              }}
            >
              Đăng nhập bằng Email
            </Button>

            <div className="text-center mt-4 text-sm text-zinc-400">
              Chưa có tài khoản?{' '}
              <Link href="/sign-up" className="text-orange-500 hover:text-orange-400 hover:underline">
                Đăng ký ngay
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
