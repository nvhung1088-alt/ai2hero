'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { generateFilmUrl } from '@/lib/utils/film-url';
import { Play, Sparkles } from 'lucide-react';

export function FilmHeroCarousel({ featuredSeries }: { featuredSeries: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!featuredSeries || featuredSeries.length <= 1) return;
    const interval = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      setCurrentIndex((prev) => (prev + 1) % featuredSeries.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredSeries?.length]);

  if (!featuredSeries || featuredSeries.length === 0) return null;
  const series = featuredSeries[currentIndex];

  return (
    <div className="relative rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] w-full border border-white/5 bg-gray-900 shadow-2xl group">
      {featuredSeries.map((s, idx) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[15000ms] ease-out scale-100 group-hover:scale-105"
            style={{ backgroundImage: `url(${s.bannerUrl || s.coverUrl})` }}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-black/40 to-transparent z-20" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#08080c] via-black/60 to-transparent z-20" />

      {/* Banner content */}
      <div className="absolute bottom-0 left-0 p-6 md:p-12 max-w-3xl space-y-4 z-30">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] md:text-xs font-extrabold uppercase tracking-wider animate-pulse">
          <Sparkles className="h-3 w-3 md:h-4 md:w-4" /> Phim Nổi Bật
        </span>
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-white drop-shadow-2xl">
          {series.title}
        </h2>
        <p className="text-xs md:text-sm lg:text-base text-gray-300 font-medium line-clamp-2 md:line-clamp-3 leading-relaxed drop-shadow-md max-w-2xl">
          {series.description}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {Array.isArray(series.tags) &&
            (series.tags as string[]).slice(0, 4).map((tag, idx) => (
              <span key={idx} className="text-[10px] md:text-xs bg-white/10 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-md text-gray-200 font-medium">
                {tag}
              </span>
            ))}
        </div>
        <div className="pt-5 flex items-center gap-3 md:gap-4">
          <Link
            href={generateFilmUrl(series.slug || series.id.toString(), 1)}
            className="inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 bg-white hover:bg-gray-200 text-black rounded-full text-sm font-extrabold shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all active:scale-95 cursor-pointer"
          >
            <Play className="h-4 w-4 md:h-5 md:w-5 fill-black" /> Xem Ngay
          </Link>
          <Link href={generateFilmUrl(series.slug || series.id.toString(), 1)} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-500/30 hover:bg-gray-500/50 backdrop-blur-md text-white rounded-full text-sm font-bold border border-white/10 transition-all active:scale-95">
            Chi tiết
          </Link>
        </div>
      </div>

      {/* Indicators */}
      {featuredSeries.length > 1 && (
        <div className="absolute bottom-6 right-6 flex gap-2 z-30">
          {featuredSeries.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'w-8 bg-rose-500' : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
