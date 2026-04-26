import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import ContentCard from '../components/ContentCard';
import ContentModal from '../components/ContentModal';
import VideoPlayer from '../components/VideoPlayer';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import { Bookmark, Play, Trash2, Film } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WatchlistPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedContent, setSelectedContent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [savedTrailers, setSavedTrailers] = useState([]);
  const [loadingTrailers, setLoadingTrailers] = useState(false);

  const loadSavedTrailers = useCallback(async () => {
    if (!user) return;
    setLoadingTrailers(true);
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`${API}/saved-trailers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedTrailers(r.data.trailers || []);
    } catch { /* silent */ } finally {
      setLoadingTrailers(false);
    }
  }, [user]);

  useEffect(() => { loadSavedTrailers(); }, [loadSavedTrailers]);

  const removeSavedTrailer = async (trailerId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/saved-trailers/${trailerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedTrailers(prev => prev.filter(t => t.id !== trailerId));
      toast({ title: 'Removed from your library' });
    } catch (e) {
      toast({ title: 'Could not remove', description: e.response?.data?.detail || 'Try again', variant: 'destructive' });
    }
  };

  const playSavedTrailer = (t) => {
    setCurrentVideo({ key: t.youtube_id, name: t.title, site: 'YouTube', type: 'Trailer' });
    setVideoPlayerOpen(true);
  };

  const handleCardClick = (content) => {
    setSelectedContent(content);
    setModalOpen(true);
  };

  const handlePlayTrailer = (video) => {
    setCurrentVideo(video);
    setVideoPlayerOpen(true);
    setModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <BackNavigation />
        <div className="px-6 lg:px-12 max-w-[1920px] mx-auto pb-20 flex flex-col items-center justify-center min-h-[70vh]">
          <h1 className="text-4xl font-bold text-white mb-4">Sign In Required</h1>
          <p className="text-white/70 text-lg mb-8">Please sign in to view your library</p>
          <Button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-8 py-6 rounded-md"
          >
            Go to Home
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const watchlist = user.watchlist || [];

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <BackNavigation />

      <div className="px-6 lg:px-12 max-w-[1920px] mx-auto pb-20">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">My Library</h1>
          <p className="text-white/70 text-lg">
            {watchlist.length} {watchlist.length === 1 ? 'game' : 'games'}
            {savedTrailers.length > 0 && ` · ${savedTrailers.length} saved trailer${savedTrailers.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {/* SAVED GAMES */}
        <section className="mb-12" data-testid="library-games-section">
          <div className="flex items-center gap-2 mb-4">
            <Bookmark className="w-5 h-5 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Saved Games</h2>
            <span className="text-white/50 text-sm">({watchlist.length})</span>
          </div>
          {watchlist.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {watchlist.map((item) => (
                <ContentCard
                  key={item.content_id}
                  content={{
                    id: item.content_id,
                    title: item.title,
                    name: item.title,
                    poster_path: item.poster_path,
                    media_type: item.media_type,
                  }}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-lg">
              <Bookmark className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 mb-4">Your saved-games shelf is empty</p>
              <Button
                onClick={() => navigate('/games/all')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                Browse Games
              </Button>
            </div>
          )}
        </section>

        {/* SAVED TRAILERS */}
        <section data-testid="library-trailers-section">
          <div className="flex items-center gap-2 mb-4">
            <Film className="w-5 h-5 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Saved Trailers</h2>
            <span className="text-white/50 text-sm">({savedTrailers.length})</span>
          </div>

          {loadingTrailers ? (
            <p className="text-white/40 text-sm">Loading…</p>
          ) : savedTrailers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-lg">
              <Film className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm">No saved trailers yet</p>
              <p className="text-white/30 text-xs mt-1">
                Open any game trailer and tap the purple <span className="text-purple-400 font-semibold">Save Trailer</span> button.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {savedTrailers.map(t => (
                <div
                  key={t.id}
                  className="group relative bg-black/40 rounded-lg overflow-hidden border border-white/10 hover:border-purple-500/50 transition-colors"
                  data-testid={`saved-trailer-${t.id}`}
                >
                  <button
                    onClick={() => playSavedTrailer(t)}
                    className="block w-full aspect-video bg-gradient-to-br from-purple-900/30 to-black relative"
                  >
                    {t.thumbnail && (
                      <img
                        src={t.thumbnail}
                        alt={t.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                      <Play className="w-12 h-12 text-white drop-shadow-lg" />
                    </div>
                  </button>
                  <div className="p-3">
                    <p className="text-white text-sm font-medium line-clamp-2" title={t.title}>{t.title}</p>
                    {t.game_title && (
                      <p className="text-white/50 text-xs mt-1 truncate">{t.game_title}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-white/30 text-xs">
                        {new Date(t.saved_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => removeSavedTrailer(t.id)}
                        className="text-white/40 hover:text-red-400 transition-colors p-1"
                        title="Remove"
                        data-testid={`remove-trailer-${t.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ContentModal
        content={selectedContent}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onPlayTrailer={handlePlayTrailer}
        onSelectContent={(content) => {
          setSelectedContent(content);
          setModalOpen(true);
        }}
      />

      <VideoPlayer
        video={currentVideo}
        isOpen={videoPlayerOpen}
        onClose={() => {
          setVideoPlayerOpen(false);
          setCurrentVideo(null);
        }}
      />

      <Footer />
    </div>
  );
};

export default WatchlistPage;
