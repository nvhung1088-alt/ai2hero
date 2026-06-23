import React from 'react';
import { notFound } from 'next/navigation';
import { getWebsiteBySubdomain } from '@/lib/db/website-queries';
import { EcommerceTemplate } from '@/components/website-templates/ecommerce-template';

export default async function SubdomainPage({
  params
}: {
  params: Promise<{ subdomain: string }>
}) {
  const { subdomain } = await params;
  
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return notFound();
  }

  // Parse theme config
  let themeConfig: any = {};
  if (typeof website.themeConfig === 'string') {
    try {
      themeConfig = JSON.parse(website.themeConfig);
    } catch (e) {}
  } else if (website.themeConfig) {
    themeConfig = website.themeConfig;
  }

  // Mock products (in the future, fetch from marketplace API based on user)
  const mockProducts = [
    { id: 1, name: 'Áo Thun Basic Hero', price: '199.000đ', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80' },
    { id: 2, name: 'Giày Thể Thao Pro', price: '850.000đ', image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=500&q=80' },
    { id: 3, name: 'Túi Xách Da Cao Cấp', price: '1.200.000đ', image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=500&q=80' },
    { id: 4, name: 'Đồng Hồ Thời Trang', price: '2.500.000đ', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80' },
  ];

  const mockPosts = [
    { id: 1, title: 'Xu hướng thời trang 2026', excerpt: 'Cùng tìm hiểu những mẫu thiết kế mới nhất...', date: '10 Th06' },
    { id: 2, title: 'Cách phối đồ với giày Sneaker', excerpt: 'Bí kíp để bạn luôn nổi bật trên phố...', date: '08 Th06' },
  ];

  const mockReels = [
    { id: 1, views: '1.2M', thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&q=80' },
    { id: 2, views: '850K', thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&q=80' },
    { id: 3, views: '2.4M', thumbnail: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=500&q=80' },
  ];

  return (
    <EcommerceTemplate 
      website={website} 
      products={mockProducts}
      posts={mockPosts}
      reels={mockReels}
      themeConfig={themeConfig}
    />
  );
}
