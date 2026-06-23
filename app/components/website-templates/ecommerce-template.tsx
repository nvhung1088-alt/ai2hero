'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingCart, Search, Menu, PlayCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EcommerceTemplate({ website, products, posts, reels, themeConfig = {} }: { website: any, products: any[], posts: any[], reels: any[], themeConfig?: any }) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // Nguồn dữ liệu
  const logoUrl = themeConfig?.logoUrl || '';
  const seoDescription = themeConfig?.seoDescription || website?.name || 'Mẫu giao diện E-commerce AI2Hero';
  const siteName = website?.name || 'Cửa hàng của tôi';

  // Thêm thẻ meta
  React.useEffect(() => {
    document.title = siteName;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', seoDescription);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = seoDescription;
      document.head.appendChild(meta);
    }
  }, [siteName, seoDescription]);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Menu className="h-6 w-6 text-gray-600 md:hidden cursor-pointer" />
              <Link href="#" className="flex-shrink-0 flex items-center gap-2">
                {logoUrl ? (
                  <img src={logoUrl} alt={siteName} className="h-8 w-8 rounded-md object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg shadow-md" />
                )}
                <span className="font-black text-2xl tracking-tighter text-indigo-600">
                  {siteName}
                </span>
              </Link>
            </div>
            
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-full leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="Tìm kiếm sản phẩm..."
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-pink-500 text-white text-[10px] font-bold text-center leading-4 shadow-sm">
                  3
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative bg-gray-900 overflow-hidden">
        <div className="absolute inset-0">
          <img
            className="w-full h-full object-cover opacity-40"
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
            alt="Hero background"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/80 to-transparent mix-blend-multiply" />
        </div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl max-w-2xl">
            {website?.name || 'Chào mừng đến với Cửa Hàng'}
          </h1>
          <p className="mt-6 text-xl text-gray-300 max-w-xl">
            Khám phá bộ sưu tập sản phẩm mới nhất được đồng bộ trực tiếp từ AI2Hero Marketplace. Chất lượng đảm bảo, giao hàng nhanh chóng.
          </p>
          <div className="mt-10 max-w-sm flex gap-4">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-indigo-500/30 transition-all">
              Mua sắm ngay
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
        
        {/* Products Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Sản Phẩm Nổi Bật</h2>
            <Link href="#" className="text-indigo-600 font-medium hover:text-indigo-500">Xem tất cả &rarr;</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {products?.map((product: any, idx: number) => (
              <div key={idx} className="group relative bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="aspect-[4/5] bg-gray-100 overflow-hidden relative">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">No Image</div>
                  )}
                  {product.discount > 0 && (
                    <div className="absolute top-2 left-2 bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                      -{product.discount}%
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 group-hover:text-indigo-600 transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-500">4.9 (128 đã bán)</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-lg font-bold text-indigo-600">{product.price.toLocaleString()}đ</p>
                    <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors">
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reels Section (Social Integration) */}
        <section className="bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <PlayCircle className="w-8 h-8 text-pink-500" />
                  Video Review
                </h2>
                <p className="text-gray-500 mt-2">Xem trực tiếp sản phẩm qua Video Reels</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {reels?.map((reel: any, idx: number) => (
                <div key={idx} className="aspect-[9/16] bg-black rounded-2xl overflow-hidden relative group cursor-pointer shadow-md">
                  <img src={reel.thumbnail} alt="Reel thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlayCircle className="w-12 h-12 text-white/80 group-hover:scale-110 group-hover:text-white transition-all drop-shadow-lg" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white font-medium text-sm line-clamp-2">{reel.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Blog/News Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Tin Tức & Bài Viết</h2>
            <Link href="#" className="text-indigo-600 font-medium hover:text-indigo-500">Đọc thêm &rarr;</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {posts?.map((post: any, idx: number) => (
              <div key={idx} className="group cursor-pointer">
                <div className="aspect-[16/9] bg-gray-200 rounded-2xl overflow-hidden mb-4 shadow-sm">
                  {post.imageUrl ? (
                    <img src={post.imageUrl} alt="Blog thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-pink-100" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <span className="text-indigo-600 font-semibold">{post.category || 'Mẹo hay'}</span>
                  <span>•</span>
                  <span>{post.date || 'Hôm nay'}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-gray-600 line-clamp-2">{post.content}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-2xl font-black tracking-tighter text-indigo-400 mb-4">{website?.name || 'MYSITE'}</h4>
            <p className="text-gray-400 text-sm">Cửa hàng trực tuyến chuyên cung cấp các sản phẩm chất lượng cao, đồng bộ từ hệ sinh thái AI2Hero.</p>
          </div>
          <div>
            <h5 className="font-bold mb-4">Về chúng tôi</h5>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white transition-colors">Giới thiệu</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Liên hệ</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Tuyển dụng</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-4">Hỗ trợ</h5>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white transition-colors">Chính sách bảo mật</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Điều khoản dịch vụ</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Câu hỏi thường gặp</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-4">Đăng ký nhận tin</h5>
            <div className="flex">
              <input type="email" placeholder="Email của bạn" className="px-4 py-2 bg-gray-800 text-white rounded-l-lg focus:outline-none w-full" />
              <button className="bg-indigo-600 px-4 py-2 rounded-r-lg font-medium hover:bg-indigo-500 transition-colors">Gửi</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
