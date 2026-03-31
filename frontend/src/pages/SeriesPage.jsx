import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import ContentCard from '../components/ContentCard';
import ContentModal from '../components/ContentModal';
import VideoPlayer from '../components/VideoPlayer';
import Footer from '../components/Footer';
import { getPopular, getTopRated } from '../services/tmdb';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

const SeriesPage = () => {
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);

  useEffect(() => {
    loadSeries();
  }, []);

  const loadSeries = async () => {
    try {
      const [popularData, topRatedData] = await Promise.all([
        getPopular('tv'),
        getTopRated('tv'),
      ]);

      setPopular(popularData);
      setTopRated(topRatedData);
    } catch (error) {
      console.error('Error loading series:', error);
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <BackNavigation />
      
      <div className="px-6 lg:px-12 max-w-[1920px] mx-auto pb-20">
        <h1 className="text-4xl font-bold text-white mb-8">Series</h1>

        <Tabs defaultValue="popular" className="w-full">
          <TabsList className="bg-white/10 border border-white/20 mb-8">
            <TabsTrigger value="popular" className="data-[state=active]:bg-purple-600">
              Popular
            </TabsTrigger>
            <TabsTrigger value="top-rated" className="data-[state=active]:bg-purple-600">
              Top Rated
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
        </Tabs>
      </div>

      <Footer />

      {selectedContent && (
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
      )}

      {currentVideo && (
        <VideoPlayer
          video={currentVideo}
          isOpen={videoPlayerOpen}
          onClose={() => setVideoPlayerOpen(false)}
        />
      )}
    </div>
  );
};

export default SeriesPage;
