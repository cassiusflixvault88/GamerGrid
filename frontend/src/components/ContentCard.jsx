import React, { useState } from 'react';
import { getImageUrl } from '../services/tmdb';
import { Play, Star, CheckCircle, ExternalLink } from 'lucide-react';

const ContentCard = ({ content, onClick, rating }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const title = content.title || content.name;
  const posterPath = content.poster_path;
  
  // Use provided rating or default to vote_average
  const displayRating = rating?.average || content.vote_average || 0;
  const ratingCount = rating?.count || 0;

  // Compact platform abbreviations for always-visible card badges
  const platformAbbr = (() => {
    const plats = content.platforms || [];
    if (!plats.length) return [];
    const abbr = new Set();
    for (const p of plats) {
      const lower = p.toLowerCase();
      if (lower.includes('playstation 5') || lower === 'ps5') abbr.add('PS5');
      else if (lower.includes('playstation 4') || lower === 'ps4') abbr.add('PS4');
      else if (lower.includes('playstation')) abbr.add('PS');
      else if (lower.includes('xbox series')) abbr.add('XSX');
      else if (lower.includes('xbox one')) abbr.add('XB1');
      else if (lower.includes('xbox')) abbr.add('XBOX');
      else if (lower.includes('switch') || lower.includes('nintendo')) abbr.add('SWITCH');
      else if (lower.includes('pc') || lower.includes('windows') || lower.includes('mac')) abbr.add('PC');
    }
    return Array.from(abbr).slice(0, 3);
  })();
  
  // Determine availability status
  const isFreeMovie = content.free_full_movie || content.source === 'youtube' || content.source === 'plex';
  const hasYouTube = content.youtube_id;
  const hasPlexUrl = content.plex_url;
  const canWatchNow = hasYouTube || hasPlexUrl;

  // Fallback poster - simple gradient with title
  const fallbackPoster = `data:image/svg+xml,%3Csvg width='500' height='750' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:rgb(88,28,135);stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:rgb(30,58,138);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='500' height='750' fill='url(%23grad)'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='32' font-weight='bold' fill='white' fill-opacity='0.9'%3E${encodeURIComponent(title || 'No Image')}%3C/text%3E%3C/svg%3E`;

  return (
    <div
      className="flex-shrink-0 w-[200px] lg:w-[240px] cursor-pointer transition-all duration-300 ease-out"
      onClick={() => onClick(content)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative rounded-lg overflow-hidden transition-all duration-300 ${
          isHovered ? 'scale-105 shadow-2xl ring-2 ring-white/20' : ''
        }`}
      >
        <div className="relative aspect-[2/3] bg-gray-800">
          <img
            src={imageError ? fallbackPoster : getImageUrl(posterPath, 'w500')}
            alt={title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
          />
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
          
          {/* Rating Badge (Rotten Tomatoes style) */}
          {displayRating > 0 && (
            <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm rounded-md px-2 py-1 flex items-center space-x-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-white font-bold text-sm">
                {displayRating.toFixed(1)}
              </span>
              {ratingCount > 0 && (
                <span className="text-white/60 text-xs">({ratingCount})</span>
              )}
            </div>
          )}
          
          {/* Availability Badge */}
          {canWatchNow && (
            <div className="absolute top-2 right-2 bg-green-600/90 backdrop-blur-sm rounded-md px-2 py-1 flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-white" />
              <span className="text-white font-bold text-xs">
                {hasYouTube ? 'FREE' : 'FREE ON PLEX'}
              </span>
            </div>
          )}
          
          {hasPlexUrl && !hasYouTube && (
            <div className="absolute bottom-2 right-2">
              <ExternalLink className="w-4 h-4 text-white/70" />
            </div>
          )}

          {/* Platform abbreviation badges */}
          {platformAbbr.length > 0 && (
            <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 max-w-[90%]">
              {platformAbbr.map((p) => (
                <span
                  key={p}
                  className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider border border-white/20"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
          
          {isHovered && (
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex items-center justify-center">
              <div className="bg-white/90 rounded-full p-3 transform transition-transform hover:scale-110">
                <Play className="w-6 h-6 text-black fill-current" />
              </div>
            </div>
          )}
        </div>
        
        {isHovered && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
            <p className="text-white text-sm font-semibold line-clamp-2">{title}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentCard;
