import { getBookmarkedSeriesAction } from '@/lib/db/film-actions';
import { getUser } from '@/lib/db/queries';
import { generateFilmUrl } from '@/lib/utils/film-url';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Film, ArrowLeft, Bookmark, Eye, Play } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function FilmBookmarksPage() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const bookmarkedSeries = await getBookmarkedSeriesAction();

  const getGenreLabel = (genreKey: string | null) => {
    switch (genreKey) {
      case 'romance':
        return 'Ngôn Tình';
      case 'action':
        return 'Chiến Thần';
      case 'drama':
        return 'Kịch Tính';
      case 'comedy':
        return 'Hài Hước';
      case 'thriller':
        return 'Gây Cấn';
      default:
        return 'Khác';
    }
  };

  return (
    <div className="min-h-screen bg-[#08080c] text-white p-4 sm:p-6 space-y-8 max-w-7xl mx-auto pb-24">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/film"
            className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-gray-300" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-rose-500 fill-rose-500" />
              Phim Đã Lưu
            </h1>
            <p className="text-xs text-gray-500 font-medium">Danh sách các bộ film bạn đã đánh dấu theo dõi</p>
          </div>
        </div>
      </div>

      {/* Grid List */}
      {bookmarkedSeries.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
          {bookmarkedSeries.map((series) => (
            <Link
              key={series.id}
              href={generateFilmUrl(series.slug || series.id.toString(), 1)}
              className="group space-y-3 cursor-pointer"
            >
              <div className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-white/5 bg-gray-900 shadow-lg transition-all duration-300 group-hover:border-rose-500/30 group-hover:shadow-rose-500/5 group-hover:-translate-y-1">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${series.coverUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="h-10 w-10 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30 text-white transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    <Play className="h-4.5 w-4.5 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Views Count Badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur px-2 py-0.5 rounded-lg text-[9px] font-bold text-gray-200 border border-white/5">
                  <Eye className="h-2.5 w-2.5" /> {series.viewCount.toLocaleString()}
                </div>

                {/* Total Episodes badge */}
                <div className="absolute bottom-2 right-2 bg-rose-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-md shadow-sm">
                  {series.totalEpisodes} Tập
                </div>
              </div>

              <div className="space-y-1 px-1">
                <h4 className="font-extrabold text-xs text-gray-200 group-hover:text-white line-clamp-1 transition-colors">
                  {series.title}
                </h4>
                <p className="text-[10px] text-gray-500 font-bold">{getGenreLabel(series.genre)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
          <Bookmark className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="font-bold text-base text-gray-300">Chưa lưu phim nào</h3>
          <p className="text-xs text-gray-500 mt-1">Hãy quay lại trang chủ Film và lưu bộ phim bạn thích nhé!</p>
          <Link
            href="/film"
            className="inline-flex items-center justify-center mt-6 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
          >
            Khám Phá Film
          </Link>
        </div>
      )}
    </div>
  );
}
