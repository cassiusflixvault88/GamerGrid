import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  const [freeMovies, setFreeMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedContent, setSelectedContent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);

  const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
        freeMoviesData,
      ] = await Promise.all([
        getTrending('all', 'week'),
        getNowPlaying(),
        getPopular('movie'),
        getPopular('tv'),
        getTopRated('movie'),
        getByGenre(28, 'movie'), // Action genre
        axios.get(`${API}/public-domain/movies`).then(res => res.data.movies).catch(() => []),
      ]);

      setTrending(trendingData);
      setNowPlaying(nowPlayingData);
      setPopularMovies(popularMoviesData);
      setPopularSeries(popularSeriesData);
      setTopRated(topRatedData);
      setActionMovies(actionData);
      setFreeMovies(freeMoviesData.slice(0, 6)); // Show first 6 free movies
      console.log('🎬 Free movies loaded:', freeMoviesData.length, 'total, showing first 6');
      console.log('Free movies data:', freeMoviesData.slice(0, 3).map(m => m.title));
      
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
        {/* Free Movies Section */}
        {freeMovies.length > 0 && (
          <ContentRow
            title="🎬 Watch Free - Full Length Movies"
            items={freeMovies}
            onCardClick={handleCardClick}
            viewAllLink="/public-domain"
          />
        )}

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
