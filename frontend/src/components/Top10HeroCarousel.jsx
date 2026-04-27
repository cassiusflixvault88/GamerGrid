import React, { useState, useEffect } from 'react';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { getImageUrl } from '../services/games';

/**
 * Top 10 hero carousel — Netflix/PS-Store-style: a giant rotating hero banner
 * with the current rank number rendered as bold backdrop text. Auto-rotates
 * every 6s; user can navigate with prev/next or the bottom dots.
 */
const Top10HeroCarousel = ({ items = [], onPlayClick, onInfoClick, intervalMs = 6000 }) => {
  const [idx, setIdx] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!items.length || items.length <= 1) return undefined;
    const t = setInterval(() => {
      setIdx((p) => (p + 1) % items.length);
      setImageLoaded(false);
    }, intervalMs);
    return () => clearInterval(t);
  }, [items, intervalMs]);

  if (!items.length) return null;

  const current = items[idx];
  if (!current) return null;
  const title = current.title || current.name;
  const overview = current.overview;
  const rank = idx + 1;

  const go = (delta) => {
    setIdx((p) => (p + delta + items.length) % items.length);
    setImageLoaded(false);
  };

  return (
    <div className="relative h-[88vh] w-full overflow-hidden bg-black" data-testid="top10-hero">
      <div
        key={current.id}
        className={`absolute inset-0 transition-opacity duration-700 ${
          imageLoaded ? 'opacity-100' : 'opacity-30'
        }`}
      >
        <img
          src={getImageUrl(current.backdrop_path || current.poster_path, 'original')}
          alt={title}
          className="w-full h-full object-cover"
          onLoad={() => setImageLoaded(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
      </div>

      <div className="relative h-full max-w-[1920px] mx-auto px-6 lg:px-12 flex items-center">
        <div className="w-full">
          <div className="max-w-2xl space-y-4 pb-10 lg:pb-16">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="/top10"
                className="text-purple-300 hover:text-purple-200 font-bold tracking-widest text-sm uppercase transition-colors"
              >
                🏆 #{rank} in Top 10 Games Today →
              </a>
              {rank <= 3 && (
                <span className="px-2 py-0.5 rounded-full bg-red-600/30 border border-red-500/60 text-red-200 text-[10px] font-bold tracking-wider uppercase animate-pulse">
                  🔥 Hot Right Now
                </span>
              )}
            </div>
            <h1 className="text-4xl lg:text-6xl font-extrabold text-white drop-shadow-2xl line-clamp-2">
              {title}
            </h1>
            {current.developer && (
              <p className="text-white/70 text-base">
                by <span className="text-white font-semibold">{current.developer}</span>
              </p>
            )}
            <p className="text-base lg:text-lg text-white/85 line-clamp-3 drop-shadow-lg">
              {overview}
            </p>
            <div className="flex items-center space-x-3 pt-2 flex-wrap gap-y-2">
              <Button
                onClick={() => onPlayClick && onPlayClick(current)}
                data-testid="top10-play"
                className="bg-white hover:bg-white/90 text-black font-semibold px-7 py-5 text-base rounded-md transition-all hover:scale-105"
              >
                <Play className="w-5 h-5 mr-2 fill-current" />
                Play Trailer
              </Button>
              <Button
                onClick={() => onInfoClick && onInfoClick(current)}
                variant="outline"
                className="bg-white/15 hover:bg-white/25 text-white border-white/40 backdrop-blur-sm font-semibold px-7 py-5 text-base rounded-md transition-all hover:scale-105"
              >
                <Info className="w-5 h-5 mr-2" />
                More Info
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={() => go(-1)}
        data-testid="top10-prev"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/70 backdrop-blur-sm rounded-full p-3 transition-all border border-white/20 hidden md:block"
        aria-label="Previous game"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={() => go(1)}
        data-testid="top10-next"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/70 backdrop-blur-sm rounded-full p-3 transition-all border border-white/20 hidden md:block"
        aria-label="Next game"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10" data-testid="top10-dots">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setIdx(i);
              setImageLoaded(false);
            }}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
            }`}
            aria-label={`Go to #${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Top10HeroCarousel;
