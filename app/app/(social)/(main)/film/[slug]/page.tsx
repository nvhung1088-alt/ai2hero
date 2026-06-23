import { getViewerSeriesDetailAction } from '@/lib/db/film-actions';
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import HeroFilmWatchClient from './watch-client';
import { Metadata } from 'next';

import { parseFilmUrl } from '@/lib/utils/film-url';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const p = await params;
  const { slug, ep } = parseFilmUrl(p.slug);
  
  if (!slug) {
    return { title: 'Xem Film - HeroFilm' };
  }
  
  const data = await getViewerSeriesDetailAction(slug);
  
  if (!data || !data.series) {
    return { title: 'Phim không tồn tại - HeroFilm' };
  }
  
  const title = `${data.series.title} - Tập ${ep || 1} | HeroFilm`;
  const description = data.series.description || `Xem ngay phim ${data.series.title} tập ${ep || 1} cực hấp dẫn trên mạng xã hội HeroFilm.`;
  const imageUrl = data.series.coverUrl || '/images/default-film-cover.jpg'; // Thêm default image nếu cần
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'HeroFilm',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: data.series.title }],
      type: 'video.movie',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    }
  };
}

export default async function FilmWatchPage({ params }: PageProps) {
  const p = await params;
  const { slug, ep } = parseFilmUrl(p.slug);
  
  if (!slug) {
    redirect(`/film`);
  }
  
  const initialEpisodeNumber = ep || 1;
  
  const user = await getUser();
  const userId = user ? user.id : undefined;

  // Lấy chi tiết phim, danh sách tập, trạng thái bookmark và danh sách tập đã mua
  const data = await getViewerSeriesDetailAction(slug, userId);
  
  if (!data) {
    redirect(`/film`);
  }
  
  if (data.episodes.length === 0) {
    redirect(`/film`);
  }
  
  return (
    <HeroFilmWatchClient
      series={data.series}
      episodes={data.episodes}
      initialEpisodeNumber={initialEpisodeNumber}
      initialBookmarked={data.isBookmarked}
      initialLiked={data.isLiked}
      userId={userId}
      isAdmin={user ? ['admin', 'owner'].includes(user.role) : false}
    />
  );
}
