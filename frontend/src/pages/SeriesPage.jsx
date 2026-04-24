import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import ContentCard from '../components/ContentCard';
import ContentModal from '../components/ContentModal';
import VideoPlayer from '../components/VideoPlayer';
import Footer from '../components/Footer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SeriesPage = () => {
  const [allSeries, setAllSeries] = useState([]);
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
      // Load more items to get series (they start after movies in catalog)
      const response = await fetch(`${API_URL}/api/catalog/movies?limit=2000&page=1`);
      const data = await response.json();
      const allItems = data.results || [];
      
      // Filter only TV series
      const series = allItems.filter(item => item.media_type === 'tv');
      console.log(`📺 Loaded ${series.length} TV series from catalog`);
      
      setAllSeries(series);
      
      // Sort by rating for Top Rated tab
      const sortedByRating = [...series].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      setTopRated(sortedByRating);
      
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📺 All TV Series</h1>
          <p className="text-white/60">Discover thousands of games</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-white/10 border border-white/20 mb-8">
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">
              All Series
            </TabsTrigger>
            <TabsTrigger value="top-rated" className="data-[state=active]:bg-purple-600">
              Top Rated
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {allSeries.map((item) => (
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
        />
      )}

      {videoPlayerOpen && currentVideo && (
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
