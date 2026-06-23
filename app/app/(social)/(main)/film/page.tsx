import { getViewerSeriesAction, seedInitialFilmsAction } from '@/lib/db/film-actions';
import { getUser, getSystemSetting } from '@/lib/db/queries';
import Link from 'next/link';
import { Play, Film, Sparkles, Compass, Eye, Heart, Search, Bookmark, Clock } from 'lucide-react';
import { generateFilmUrl } from '@/lib/utils/film-url';
import { HASHTAGS } from '@/lib/utils/film-constants';
import { Metadata } from 'next';
import { FilmFooter } from '@/components/film/film-footer';
import { FilmHeroCarousel } from '@/components/film/film-hero-carousel';
import { FilmHorizontalList } from '@/components/film/film-horizontal-list';

export const metadata: Metadata = {
  title: 'Khám Phá Film - HeroFilm',
  description: 'Khám phá hàng ngàn bộ film đặc sắc, độc quyền trên nền tảng mạng xã hội HeroFilm.',
  openGraph: {
    title: 'Khám Phá Film - HeroFilm',
    description: 'Khám phá hàng ngàn bộ film đặc sắc, độc quyền trên nền tảng mạng xã hội HeroFilm.',
    siteName: 'HeroFilm',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

const formatDuration = (sec: any) => {
  const num = Number(sec);
  if (isNaN(num) || num <= 0) return '2:30';
  const m = Math.floor(num / 60);
  const s = Math.floor(num % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default async function FilmDiscoverPage({
  searchParams
}: {
  searchParams: Promise<{ genre?: string; q?: string }>;
}) {
  const { genre = 'all', q = '' } = await searchParams;
  
  const user = await getUser();

  // Fetch series list based on search/genre filters
  let seriesList = await getViewerSeriesAction(genre, q);

  // If database is empty, seed mock data automatically so user has content to view immediately
  if (seriesList.length === 0 && !genre && !q) {
    // Seed using a default teamId (e.g. 1 or search for first team in DB)
    // Here we'll just seed a default set of public films
    await seedInitialFilmsAction(1);
    seriesList = await getViewerSeriesAction(genre, q);
  }

  // Cấu trúc Data cho giao diện Netflix-style
  const featuredSeriesList = seriesList.filter((s) => s.isFeatured).slice(0, 5);
  // Nếu ko có featured, bốc 5 phim có view cao nhất
  if (featuredSeriesList.length === 0) {
    featuredSeriesList.push(...[...seriesList].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5));
  }

  const popularSeries = [...seriesList].sort((a, b) => b.viewCount - a.viewCount).slice(0, 15);
  const newSeries = [...seriesList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 15);
  const romanceSeries = seriesList.filter(s => s.genre === 'romance' || s.genre === 'drama');
  const actionSeries = seriesList.filter(s => s.genre === 'action' || s.genre === 'thriller' || s.genre === 'crime');

  const genres = HASHTAGS;

  return (
    <div className="min-h-screen bg-[#08080c] text-white p-4 sm:p-6 space-y-8 max-w-7xl mx-auto pb-24">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-500 to-red-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Film className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
              Film
            </h1>
            <p className="text-xs text-gray-500 font-medium">Khám phá vũ trụ phim dọc ReelShort/DramaBox độc quyền</p>
          </div>
        </div>

        {/* Action Controls: Search & Bookmark */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <form className="relative flex-1 sm:w-64">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Tìm phim..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 pl-10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/50 transition-colors"
            />
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-gray-500" />
            {genre !== 'all' && <input type="hidden" name="genre" value={genre} />}
          </form>

          {user && (
            <Link
              href="/film/bookmarks"
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 rounded-xl text-xs font-extrabold text-gray-300 hover:text-white transition-all shrink-0 cursor-pointer h-[34px]"
            >
              <Bookmark className="h-3.5 w-3.5" /> Phim Đã Lưu
            </Link>
          )}
        </div>
      </div>

      {/* Featured Banner Carousel */}
      {!q && featuredSeriesList.length > 0 && (
        <FilmHeroCarousel featuredSeries={featuredSeriesList} />
      )}

      {/* Genre Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-2">
        {genres.map((g) => (
          <Link
            key={g.key}
            href={`/film?genre=${g.key}${q ? `&q=${q}` : ''}`}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all border cursor-pointer select-none ${
              genre === g.key
                ? 'bg-gradient-to-tr from-rose-500 to-red-500 border-rose-500 text-white shadow-md shadow-rose-500/10'
                : 'bg-white/5 border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/10'
            }`}
          >
            {g.label}
          </Link>
        ))}
      </div>

      {/* Film Lists / Grid */}
      {seriesList.length > 0 ? (
        <div className="space-y-12">
          {q || genre !== 'all' ? (
            /* Search/Filter Mode: Render Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {seriesList.map((series) => (
                <Link
                  key={series.id}
                  href={generateFilmUrl(series.slug || series.id.toString(), 1)}
                  className="group space-y-3 cursor-pointer outline-none"
                >
                  <div className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-white/5 bg-gray-900 shadow-lg transition-all duration-300 group-hover:border-rose-500/50 group-hover:-translate-y-2 group-hover:shadow-[0_8px_30px_rgb(244,63,94,0.2)]">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url(${series.coverUrl})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/40 transition-colors" />

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="h-12 w-12 rounded-full bg-rose-500 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.5)] text-white transform scale-50 group-hover:scale-100 transition-transform duration-300 ease-out">
                        <Play className="h-5 w-5 fill-white ml-1" />
                      </div>
                    </div>

                    {/* Views Count Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-gray-200 border border-white/10">
                      <Eye className="h-3 w-3" /> {series.viewCount.toLocaleString()}
                    </div>

                    {/* Total Episodes badge */}
                    <div className="absolute bottom-2 right-2 flex flex-col gap-1 items-end">
                      <div className="bg-rose-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-sm">
                        {series.totalEpisodes} Tập
                      </div>
                      {(series as any).duration !== undefined && (
                        <div className="bg-black/60 backdrop-blur text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1 border border-white/10">
                          <Clock className="w-2.5 h-2.5" /> {formatDuration((series as any).duration || 150)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 px-1">
                    <h4 className="font-extrabold text-sm text-gray-200 group-hover:text-white line-clamp-2 transition-colors leading-tight">
                      {series.title}
                    </h4>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-500 font-bold">{HASHTAGS.find(h => h.key === series.genre)?.label || 'Khác'}</p>
                      {series.totalFreeEpisodes > 0 && (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                          Free {series.totalFreeEpisodes}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* Home Mode: Render Netflix-style horizontal rows */
            <div className="space-y-14">
              <FilmHorizontalList title="Top Phim Thịnh Hành" seriesList={popularSeries} />
              <FilmHorizontalList title="Mới Cập Nhật" seriesList={newSeries} />
              
              {/* Theo từng genre */}
              {romanceSeries.length > 0 && <FilmHorizontalList title="Lãng mạn & Ngôn tình" seriesList={romanceSeries} />}
              {actionSeries.length > 0 && <FilmHorizontalList title="Hành động & Kịch tính" seriesList={actionSeries} />}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
          <Film className="h-16 w-16 text-gray-600 mx-auto mb-5 opacity-50" />
          <h3 className="font-extrabold text-xl text-gray-300">Không tìm thấy phim</h3>
          <p className="text-sm text-gray-500 mt-2">Hãy thử tìm với từ khóa hoặc danh mục khác</p>
        </div>
      )}

      <FilmFooter />
    </div>
  );
}
