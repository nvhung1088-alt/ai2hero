import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';

// Caching đơn giản trong bộ nhớ để tránh spam requests cho cùng một URL
const ogCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 300000; // 5 phút

function getMetaTagContent(html: string, nameOrProperty: string): string | null {
  const sanitize = (str: string) => {
    return str
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .trim();
  };

  // Các regex bắt cấu trúc thẻ meta viết theo các thứ tự khác nhau
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${nameOrProperty}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${nameOrProperty}["']`, 'i'),
    new RegExp(`<meta[^>]*name=["']${nameOrProperty}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${nameOrProperty}["']`, 'i')
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return sanitize(match[1]);
  }

  return null;
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Thiếu tham số url' }, { status: 400 });
  }

  // Khôi phục URL hợp lệ
  let cleanUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `https://${cleanUrl}`;
  }

  // Kiểm tra cache
  const now = Date.now();
  const cached = ogCache.get(cleanUrl);
  if (cached && now < cached.expiry) {
    return NextResponse.json(cached.data);
  }

  try {
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page metadata: ${response.statusText}`);
    }

    const html = await response.text();

    const title = getMetaTagContent(html, 'og:title') || 
                  html.match(/<title>([^<]*)<\/title>/i)?.[1] || 
                  cleanUrl;
                  
    const description = getMetaTagContent(html, 'og:description') || 
                        getMetaTagContent(html, 'description') || 
                        '';
                        
    const image = getMetaTagContent(html, 'og:image') || '';

    const ogData = {
      title: title.trim(),
      description: description.trim(),
      image: image.trim(),
      url: cleanUrl,
    };

    // Cache kết quả
    ogCache.set(cleanUrl, {
      data: ogData,
      expiry: now + CACHE_TTL,
    });

    return NextResponse.json(ogData);
  } catch (error: any) {
    return NextResponse.json({
      title: cleanUrl,
      description: '',
      image: '',
      url: cleanUrl,
      error: error.message
    });
  }
}