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
  getNowPlaying,
} from '../services/tmdb';

const Home = () => {
  const [heroContent, setHeroContent] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroItems, setHeroItems] = useState([]);
  const [trending, setTrending] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
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

  // Rotate hero banner every 5 seconds
  useEffect(() => {
    if (heroItems.length > 1) {
      const interval = setInterval(() => {
        setHeroIndex((prev) => (prev + 1) % heroItems.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [heroItems]);

  // Update hero when index changes
  useEffect(() => {
    if (heroItems.length > 0) {
      setHeroContent(heroItems[heroIndex]);
    }
  }, [heroIndex, heroItems]);

  const loadContent = async () => {
    try {
      const [
        trendingData,
        nowPlayingData,
        popularMoviesData,
        popularSeriesData,
        topRatedData,
        actionData,
      ] = await Promise.all([
        getTrending('all', 'week'),
        getNowPlaying(),
        getPopular('movie'),
        getPopular('tv'),
        getTopRated('movie'),
        getByGenre(28, 'movie'), // Action genre
      ]);

      setTrending(trendingData);
      setNowPlaying(nowPlayingData);
      setPopularMovies(popularMoviesData);
      setPopularSeries(popularSeriesData);
      setTopRated(topRatedData);
      setActionMovies(actionData);
      
      // Set top 6 trending items for rotating hero
      const topTrending = trendingData.slice(0, 6);
      setHeroItems(topTrending);
      setHeroContent(topTrending[0]);
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
        {/* Free Movies Section - NEW */}
        <ContentRow
          title="🎬 Watch Free - Full Length Movies"
          items={[
            { id: 'free-1', title: 'Night of the Living Dead', poster_path: '/inrAKrapfrd3s1AYGJt3u4CZilH.jpg', media_type: 'movie' },
            { id: 'free-2', title: 'Nosferatu', poster_path: '/gaISJR4ZfFO2y3JS2eZxVbkSTde.jpg', media_type: 'movie' },
            { id: 'free-3', title: 'The Cabinet of Dr. Caligari', poster_path: '/4HFyZPs8eFXFLUCgTWGfJBdhszO.jpg', media_type: 'movie' },
            { id: 'free-4', title: 'Metropolis', poster_path: '/7IC0Z3r9jRRQmSBCsKy4yRDaVKO.jpg', media_type: 'movie' },
            { id: 'free-5', title: 'His Girl Friday', poster_path: '/w8zT1qfr9n9YMW5S06KnqEj7lNx.jpg', media_type: 'movie' },
            { id: 'free-6', title: 'Phantom of the Opera', poster_path: '/oF2vH4jgKpS8LkhPJpvvYwjdh5P.jpg', media_type: 'movie' },
          ]}
          onCardClick={handleCardClick}
          viewAllLink="/public-domain"
        />

        <ContentRow
          title="🎬 Now Playing in Theaters"
          items={nowPlaying}
          onCardClick={handleCardClick}
          viewAllLink="/movies"
        />
        <ContentRow
          title="🔥 Trending Now"
          items={trending}
          onCardClick={handleCardClick}
          viewAllLink="/movies"
        />
        <ContentRow
          title="Popular Movies"
          items={popularMovies}
          onCardClick={handleCardClick}
          viewAllLink="/movies"
        />
        <ContentRow
          title="Popular Series"
          items={popularSeries}
          onCardClick={handleCardClick}
          viewAllLink="/series"
        />
        <ContentRow
          title="Top Rated"
          items={topRated}
          onCardClick={handleCardClick}
          viewAllLink="/movies"
        />
        <ContentRow
          title="Action Movies"
          items={actionMovies}
          onCardClick={handleCardClick}
          viewAllLink="/movies"
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
