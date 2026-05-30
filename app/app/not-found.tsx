import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-gray-950 text-white relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />

      <div className="max-w-md space-y-8 p-6 text-center z-10 relative">
        <div className="flex justify-center">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-pink-500 text-white shadow-xl shadow-orange-500/20 animate-bounce">
            <Sparkles className="h-8 w-8" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-8xl font-black bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent tracking-tighter">
            404
          </h1>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Không tìm thấy trang
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Trang bạn đang tìm kiếm có thể đã bị xóa, đổi tên, hoặc tạm thời không khả dụng.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center py-3.5 px-8 bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/15 hover:shadow-orange-500/25 transition-all cursor-pointer"
          >
            ← Quay lại Bảng điều khiển
          </Link>
        </div>
      </div>
    </div>
  );
}
