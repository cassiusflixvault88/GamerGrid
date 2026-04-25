import React, { useEffect, useState } from 'react';
import { X, Play, Plus, ThumbsUp, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { getImageUrl, getDetails, getVideos } from '../services/tmdb';
import { Badge } from './ui/badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import RatingsReviews from './RatingsReviews';
import ShareButtons from './ShareButtons';

const ContentModal = ({ content, isOpen, onClose, onPlayTrailer, onSelectContent }) => {
  const [details, setDetails] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [localInWatchlist, setLocalInWatchlist] = useState(false);
  
  const { user, addToWatchlist, removeFromWatchlist, isInWatchlist } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (content && isOpen) {
      setShowFullOverview(false); // Reset when opening new content
      setLocalInWatchlist(user && isInWatchlist(content.id)); // Update local state
      loadDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, isOpen, user, user?.watchlist]);

  const loadDetails = async () => {
    if (!content) return;
    
    setLoading(true);
    try {
      const mediaType = content.media_type || (content.title ? 'movie' : 'tv');
      const [detailsData, videosData] = await Promise.all([
        getDetails(mediaType, content.id),
        getVideos(mediaType, content.id),
      ]);
      setDetails(detailsData);
      setVideos(videosData);
    } catch (error) {
      console.error('Error loading details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWatchlistToggle = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to add items to your watchlist',
        variant: 'destructive',
      });
      return;
    }

    try {
      const currentlyInWatchlist = isInWatchlist(content.id);
      
      if (currentlyInWatchlist) {
        await removeFromWatchlist(content.id);
        setLocalInWatchlist(false); // Update local state immediately
        toast({
          title: 'Removed from watchlist',
          description: `${title} has been removed from your watchlist`,
        });
      } else {
        await addToWatchlist(content);
        setLocalInWatchlist(true); // Update local state immediately
        toast({
          title: 'Added to watchlist',
          description: `${title} has been added to your watchlist`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update watchlist',
        variant: 'destructive',
      });
    }
  };

  const handleLike = () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to like content',
        variant: 'destructive',
      });
      return;
    }

    setLiked(!liked);
    toast({
      title: liked ? 'Removed like' : 'Liked!',
      description: liked ? `You unliked ${title}` : `You liked ${title}`,
    });
  };

  if (!content) return null;

  const title = content.title || content.name;
  const trailer = videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
  const releaseYear = (content.release_date || content.first_air_date || '').split('-')[0];
  const runtime = details?.runtime || details?.episode_run_time?.[0];
  
  // Check if this is a free movie (YouTube OR Plex)
  const hasFreeFullMovie = content.is_public_domain && content.youtube_id;
  const hasPlexMovie = content.plex_url && content.source === 'plex';
  const hasArchiveVideo = content.video_url && content.source === 'archive.org';
  
  // Show either YouTube OR Plex button
  const showFreeMovieButton = hasFreeFullMovie || hasPlexMovie || hasArchiveVideo;

  // Debug logging
  console.log('ContentModal - Free Movie Check:', {
    title,
    is_public_domain: content.is_public_domain,
    youtube_id: content.youtube_id,
    plex_url: content.plex_url,
    source: content.source,
    hasFreeFullMovie,
    hasPlexMovie,
    hasArchiveVideo,
    showFreeMovieButton
  });

  const handlePlayFullMovie = () => {
    console.log('Playing full movie:', title, content.youtube_id || content.plex_url);
    if (hasFreeFullMovie) {
      // Play full movie from YouTube (embedded)
      onPlayTrailer({ key: content.youtube_id, name: `${title} - Full Movie`, type: 'Feature' });
    } else if (hasPlexMovie) {
      // Open in Plex
      console.log('Opening Plex URL:', content.plex_url);
      window.open(content.plex_url, '_blank');
    } else if (hasArchiveVideo) {
      // Play from Archive.org
      window.open(content.video_url, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-[#141414] border-0 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <DialogTitle className="sr-only">{title || 'Content details'}</DialogTitle>
        <div className="relative">
          {/* Backdrop Image - Smaller on mobile */}
          <div className="relative w-full h-[40vh] md:h-[50vh] lg:aspect-video">
            <img
              src={getImageUrl(content.backdrop_path || content.poster_path, 'original')}
              alt={title}
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/50 to-transparent" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-8">
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 md:mb-4">{title}</h2>
              <div className="flex items-center space-x-2 md:space-x-3">
                {/* For Plex movies: Show BOTH trailer AND Plex button */}
                {hasPlexMovie && trailer ? (
                  <>
                    {/* Trailer Button */}
                    <Button
                      onClick={() => onPlayTrailer(trailer)}
                      className="flex-1 bg-white/20 hover:bg-white/30 text-white font-semibold px-6 py-2 rounded-md transition-all flex items-center gap-2 border border-white/40"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <div className="flex flex-col items-start">
                        <span>Play Trailer</span>
                        <span className="text-xs opacity-70">~2-3 min</span>
                      </div>
                    </Button>
                    
                    {/* Plex Full Movie Button */}
                    <Button
                      onClick={handlePlayFullMovie}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-md transition-all flex items-center gap-2"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <div className="flex flex-col items-start">
                        <span>Watch FREE on Plex ▶</span>
                        <span className="text-xs opacity-70">Free with Ads</span>
                      </div>
                    </Button>
                  </>
                ) : showFreeMovieButton ? (
                  /* YouTube/Archive embedded - just one button */
                  <Button
                    onClick={handlePlayFullMovie}
                    className="bg-white hover:bg-white/90 text-black font-semibold px-6 py-2 rounded-md transition-all flex items-center gap-2"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <div className="flex flex-col items-start">
                      <span>
                        {hasFreeFullMovie && 'Watch Full Movie FREE'}
                        {hasArchiveVideo && !hasFreeFullMovie && 'Watch Full Movie FREE'}
                      </span>
                      <span className="text-xs opacity-70">
                        {hasFreeFullMovie && 'Public Domain • Full Length'}
                        {hasArchiveVideo && 'Internet Archive'}
                      </span>
                    </div>
                  </Button>
                ) : trailer ? (
                  <Button
                    onClick={() => onPlayTrailer(trailer)}
                    className="bg-white hover:bg-white/90 text-black font-semibold px-6 py-2 rounded-md transition-all flex items-center gap-2"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <div className="flex flex-col items-start">
                      <span>Play Trailer</span>
                      <span className="text-xs opacity-70">~2-3 min</span>
                    </div>
                  </Button>
                ) : (
                  <Button
                    disabled
                    className="bg-gray-600 text-white font-semibold px-6 py-2 rounded-md opacity-50 cursor-not-allowed"
                  >
                    <span>No Trailer Available</span>
                  </Button>
                )}
                <button 
                  onClick={handleWatchlistToggle}
                  className={`backdrop-blur-sm rounded-full p-2 border transition-all ${
                    localInWatchlist 
                      ? 'bg-white text-black border-white' 
                      : 'bg-white/20 hover:bg-white/30 text-white border-white/40'
                  }`}
                  title={localInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  {localInWatchlist ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <Plus className="w-6 h-6" />
                  )}
                </button>
                <button 
                  onClick={handleLike}
                  className={`backdrop-blur-sm rounded-full p-2 border transition-all ${
                    liked 
                      ? 'bg-white text-black border-white' 
                      : 'bg-white/20 hover:bg-white/30 text-white border-white/40'
                  }`}
                  title={liked ? 'Unlike' : 'Like'}
                >
                  <ThumbsUp className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-green-500 font-semibold">
                {Math.round((content.vote_average || 0) * 10)}% Match
              </span>
              {releaseYear && <span className="text-white/70">{releaseYear}</span>}
              {runtime && (
                <span className="text-white/70">
                  {runtime > 60 ? `${Math.floor(runtime / 60)}h ${runtime % 60}m` : `${runtime}m`}
                </span>
              )}
              <Badge variant="outline" className="text-white/70 border-white/30">
                HD
              </Badge>
            </div>

            {/* Movie Description with More/Less toggle */}
            <div className="space-y-2">
              <p className="text-white/90 text-base leading-relaxed">
                {content.overview && content.overview.length > 180 ? (
                  <>
                    {showFullOverview ? content.overview : `${content.overview.slice(0, 180)}...`}
                    <button
                      onClick={() => setShowFullOverview(!showFullOverview)}
                      className="ml-2 text-white font-semibold hover:underline focus:outline-none"
                    >
                      {showFullOverview ? 'Less' : 'More'}
                    </button>
                  </>
                ) : (
                  content.overview
                )}
              </p>
            </div>

            {(details?.genres && details.genres.length > 0) && (
              <div className="flex items-start space-x-2">
                <span className="text-white/50 text-sm">Genres:</span>
                <span className="text-white/90 text-sm">
                  {details.genres.map((g) => (typeof g === 'string' ? g : g.name)).join(', ')}
                </span>
              </div>
            )}

            {(content.platforms && content.platforms.length > 0) && (
              <div className="flex items-start space-x-2 flex-wrap gap-2">
                <span className="text-white/50 text-sm">Platforms:</span>
                {content.platforms.map((p) => (
                  <Badge key={p} variant="outline" className="text-white/80 border-white/30 text-xs">{p}</Badge>
                ))}
              </div>
            )}

            {(details?.developers && details.developers.length > 0) && (
              <div className="flex items-start space-x-2">
                <span className="text-white/50 text-sm">Developer:</span>
                <span className="text-white/90 text-sm">{details.developers.join(', ')}</span>
              </div>
            )}
            {(details?.publishers && details.publishers.length > 0) && (
              <div className="flex items-start space-x-2">
                <span className="text-white/50 text-sm">Publisher:</span>
                <span className="text-white/90 text-sm">{details.publishers.join(', ')}</span>
              </div>
            )}

            {(content.metacritic_aggregate || details?.metacritic_aggregate) && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="px-3 py-1 rounded bg-yellow-600/20 border border-yellow-500/40 text-yellow-300 text-sm font-bold">
                  Metacritic / Critic Score: {Math.round(details?.metacritic_aggregate || content.metacritic_aggregate)}
                </div>
                <div className="px-3 py-1 rounded bg-green-600/20 border border-green-500/40 text-green-300 text-sm font-bold">
                  IGDB User Score: {content.vote_average}/10
                </div>
              </div>
            )}

            {details?.buy_links && details.buy_links.length > 0 && (
              <div className="pt-2">
                <p className="text-white/50 text-sm mb-2">Where to play / buy:</p>
                <div className="flex flex-wrap gap-2" data-testid="buy-links">
                  {details.buy_links.map((b) => {
                    const colors = {
                      steam: 'bg-blue-600/20 border-blue-500/40 text-blue-200 hover:bg-blue-600/40',
                      epicgames: 'bg-gray-700/40 border-gray-500/40 text-gray-100 hover:bg-gray-700/60',
                      gog: 'bg-purple-700/30 border-purple-500/40 text-purple-200 hover:bg-purple-700/50',
                      itch: 'bg-pink-600/20 border-pink-500/40 text-pink-200 hover:bg-pink-600/40',
                      official: 'bg-white/10 border-white/30 text-white hover:bg-white/20',
                      psn: 'bg-blue-700/30 border-blue-400/50 text-blue-100 hover:bg-blue-700/50',
                      xbox: 'bg-green-700/30 border-green-500/40 text-green-100 hover:bg-green-700/50',
                      nintendo: 'bg-red-700/30 border-red-500/40 text-red-100 hover:bg-red-700/50',
                      amazon: 'bg-orange-600/20 border-orange-500/40 text-orange-200 hover:bg-orange-600/40',
                    };
                    const cls = colors[b.kind] || 'bg-white/10 border-white/30 text-white hover:bg-white/20';
                    return (
                      <a
                        key={b.kind}
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`buy-link-${b.kind}`}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${cls}`}
                      >
                        {b.label} →
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {details?.credits?.cast && details.credits.cast.length > 0 && (
              <div className="flex items-start space-x-2">
                <span className="text-white/50 text-sm">Cast:</span>
                <span className="text-white/90 text-sm">
                  {details.credits.cast
                    .slice(0, 4)
                    .map((c) => c.name)
                    .join(', ')}
                </span>
              </div>
            )}

            {(content.screenshots && content.screenshots.length > 0) && (
              <div className="pt-4">
                <h3 className="text-xl font-semibold text-white mb-4">Screenshots</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {content.screenshots.slice(0, 10).map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Screenshot ${i + 1}`}
                      className="h-40 w-auto rounded-md object-cover flex-shrink-0 border border-white/10"
                      loading="lazy"
                    />
                  ))}
                </div>
              </div>
            )}

            {videos && videos.length > 1 && (
              <div className="pt-4">
                <h3 className="text-xl font-semibold text-white mb-4">Gameplay Trailers</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {videos.slice(0, 6).map((v) => (
                    <button
                      key={v.key || v.id}
                      onClick={() => onPlayTrailer(v)}
                      className="group relative aspect-video rounded-md overflow-hidden bg-black/40 hover:ring-2 hover:ring-purple-500 transition-all"
                    >
                      <img
                        src={`https://img.youtube.com/vi/${v.key}/hqdefault.jpg`}
                        alt={v.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white fill-current" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                        <p className="text-white text-xs line-clamp-2">{v.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Social Sharing */}
            <div className="pt-4">
              <p className="text-white/70 text-sm mb-3">Share with friends:</p>
              <ShareButtons content={content} />
            </div>

            <Separator className="bg-white/10 my-6" />

            {/* Ratings & Reviews Section (Rotten Tomatoes Style) */}
            <RatingsReviews contentId={content.id} contentTitle={title} />

            {(() => {
              const similarList = Array.isArray(details?.similar)
                ? details.similar
                : (details?.similar?.results || []);
              if (!similarList.length) return null;
              return (
              <div className="pt-4">
                <h3 className="text-xl font-semibold text-white mb-4">More Like This</h3>
                <div className="grid grid-cols-3 gap-4">
                  {similarList.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onClose();
                        setTimeout(() => {
                          if (onSelectContent) {
                            onSelectContent(item);
                          }
                        }, 300);
                      }}
                      className="relative aspect-video rounded-md overflow-hidden cursor-pointer hover:scale-105 hover:ring-2 hover:ring-white/40 transition-all"
                    >
                      <img
                        src={getImageUrl(item.backdrop_path || item.poster_path, 'w500')}
                        alt={item.title || item.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                        <p className="text-white text-xs font-medium line-clamp-2">
                          {item.title || item.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              );
            })()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContentModal;
