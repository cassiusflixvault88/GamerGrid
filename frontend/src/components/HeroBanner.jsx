import React, { useState, useEffect } from 'react';
import { Play, Info } from 'lucide-react';
import { Button } from './ui/button';
import { getImageUrl } from '../services/games';

const HeroBanner = ({ content, onPlayClick, onInfoClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!content) return null;

  const title = content.title || content.name;
  const overview = content.overview;

  return (
    <div className="relative h-[85vh] w-full overflow-hidden">
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <img
          src={getImageUrl(content.backdrop_path, 'original')}
          alt={title}
          className="w-full h-full object-cover"
          onLoad={() => setImageLoaded(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      <div className="relative h-full max-w-[1920px] mx-auto px-6 lg:px-12 flex items-center">
        <div className="max-w-2xl space-y-6 mt-12">
          <h1 className="text-5xl lg:text-7xl font-bold text-white drop-shadow-2xl">
            {title}
          </h1>
          <p className="text-lg lg:text-xl text-white/90 line-clamp-3 drop-shadow-lg">
            {overview}
          </p>
          <div className="flex items-center space-x-4 pt-4">
            <Button
              onClick={() => onPlayClick(content)}
              className="bg-white hover:bg-white/90 text-black font-semibold px-8 py-6 text-lg rounded-md transition-all hover:scale-105"
            >
              <Play className="w-6 h-6 mr-2 fill-current" />
              Play Trailer
            </Button>
            <Button
              onClick={() => onInfoClick(content)}
              variant="outline"
              className="bg-white/20 hover:bg-white/30 text-white border-white/40 backdrop-blur-sm font-semibold px-8 py-6 text-lg rounded-md transition-all hover:scale-105"
            >
              <Info className="w-6 h-6 mr-2" />
              More Info
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
