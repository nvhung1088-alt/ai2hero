'use client';
import { useRef } from 'react';
import Link from 'next/link';
import { generateFilmUrl } from '@/lib/utils/film-url';
import { Play, Eye, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { HASHTAGS } from '@/lib/utils/film-constants';

const formatDuration = (sec: any) => {
  const num = Number(sec);
  if (isNaN(num) || num <= 0) return '2:30';
  const m = Math.floor(num / 60);
  const s = Math.floor(num % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export function FilmHorizontalList({ title, seriesList }: { title: string; seriesList: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth / 1.5 : clientWidth / 1.5;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!seriesList || seriesList.length === 0) return null;

  return (
    <div className="space-y-4 relative group">
      <h3 className="text-xl font-bold text-white px-2 flex items-center justify-between">
        {title}
        <div className="flex gap-2">
          <button onClick={() => scroll('left')} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 hidden sm:block">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => scroll('right')} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </h3>
      
      <div 
        ref={scrollRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-6 pt-2 scrollbar-hide snap-x px-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {seriesList.map((series) => (
          <Link
            key={series.id}
            href={generateFilmUrl(series.slug || series.id.toString(), 1)}
            className="group/card flex-none w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] space-y-3 cursor-pointer snap-start shrink-0 outline-none"
          >
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-white/5 bg-gray-900 shadow-lg transition-all duration-300 group-hover/card:border-rose-500/50 group-hover/card:shadow-[0_8px_30px_rgb(244,63,94,0.2)] group-hover/card:-translate-y-2">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/card:scale-110"
                style={{ backgroundImage: `url(${series.coverUrl})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
              <div className="absolute inset-0 bg-black/10 group-hover/card:bg-black/40 transition-colors" />

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                <div className="h-12 w-12 rounded-full bg-rose-500 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.5)] text-white transform scale-50 group-hover/card:scale-100 transition-all duration-300 ease-out">
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
              <h4 className="font-extrabold text-sm text-gray-200 group-hover/card:text-white line-clamp-2 transition-colors leading-tight">
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
    </div>
  );
}
