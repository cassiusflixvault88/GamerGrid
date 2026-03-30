import React, { useState } from 'react';
import { getImageUrl } from '../services/tmdb';
import { Play, Star } from 'lucide-react';

const ContentCard = ({ content, onClick, rating }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const title = content.title || content.name;
  const posterPath = content.poster_path;
  
  // Use provided rating or default to vote_average
  const displayRating = rating?.average || content.vote_average || 0;
  const ratingCount = rating?.count || 0;

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
            src={getImageUrl(posterPath, 'w500')}
            alt={title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
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
