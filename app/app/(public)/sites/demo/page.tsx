import React from 'react';
import { EcommerceTemplate } from '@/components/website-templates/ecommerce-template';

export default function DemoWebsitePage() {
  // Dữ liệu giả lập (Mock data) cho trang demo
  const mockWebsite = {
    name: 'Hero Store',
    subdomain: 'demo',
  };

  const mockProducts = [
    { name: 'Tai nghe Bluetooth Pro', price: 1250000, discount: 15, imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60' },
    { name: 'Đồng hồ thông minh Series 8', price: 5400000, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60' },
    { name: 'Máy ảnh Mirrorless Alpha', price: 21000000, discount: 10, imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&auto=format&fit=crop&q=60' },
    { name: 'Giày Thể Thao Running', price: 1850000, discount: 20, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60' },
    { name: 'Kính râm phân cực', price: 450000, discount: 5, imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&auto=format&fit=crop&q=60' },
  ];

  const mockReels = [
    { title: 'Review siêu phẩm tai nghe mới nhất', thumbnail: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&auto=format&fit=crop&q=60' },
    { title: 'Unbox đôi giày quốc dân năm nay', thumbnail: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&auto=format&fit=crop&q=60' },
    { title: 'Test khả năng chống nước đồng hồ', thumbnail: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&auto=format&fit=crop&q=60' },
    { title: 'Hướng dẫn phối đồ đi chơi', thumbnail: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop&q=60' },
  ];

  const mockPosts = [
    { title: 'Xu hướng thời trang Thu Đông', category: 'Thời trang', date: '10/06/2026', content: 'Khám phá những phong cách phối đồ đang làm mưa làm gió trong mùa Thu Đông năm nay.', imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&auto=format&fit=crop&q=60' },
    { title: 'Top 5 đồ công nghệ đáng mua', category: 'Công nghệ', date: '08/06/2026', content: 'Cùng điểm qua 5 món đồ công nghệ không thể thiếu cho dân văn phòng và sinh viên.', imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&auto=format&fit=crop&q=60' },
    { title: 'Bí quyết bảo quản giày da', category: 'Mẹo hay', date: '05/06/2026', content: 'Làm thế nào để đôi giày da của bạn luôn sáng bóng và bền bỉ theo năm tháng?', imageUrl: 'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=500&auto=format&fit=crop&q=60' },
  ];

  return (
    <EcommerceTemplate 
      website={mockWebsite} 
      products={mockProducts} 
      reels={mockReels} 
      posts={mockPosts} 
    />
  );
}
