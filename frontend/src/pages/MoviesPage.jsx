import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ContentCard from '../components/ContentCard';
import ContentModal from '../components/ContentModal';
import VideoPlayer from '../components/VideoPlayer';
import { getPopular, getTopRated, getByGenre } from '../services/tmdb';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

const MoviesPage = () => {
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [action, setAction] = useState([]);
  const [comedy, setComedy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async () => {
    try {
      const [popularData, topRatedData, actionData, comedyData] = await Promise.all([
        getPopular('movie'),
        getTopRated('movie'),
        getByGenre(28, 'movie'), // Action
        getByGenre(35, 'movie'), // Comedy
      ]);

      setPopular(popularData);
      setTopRated(topRatedData);
      setAction(actionData);
      setComedy(comedyData);
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-24 px-6 lg:px-12 max-w-[1920px] mx-auto pb-20">
        <h1 className="text-4xl font-bold text-white mb-8">Movies</h1>

        <Tabs defaultValue="popular" className="w-full">
          <TabsList className="bg-white/10 border border-white/20 mb-8">
            <TabsTrigger value="popular" className="data-[state=active]:bg-purple-600">
              Popular
            </TabsTrigger>
            <TabsTrigger value="top-rated" className="data-[state=active]:bg-purple-600">
              Top Rated
            </TabsTrigger>
            <TabsTrigger value="action" className="data-[state=active]:bg-purple-600">
              Action
            </TabsTrigger>
            <TabsTrigger value="comedy" className="data-[state=active]:bg-purple-600">
              Comedy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="popular">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {popular.map((item) => (
                <ContentCard key={item.id} content={item} onClick={handleCardClick} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="top-rated">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {topRated.map((item) => (
                <ContentCard key={item.id} content={item} onClick={handleCardClick} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="action">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {action.map((item) => (
                <ContentCard key={item.id} content={item} onClick={handleCardClick} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="comedy">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {comedy.map((item) => (
                <ContentCard key={item.id} content={item} onClick={handleCardClick} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ContentModal
        content={selectedContent}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onPlayTrailer={handlePlayTrailer}
      />

      <VideoPlayer
        video={currentVideo}
        isOpen={videoPlayerOpen}
        onClose={() => {
          setVideoPlayerOpen(false);
          setCurrentVideo(null);
        }}
      />
    </div>
  );
};

export default MoviesPage;
