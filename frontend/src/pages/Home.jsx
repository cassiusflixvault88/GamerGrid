import React, { useState, useEffect } from 'react';
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
  getTopRated,
  getUpcoming,
  getNewReleases,
  getByPlatform,
} from '../services/tmdb';

const Home = () => {
  const [heroContent, setHeroContent] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroItems, setHeroItems] = useState([]);

  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [playstation, setPlaystation] = useState([]);
  const [xbox, setXbox] = useState([]);
  const [pc, setPc] = useState([]);
  const [switchGames, setSwitchGames] = useState([]);

  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);

  useEffect(() => {
    loadContent();
  }, []);

  useEffect(() => {
    if (heroItems.length > 1) {
      const interval = setInterval(() => {
        setHeroIndex((prev) => (prev + 1) % heroItems.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [heroItems]);

  useEffect(() => {
    if (heroItems.length > 0) setHeroContent(heroItems[heroIndex]);
  }, [heroIndex, heroItems]);

  const loadContent = async () => {
    try {
      const [
        trendingData,
        topRatedData,
        upcomingData,
        newReleasesData,
        psData,
        xboxData,
        pcData,
        switchData,
      ] = await Promise.all([
        getTrending().catch(() => []),
        getTopRated().catch(() => []),
        getUpcoming().catch(() => []),
        getNewReleases().catch(() => []),
        getByPlatform('playstation').catch(() => []),
        getByPlatform('xbox').catch(() => []),
        getByPlatform('pc').catch(() => []),
        getByPlatform('switch').catch(() => []),
      ]);

      setTrending(trendingData);
      setTopRated(topRatedData);
      setUpcoming(upcomingData);
      setNewReleases(newReleasesData);
      setPlaystation(psData);
      setXbox(xboxData);
      setPc(pcData);
      setSwitchGames(switchData);

      const hero = trendingData.filter((g) => g.backdrop_path).slice(0, 6);
      setHeroItems(hero);
      setHeroContent(hero[0] || null);
    } catch (err) {
      console.error('Error loading games:', err);
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
    <div className="min-h-screen bg-black" data-testid="home-page">
      <Navbar />
      <TopNavBar />
      <Onboarding />

      <HeroBanner
        content={heroContent}
        onPlayClick={handlePlayClick}
        onInfoClick={handleCardClick}
      />

      <div className="relative -mt-32 z-20 space-y-8 pb-20">
        {/* RATE GAMERGRID CTA */}
        <div className="px-6 lg:px-12 max-w-[1920px] mx-auto mb-8">
          <div className="bg-gradient-to-br from-purple-600/30 via-blue-600/30 to-purple-600/30 rounded-2xl p-10 border-2 border-purple-500/50 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-4">
                <img
                  src="/gamergrid-icon.svg"
                  alt="GamerGrid"
                  className="w-20 h-20 animate-pulse"
                />
                <div>
                  <h2 className="text-4xl font-bold text-white mb-3 flex items-center gap-3">
                    <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                      Rate GamerGrid
                    </span>
                    ⭐
                  </h2>
                  <p className="text-white/80 text-lg">
                    Love GamerGrid? Share your experience and help us improve!
                  </p>
                </div>
              </div>
              <a
                href="/app-reviews"
                className="px-10 py-5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-xl rounded-xl transition-all transform hover:scale-110 shadow-2xl animate-bounce"
                data-testid="rate-gamergrid-cta"
              >
                ⭐ Rate Us Now
              </a>
            </div>
          </div>
        </div>

        {/* BROWSE BY PLATFORM */}
        <div className="px-6 lg:px-12 max-w-[1920px] mx-auto mb-12">
          <div className="bg-gradient-to-r from-purple-900/40 via-blue-900/40 to-cyan-900/40 rounded-xl p-8 border border-purple-500/30">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              🎮 Browse Games by Platform
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a href="/games/playstation" className="group bg-gradient-to-br from-blue-600/20 to-blue-800/20 hover:from-blue-600/40 hover:to-blue-800/40 border border-blue-500/30 rounded-xl p-6 transition-all transform hover:scale-105" data-testid="platform-playstation">
                <div className="text-center">
                  <div className="text-4xl mb-3">🎮</div>
                  <h3 className="text-xl font-bold text-white mb-2">PlayStation</h3>
                  <p className="text-white/60 text-sm">PS5 & PS4</p>
                </div>
              </a>

              <a href="/games/xbox" className="group bg-gradient-to-br from-green-600/20 to-green-800/20 hover:from-green-600/40 hover:to-green-800/40 border border-green-500/30 rounded-xl p-6 transition-all transform hover:scale-105" data-testid="platform-xbox">
                <div className="text-center">
                  <div className="text-4xl mb-3">🎯</div>
                  <h3 className="text-xl font-bold text-white mb-2">Xbox</h3>
                  <p className="text-white/60 text-sm">Series X/S & One</p>
                </div>
              </a>

              <a href="/games/pc" className="group bg-gradient-to-br from-purple-600/20 to-purple-800/20 hover:from-purple-600/40 hover:to-purple-800/40 border border-purple-500/30 rounded-xl p-6 transition-all transform hover:scale-105" data-testid="platform-pc">
                <div className="text-center">
                  <div className="text-4xl mb-3">💻</div>
                  <h3 className="text-xl font-bold text-white mb-2">PC / Steam</h3>
                  <p className="text-white/60 text-sm">Desktop Gaming</p>
                </div>
              </a>

              <a href="/games/switch" className="group bg-gradient-to-br from-red-600/20 to-red-800/20 hover:from-red-600/40 hover:to-red-800/40 border border-red-500/30 rounded-xl p-6 transition-all transform hover:scale-105" data-testid="platform-switch">
                <div className="text-center">
                  <div className="text-4xl mb-3">🕹️</div>
                  <h3 className="text-xl font-bold text-white mb-2">Nintendo</h3>
                  <p className="text-white/60 text-sm">Switch</p>
                </div>
              </a>
            </div>

            <div className="mt-6 text-center">
              <a href="/games/all" className="inline-block px-10 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg" data-testid="browse-all-games">
                🎮 Browse All Games →
              </a>
            </div>
          </div>
        </div>

        {trending.length > 0 && (
          <ContentRow title="🔥 Trending Now" items={trending} onCardClick={handleCardClick} viewAllLink="/games/all" />
        )}
        {upcoming.length > 0 && (
          <ContentRow title="🗓️ Coming Soon & Pre-Orders" items={upcoming} onCardClick={handleCardClick} viewAllLink="/games/all" />
        )}
        {topRated.length > 0 && (
          <ContentRow title="🏆 Top Rated Games" items={topRated} onCardClick={handleCardClick} viewAllLink="/games/all" />
        )}
        {newReleases.length > 0 && (
          <ContentRow title="🆕 New Releases" items={newReleases} onCardClick={handleCardClick} viewAllLink="/games/all" />
        )}
        {playstation.length > 0 && (
          <ContentRow title="🎮 PlayStation Exclusives & Hits" items={playstation} onCardClick={handleCardClick} viewAllLink="/games/playstation" />
        )}
        {xbox.length > 0 && (
          <ContentRow title="🎯 Xbox Favorites" items={xbox} onCardClick={handleCardClick} viewAllLink="/games/xbox" />
        )}
        {pc.length > 0 && (
          <ContentRow title="💻 PC / Steam Top Games" items={pc} onCardClick={handleCardClick} viewAllLink="/games/pc" />
        )}
        {switchGames.length > 0 && (
          <ContentRow title="🕹️ Nintendo Switch Favorites" items={switchGames} onCardClick={handleCardClick} viewAllLink="/games/switch" />
        )}
      </div>

      <div className="px-6 lg:px-12 max-w-[1920px] mx-auto pb-12">
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Love GamerGrid? Share it! 🚀</h2>
          <p className="text-white/70 mb-6">Help us grow by sharing with your friends and family</p>
          <ShareButton size="lg" />
        </div>
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

export default Home;
