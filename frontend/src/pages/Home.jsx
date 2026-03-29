import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HeroBanner from '../components/HeroBanner';
import ContentRow from '../components/ContentRow';
import ContentModal from '../components/ContentModal';
import VideoPlayer from '../components/VideoPlayer';
import Footer from '../components/Footer';
import {
  getTrending,
  getPopular,
  getTopRated,
  getByGenre,
} from '../services/tmdb';

const Home = () => {
  const [heroContent, setHeroContent] = useState(null);
  const [trending, setTrending] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [popularSeries, setPopularSeries] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedContent, setSelectedContent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const [
        trendingData,
        popularMoviesData,
        popularSeriesData,
        topRatedData,
        actionData,
      ] = await Promise.all([
        getTrending('all', 'week'),
        getPopular('movie'),
        getPopular('tv'),
        getTopRated('movie'),
        getByGenre(28, 'movie'), // Action genre
      ]);

      setTrending(trendingData);
      setPopularMovies(popularMoviesData);
      setPopularSeries(popularSeriesData);
      setTopRated(topRatedData);
      setActionMovies(actionData);
      
      // Set random trending item as hero
      if (trendingData.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(5, trendingData.length));
        setHeroContent(trendingData[randomIndex]);
      }
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (content) => {
    setSelectedContent(content);
    setModalOpen(true);
  };

  const handlePlayClick = (content) => {
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
      
      <HeroBanner
        content={heroContent}
        onPlayClick={handlePlayClick}
        onInfoClick={handleCardClick}
      />

      <div className="relative -mt-32 z-20 space-y-8 pb-20">
        <ContentRow
          title="Trending Now"
          items={trending}
          onCardClick={handleCardClick}
        />
        <ContentRow
          title="Popular Movies"
          items={popularMovies}
          onCardClick={handleCardClick}
        />
        <ContentRow
          title="Popular Series"
          items={popularSeries}
          onCardClick={handleCardClick}
        />
        <ContentRow
          title="Top Rated"
          items={topRated}
          onCardClick={handleCardClick}
        />
        <ContentRow
          title="Action Movies"
          items={actionMovies}
          onCardClick={handleCardClick}
        />
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

      <Footer />
    </div>
  );
};

export default Home;
