import Link from 'next/link';
import { Film, Github, Twitter, Facebook } from 'lucide-react';

export function FilmFooter() {
  return (
    <footer className="mt-12 border-t border-white/5 bg-black/20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/film" className="flex items-center gap-2 mb-4 cursor-pointer">
              <div className="bg-gradient-to-tr from-rose-500 to-red-600 p-1.5 rounded-lg">
                <Film className="h-5 w-5 text-white" />
              </div>
              <span className="font-extrabold text-lg text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                Ai2Hero Film
              </span>
            </Link>
            <p className="text-gray-500 text-xs leading-relaxed max-w-sm">
              Nền tảng xem phim ngắn cuộn dọc chất lượng cao. Khám phá hàng ngàn bộ phim đặc sắc với trải nghiệm mượt mà, không giới hạn.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold text-gray-300 text-sm mb-4">Khám phá</h3>
            <ul className="space-y-2 text-xs text-gray-500">
              <li><Link href="/film" className="hover:text-rose-400 transition-colors cursor-pointer">Phim mới cập nhật</Link></li>
              <li><Link href="/film" className="hover:text-rose-400 transition-colors cursor-pointer">Phim hot tuần này</Link></li>
              <li><Link href="/film" className="hover:text-rose-400 transition-colors cursor-pointer">Gói Premium</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gray-300 text-sm mb-4">Hỗ trợ</h3>
            <ul className="space-y-2 text-xs text-gray-500">
              <li><Link href="#" className="hover:text-rose-400 transition-colors cursor-pointer">Điều khoản dịch vụ</Link></li>
              <li><Link href="#" className="hover:text-rose-400 transition-colors cursor-pointer">Chính sách bảo mật</Link></li>
              <li><Link href="#" className="hover:text-rose-400 transition-colors cursor-pointer">Trung tâm trợ giúp</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-[10px] font-medium">
            &copy; {new Date().getFullYear()} Ai2Hero Film. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-gray-600 hover:text-white transition-colors"><Facebook className="h-4 w-4" /></a>
            <a href="#" className="text-gray-600 hover:text-white transition-colors"><Twitter className="h-4 w-4" /></a>
            <a href="#" className="text-gray-600 hover:text-white transition-colors"><Github className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
