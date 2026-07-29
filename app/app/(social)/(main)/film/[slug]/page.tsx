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
  
  const currentEpIndex = data.episodes.findIndex(e => e.episodeNumber === initialEpisodeNumber);
  const currentEpisode = currentEpIndex !== -1 ? data.episodes[currentEpIndex] : data.episodes[0];
  const seriesTitle = data.series.title;
  const epNumber = currentEpisode?.episodeNumber || 1;
  const pageFullTitle = `${seriesTitle} - Tập ${epNumber} Vietsub Full HD`;
  const summaryText = currentEpisode?.summary || data.series.description || `Xem phim ${seriesTitle} Tập ${epNumber} Vietsub chất lượng cao, cập nhật nhanh nhất tại HeroFilm.`;

  // Parse timeline for Schema VideoObject Key Moments
  const timelineItems = Array.isArray(currentEpisode?.timeline) ? currentEpisode.timeline : [];
  const clipsSchema = timelineItems.map((item: any) => {
    const parts = (item.time || '00:00').split(':');
    let startSeconds = 0;
    if (parts.length === 3) startSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    else if (parts.length === 2) startSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);

    return {
      '@type': 'Clip',
      'name': item.label || `Mốc thời gian ${item.time}`,
      'startOffset': startSeconds,
      'url': `https://www.ai2hero.com/film/${slug}?ep=${epNumber}&t=${startSeconds}`
    };
  });

  // Schema JSON-LD
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Movie',
        '@id': `https://www.ai2hero.com/film/${slug}#movie`,
        'name': seriesTitle,
        'description': data.series.description,
        'image': data.series.coverUrl || data.series.bannerUrl,
        'genre': data.series.genre || 'Phim Ngắn',
        'director': { '@type': 'Person', 'name': data.series.director || 'AI' },
        'actor': [{ '@type': 'Person', 'name': data.series.cast || 'AI' }]
      },
      {
        '@type': 'VideoObject',
        '@id': `https://www.ai2hero.com/film/${slug}#video`,
        'name': pageFullTitle,
        'description': summaryText,
        'thumbnailUrl': [currentEpisode?.thumbnailUrl || data.series.coverUrl],
        'uploadDate': data.series.createdAt ? new Date(data.series.createdAt).toISOString() : new Date().toISOString(),
        'contentUrl': currentEpisode?.videoUrl,
        'embedUrl': currentEpisode?.videoUrl,
        'hasPart': clipsSchema.length > 0 ? clipsSchema : undefined
      }
    ]
  };

  return (
    <>
      {/* Schema JSON-LD Structured Data for Google Video & Movie */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />

      <HeroFilmWatchClient
        series={data.series}
        episodes={data.episodes}
        initialEpisodeNumber={initialEpisodeNumber}
        initialBookmarked={data.isBookmarked}
        initialLiked={data.isLiked}
        userId={userId}
        isAdmin={user ? ['admin', 'owner'].includes(user.role) : false}
      />

      {/* SEO Article Content Section (Server Rendered) */}
      <section className="bg-[#050508] border-t border-white/10 py-12 px-4 md:px-8 text-gray-300">
        <article className="max-w-4xl mx-auto space-y-8 prose prose-invert">
          {/* Main Title H1 */}
          <div className="border-b border-rose-500/30 pb-4 space-y-2">
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
              {pageFullTitle}
            </h1>
            <p className="text-sm text-rose-400 font-medium">
              Thể loại: <span className="uppercase font-bold">{data.series.genre || 'Phim Ngắn'}</span> • Đạo diễn: {data.series.director || 'AI'} • Diễn viên: {data.series.cast || 'AI'}
            </p>
          </div>

          {/* H2: Thông Tin Tổng Quan */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 border-l-4 border-rose-500 pl-3">
              1. Thông Tin Tổng Quan Bộ Phim
            </h2>
            <p className="text-sm leading-relaxed text-gray-300">
              Bộ phim <strong className="text-white">{seriesTitle}</strong> là tác phẩm thuộc thể loại <span className="text-rose-300">{data.series.genre || 'Phim Ngắn'}</span> độc quyền được trình chiếu tại mạng xã hội HeroFilm. Phim sở hữu tổng cộng {data.series.totalEpisodes} tập với hình ảnh sắc nét, nội dung hấp dẫn và thông điệp ý nghĩa.
            </p>
          </div>

          {/* H2: Tóm Tắt Cốt Truyện */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 border-l-4 border-rose-500 pl-3">
              2. Tóm Tắt Kịch Bản & Cốt Truyện Nổi Bật (Synopsis)
            </h2>
            <div className="bg-white/[0.03] border border-white/10 p-5 rounded-2xl space-y-3">
              <h3 className="text-base font-bold text-rose-400">
                Nội dung chi tiết Tập {epNumber}
              </h3>
              <p className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
                {summaryText}
              </p>
            </div>
          </div>

          {/* H2: Timeline Key Moments */}
          {timelineItems.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 border-l-4 border-rose-500 pl-3">
                3. Diễn Biến Chi Tiết Theo Mốc Thời Gian (Timeline Key Moments)
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {timelineItems.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-start gap-3">
                    <span className="px-2 py-1 bg-rose-500/20 text-rose-400 text-xs font-mono font-bold rounded">
                      {item.time}
                    </span>
                    <span className="text-xs text-gray-300 font-medium">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* H2: Hướng dẫn xem phim */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <h2 className="text-lg font-bold text-white">
              4. Xem Phim {seriesTitle} Bản Chuẩn HD Vietsub Miễn Phí Tại HeroFilm
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Bạn có thể thưởng thức toàn bộ các tập phim của <strong className="text-gray-200">{seriesTitle}</strong> hoàn toàn miễn phí với tốc độ tải nhanh, không giật lag. Đừng quên bấm Like, chia sẻ và theo dõi kênh để cập nhật các tập phim mới nhất!
            </p>
          </div>
        </article>
      </section>
    </>
  );
}
