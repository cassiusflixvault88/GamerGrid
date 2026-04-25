import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import ContentCard from '../components/ContentCard';
import ContentModal from '../components/ContentModal';
import VideoPlayer from '../components/VideoPlayer';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';

const WatchlistPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedContent, setSelectedContent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);

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
            {watchlist.length} {watchlist.length === 1 ? 'game' : 'games'} saved
          </p>
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
          <div className="text-center py-20">
            <p className="text-white/70 text-lg mb-8">Your library is empty</p>
            <Button
              onClick={() => navigate('/games/all')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-8 py-6 rounded-md"
            >
              Browse Games
            </Button>
          </div>
        )}
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
