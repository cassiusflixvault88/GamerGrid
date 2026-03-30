import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import TopNavBar from '../components/TopNavBar';
import HeroBanner from '../components/HeroBanner';
import ContentRow from '../components/ContentRow';
import ContentModal from '../components/ContentModal';
import VideoPlayer from '../components/VideoPlayer';
import Onboarding from '../components/Onboarding';
import ShareButton from '../components/ShareButton';
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
  const [whatsHot, setWhatsHot] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [popularSeries, setPopularSeries] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [top10Movies, setTop10Movies] = useState([]);
  const [top10Series, setTop10Series] = useState([]);
  const [documentaries, setDocumentaries] = useState([]);
  const [crimeThrillers, setCrimeThrillers] = useState([]);
  const [horrorMovies, setHorrorMovies] = useState([]);
  const [sciFiMovies, setSciFiMovies] = useState([]);
  const [comedyMovies, setComedyMovies] = useState([]);
  const [freeMovies, setFreeMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  
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
        whatsHotData,
        nowPlayingData,
        popularMoviesData,
        popularSeriesData,
        topRatedData,
        actionData,
        top10MoviesData,
        top10SeriesData,
        documentariesData,
        crimeData,
        horrorData,
        sciFiData,
        comedyData,
        freeMoviesData,
      ] = await Promise.all([
        getTrending('all', 'week'),
        axios.get(`${API}/trending/whats-hot`).then(res => res.data.results).catch(() => []),
        getNowPlaying(),
        getPopular('movie'),
        getPopular('tv'),
        getTopRated('movie'),
        getByGenre(28, 'movie'), // Action genre
        getTopRated('movie').then(data => data.slice(0, 10)), // Top 10 Movies
        getTopRated('tv').then(data => data.slice(0, 10)), // Top 10 Series
        getByGenre(99, 'movie'), // Documentary genre (99)
        getByGenre(80, 'movie'), // Crime genre (80)
        getByGenre(27, 'movie'), // Horror genre (27)
        getByGenre(878, 'movie'), // Sci-Fi genre (878)
        getByGenre(35, 'movie'), // Comedy genre (35)
        axios.get(`${API}/public-domain/movies`).then(res => res.data.movies).catch(() => []),
      ]);

      setTrending(trendingData);
      setWhatsHot(whatsHotData);
      setNowPlaying(nowPlayingData);
      setPopularMovies(popularMoviesData);
      setPopularSeries(popularSeriesData);
      setTopRated(topRatedData);
      setActionMovies(actionData);
      setTop10Movies(top10MoviesData);
      setTop10Series(top10SeriesData);
      setDocumentaries(documentariesData);
      setCrimeThrillers(crimeData);
      setHorrorMovies(horrorData);
      setSciFiMovies(sciFiData);
      setComedyMovies(comedyData);
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
      <TopNavBar />
      <Onboarding />
      
      <HeroBanner
        content={heroContent}
        onPlayClick={handlePlayClick}
        onInfoClick={handleCardClick}
      />

      <div className="relative -mt-32 z-20 space-y-8 pb-20">
        {/* What's Hot - Community Trending */}
        {whatsHot.length > 0 && (
          <ContentRow
            title="🔥 What's Hot"
            items={whatsHot}
            onCardClick={handleCardClick}
          />
        )}

        {/* TOP 10 MOVIES */}
        {top10Movies.length > 0 && (
          <ContentRow
            title="🏆 Top 10 Movies"
            items={top10Movies}
            onCardClick={handleCardClick}
            viewAllLink="/movies"
          />
        )}
        
        {/* TOP 10 SERIES */}
        {top10Series.length > 0 && (
          <ContentRow
            title="📺 Top 10 Series"
            items={top10Series}
            onCardClick={handleCardClick}
            viewAllLink="/series"
          />
        )}

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
        
        {/* NEW GENRE SECTIONS */}
        {documentaries.length > 0 && (
          <ContentRow
            title="📽️ Documentaries - True Stories"
            items={documentaries}
            onCardClick={handleCardClick}
            viewAllLink="/movies"
          />
        )}
        
        {crimeThrillers.length > 0 && (
          <ContentRow
            title="🔪 Crime & Thrillers"
            items={crimeThrillers}
            onCardClick={handleCardClick}
            viewAllLink="/movies"
          />
        )}
        
        {horrorMovies.length > 0 && (
          <ContentRow
            title="👻 Horror Movies"
            items={horrorMovies}
            onCardClick={handleCardClick}
            viewAllLink="/movies"
          />
        )}
        
        {sciFiMovies.length > 0 && (
          <ContentRow
            title="🚀 Sci-Fi & Fantasy"
            items={sciFiMovies}
            onCardClick={handleCardClick}
            viewAllLink="/movies"
          />
        )}
        
        {comedyMovies.length > 0 && (
          <ContentRow
            title="😂 Comedy Movies"
            items={comedyMovies}
            onCardClick={handleCardClick}
            viewAllLink="/movies"
          />
        )}
      </div>

      {/* Share FlixVault Section */}
      <div className="px-6 lg:px-12 max-w-[1920px] mx-auto pb-12">
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Love FlixVault? Share it! 🚀</h2>
          <p className="text-white/70 mb-6">Help us grow by sharing with your friends and family</p>
          <ShareButton size="lg" />
        </div>
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
