import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import TopNavBar from '../components/TopNavBar';
import HeroBanner from '../components/HeroBanner';
import Top10HeroCarousel from '../components/Top10HeroCarousel';
import ContentRow from '../components/ContentRow';
import ContentModal from '../components/ContentModal';
import VideoPlayer from '../components/VideoPlayer';
import Onboarding from '../components/Onboarding';
import ShareButton from '../components/ShareButton';
import GuestMarketingHero from '../components/GuestMarketingHero';
import AutoFetchBadge from '../components/AutoFetchBadge';
import MeetCreatorCard from '../components/MeetCreatorCard';
import RecentTippersTicker from '../components/RecentTippersTicker';
import HomepageTipPing from '../components/HomepageTipPing';
import SeoSchema from '../components/SeoSchema';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import AdSlot from '../components/AdSlot';
import {
  getTrending,
  getTopRated,
  getUpcoming,
  getNewReleases,
  getByPlatform,
  getGOTY,
  getMostPopular,
  getTop10,
  getVideos,
  getByCategory,
  IGDB_GENRES,
  IGDB_THEMES,
} from '../services/games';

const Home = () => {
  const { user } = useAuth();
  const isPro = Boolean(user && (user.is_pro || user.is_admin));
  const [heroContent, setHeroContent] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroItems, setHeroItems] = useState([]);

  const [trending, setTrending] = useState([]);
  const [top10, setTop10] = useState([]);
  const [mostPopular, setMostPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [goty, setGoty] = useState([]);
  const [gotyYear, setGotyYear] = useState(null);
  const [playstation, setPlaystation] = useState([]);
  const [xbox, setXbox] = useState([]);
  const [pc, setPc] = useState([]);
  const [switchGames, setSwitchGames] = useState([]);

  // Genre / Theme rails (categorized so users don't see the same games repeated)
  const [rpgGames, setRpgGames] = useState([]);
  const [shooterGames, setShooterGames] = useState([]);
  const [scifiGames, setScifiGames] = useState([]);
  const [horrorGames, setHorrorGames] = useState([]);
  const [racingGames, setRacingGames] = useState([]);
  const [openWorldGames, setOpenWorldGames] = useState([]);
  const [indieGames, setIndieGames] = useState([]);

  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [tourForceOpen, setTourForceOpen] = useState(false);

  // Personalized recommendations (signed-in users only)
  const [forYou, setForYou] = useState([]);
  const [forYouReason, setForYouReason] = useState('');

  useEffect(() => {
    loadContent();
  }, []);

  // Fetch personalized rail whenever user or their watchlist changes
  useEffect(() => {
    if (!user) {
      setForYou([]);
      setForYouReason('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
        const r = await fetch(`${API}/games/for-you`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled) return;
        setForYou(d?.results || []);
        setForYouReason(d?.reason || '');
      } catch {
        // silent — rail just won't render
      }
    })();
    return () => { cancelled = true; };
  }, [user, user?.watchlist?.length]);

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
        top10Data,
        mostPopularData,
        topRatedData,
        upcomingData,
        newReleasesData,
        psData,
        xboxData,
        pcData,
        switchData,
        rpgData,
        shooterData,
        scifiData,
        horrorData,
        racingData,
        openWorldData,
        indieData,
      ] = await Promise.all([
        getTrending().catch(() => []),
        getTop10().catch(() => []),
        getMostPopular().catch(() => []),
        getTopRated().catch(() => []),
        getUpcoming().catch(() => []),
        getNewReleases().catch(() => []),
        getByPlatform('playstation').catch(() => []),
        getByPlatform('xbox').catch(() => []),
        getByPlatform('pc').catch(() => []),
        getByPlatform('switch').catch(() => []),
        getByCategory({ genre: IGDB_GENRES.RPG, limit: 60 }).catch(() => []),
        getByCategory({ genre: IGDB_GENRES.SHOOTER, limit: 60 }).catch(() => []),
        getByCategory({ theme: IGDB_THEMES.SCI_FI, limit: 60 }).catch(() => []),
        getByCategory({ theme: IGDB_THEMES.HORROR, limit: 60, minRating: 65 }).catch(() => []),
        getByCategory({ genre: IGDB_GENRES.RACING, limit: 60, minRating: 65 }).catch(() => []),
        getByCategory({ theme: IGDB_THEMES.OPEN_WORLD, limit: 60 }).catch(() => []),
        getByCategory({ genre: IGDB_GENRES.INDIE, limit: 60, minRating: 75 }).catch(() => []),
      ]);

      // ---------- Dedupe pipeline ----------
      // Higher-priority rails keep their games. Lower-priority rails drop any
      // game already shown in a higher rail. This ends the "same games everywhere"
      // problem on the homepage.
      const seen = new Set();
      const claim = (list, max = 50) => {
        const out = [];
        for (const g of list || []) {
          const id = g?.id;
          if (id == null) continue;
          if (seen.has(id)) continue;
          seen.add(id);
          out.push(g);
          if (out.length >= max) break;
        }
        return out;
      };

      // Top10 doesn't go through `claim` — it's the hero carousel and must stay
      // as IGDB returned it. But we DO mark its games as seen so other rails skip them.
      (top10Data || []).forEach((g) => g?.id != null && seen.add(g.id));

      // Priority order matters: rails earlier on the page win.
      const dedupedTrending = claim(trendingData);
      const dedupedUpcoming = claim(upcomingData);
      const dedupedMostPopular = claim(mostPopularData);
      // GOTY fetched below — handled separately
      const dedupedTopRated = claim(topRatedData);
      const dedupedNewReleases = claim(newReleasesData);
      const dedupedPs = claim(psData, 50);
      const dedupedXbox = claim(xboxData, 50);
      const dedupedPc = claim(pcData, 50);
      const dedupedSwitch = claim(switchData, 50);
      const dedupedRpg = claim(rpgData, 50);
      const dedupedShooter = claim(shooterData, 50);
      const dedupedScifi = claim(scifiData, 50);
      const dedupedHorror = claim(horrorData, 50);
      const dedupedRacing = claim(racingData, 50);
      const dedupedOpenWorld = claim(openWorldData, 50);
      const dedupedIndie = claim(indieData, 50);

      setTrending(dedupedTrending);
      setTop10(top10Data);
      setMostPopular(dedupedMostPopular);
      setTopRated(dedupedTopRated);
      setUpcoming(dedupedUpcoming);
      setNewReleases(dedupedNewReleases);
      setPlaystation(dedupedPs);
      setXbox(dedupedXbox);
      setPc(dedupedPc);
      setSwitchGames(dedupedSwitch);
      setRpgGames(dedupedRpg);
      setShooterGames(dedupedShooter);
      setScifiGames(dedupedScifi);
      setHorrorGames(dedupedHorror);
      setRacingGames(dedupedRacing);
      setOpenWorldGames(dedupedOpenWorld);
      setIndieGames(dedupedIndie);

      // GOTY rail (separate fetch so we can capture year metadata)
      try {
        const r = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/games/goty`);
        const gotyRaw = r.data?.results || [];
        setGoty(claim(gotyRaw, 30));
        setGotyYear(r.data?.year || null);
      } catch (e) {
        const fallback = await getGOTY().catch(() => []);
        setGoty(claim(fallback, 30));
      }

      const hero = (trendingData || []).filter((g) => g.backdrop_path).slice(0, 6);
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

  const handlePlayClick = async (content) => {
    // Try to play trailer directly first (skip the modal)
    try {
      if (content.youtube_video_id) {
        setCurrentVideo({
          key: content.youtube_video_id,
          name: `${content.title || content.name} - Trailer`,
          site: 'YouTube',
          type: 'Trailer',
        });
        setVideoPlayerOpen(true);
        return;
      }
      // Fallback: fetch videos for this game
      const vids = await getVideos('game', content.id).catch(() => []);
      const trailer = vids.find((v) => v.type === 'Trailer' && v.site === 'YouTube') || vids[0];
      if (trailer && trailer.key) {
        setCurrentVideo(trailer);
        setVideoPlayerOpen(true);
        return;
      }
    } catch (err) {
      console.error('handlePlayClick:', err);
    }
    // No trailer found → open modal as fallback
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
      {/* JSON-LD structured data — feeds Google rich-result carousels with
          our top games. Picked up by Googlebot's JS-rendering pass. */}
      <SeoSchema
        id="home-top10"
        type="VideoGameList"
        games={top10}
        listName="GamerGrid · Top 10 Games This Week"
        pageUrl="https://gamer-grid.com/"
      />
      <SeoSchema
        id="home-trending"
        type="VideoGameList"
        games={trending}
        listName="GamerGrid · Trending Games"
        pageUrl="https://gamer-grid.com/"
      />
      <HomepageTipPing />
      <Navbar />
      <TopNavBar />
      <Onboarding forceOpen={tourForceOpen} onForceClose={() => setTourForceOpen(false)} />

      {top10.length > 0 ? (
        <Top10HeroCarousel
          items={top10}
          onPlayClick={handlePlayClick}
          onInfoClick={handleCardClick}
        />
      ) : (
        <HeroBanner
          content={heroContent}
          onPlayClick={handlePlayClick}
          onInfoClick={handleCardClick}
        />
      )}

      <div className="relative -mt-32 z-20 space-y-8 pb-20">
        {/* AUTO-FETCH BADGE */}
        <div className="px-6 lg:px-12 max-w-[1920px] mx-auto flex justify-center md:justify-start">
          <AutoFetchBadge />
        </div>

        {/* MEET THE CREATOR — message Cassius, rate the app, leave a review */}
        <div className="px-6 lg:px-12 max-w-[1920px] mx-auto">
          <MeetCreatorCard />
        </div>

        {/* LIVE TIPS TICKER — social proof */}
        <div className="px-6 lg:px-12 max-w-[1920px] mx-auto">
          <RecentTippersTicker />
        </div>

        {/* GO PRO PINK BANNER (hidden for Pro/admin) */}
        {!isPro && (
        <div className="px-6 lg:px-12 max-w-[1920px] mx-auto mb-4" data-testid="home-pro-banner">
          <a
            href="/settings?tab=subscription"
            className="block group relative overflow-hidden rounded-2xl border-2 border-pink-400/60 bg-gradient-to-r from-pink-600 via-fuchsia-500 to-rose-500 p-6 lg:p-8 shadow-[0_0_40px_rgba(244,114,182,0.35)] hover:shadow-[0_0_60px_rgba(244,114,182,0.55)] transition-all hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.25),transparent_60%)] pointer-events-none" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-5xl drop-shadow-lg animate-pulse">👑</div>
                <div className="text-left">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow">
                    Go Pro — Just $4.99/mo
                  </h2>
                  <p className="text-white/95 text-sm md:text-base mt-1">
                    100% ad-free • Save trailers to your library • Early access • Support an indie creator 💖
                  </p>
                </div>
              </div>
              <div className="px-6 py-3 bg-white text-pink-600 font-extrabold rounded-xl shadow-lg group-hover:bg-pink-50 transition-colors whitespace-nowrap">
                Upgrade Now →
              </div>
            </div>
          </a>
        </div>
        )}

        {/* GUEST MARKETING HERO — full pitch for non-signed-in visitors */}
        {!user && (
          <GuestMarketingHero
            onTakeTour={() => setTourForceOpen(true)}
            onSignUp={() => {
              // AuthModal opens via the navbar Sign In flow — easiest path is to dispatch a click on Sign In
              const btn = document.querySelector('[data-testid="navbar-sign-in"]') ||
                          document.querySelector('button[class*="bg-purple-600"]');
              if (btn) btn.click();
              else window.location.hash = '#signup';
            }}
          />
        )}

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

        {forYou.length > 0 && (
          <div data-testid="for-you-rail">
            <div className="px-6 lg:px-12 max-w-[1920px] mx-auto flex items-baseline justify-between pt-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                🎯 Just For You
                <span className="text-xs font-normal text-white/50">· {forYouReason}</span>
              </h2>
            </div>
            <ContentRow title="" items={forYou} onCardClick={handleCardClick} viewAllLink="/games/all" />
          </div>
        )}

        {trending.length > 0 && (
          <ContentRow title="🔥 Trending Now" items={trending} onCardClick={handleCardClick} viewAllLink="/games/all" />
        )}

        {/* Dedicated COMING SOON / Pre-Orders banner-style highlight */}
        {upcoming.length > 0 && (
          <div className="px-6 lg:px-12 max-w-[1920px] mx-auto" data-testid="coming-soon-section">
            <div className="bg-gradient-to-br from-orange-600/20 via-pink-600/15 to-purple-700/20 border border-orange-500/30 rounded-2xl p-1">
              <div className="flex items-center justify-between px-5 pt-3 pb-1">
                <div>
                  <h2 className="text-2xl font-bold text-white">🗓️ Coming Soon &amp; Pre-Orders</h2>
                  <p className="text-white/60 text-sm mt-0.5">Most-anticipated upcoming releases — pre-order now</p>
                </div>
                <a href="/games/all" className="text-orange-300 hover:text-orange-200 text-sm font-semibold">
                  View All →
                </a>
              </div>
              <ContentRow title="" items={upcoming} onCardClick={handleCardClick} viewAllLink="/games/all" />
            </div>
          </div>
        )}

        {mostPopular.length > 0 && (
          <ContentRow title="🌟 Most Popular Right Now" items={mostPopular} onCardClick={handleCardClick} viewAllLink="/games/all" />
        )}
        {goty.length > 0 && (
          <ContentRow
            title={`👑 Game of the Year — ${gotyYear || ''}`}
            items={goty}
            onCardClick={handleCardClick}
            viewAllLink="/games/all"
          />
        )}
        {topRated.length > 0 && (
          <ContentRow title="🏆 Top Rated Games" items={topRated} onCardClick={handleCardClick} viewAllLink="/games/all" />
        )}
        {newReleases.length > 0 && (
          <ContentRow title="🆕 New Releases" items={newReleases} onCardClick={handleCardClick} viewAllLink="/games/all" />
        )}

        <div className="px-6 lg:px-12 max-w-[1920px] mx-auto">
          <AdSlot name="home_mid" />
        </div>

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

        {/* GENRE & THEME RAILS — categorized so users see fresh games per category */}
        {rpgGames.length > 0 && (
          <ContentRow title="⚔️ RPG &amp; Role-Playing Adventures" items={rpgGames} onCardClick={handleCardClick} viewAllLink="/games/all" />
        )}
        {shooterGames.length > 0 && (
          <ContentRow title="🔫 Shooters &amp; FPS" items={shooterGames} onCardClick={handleCardClick} viewAllLink="/games/all" />
        )}
        {openWorldGames.length > 0 && (
          <ContentRow title="🌍 Open World &amp; Sandbox" items={openWorldGames} onCardClick={handleCardClick} viewAllLink="/games/all" />
        )}
        {scifiGames.length > 0 && (
          <ContentRow title="🚀 Sci-Fi &amp; Futuristic" items={scifiGames} onCardClick={handleCardClick} viewAllLink="/games/all" />
        )}
        {horrorGames.length > 0 && (
          <ContentRow title="🧟 Horror &amp; Survival" items={horrorGames} onCardClick={handleCardClick} viewAllLink="/games/all" />
        )}
        {racingGames.length > 0 && (
          <ContentRow title="🏎️ Racing &amp; Sports" items={racingGames} onCardClick={handleCardClick} viewAllLink="/games/all" />
        )}
        {indieGames.length > 0 && (
          <ContentRow title="🎨 Indie Gems" items={indieGames} onCardClick={handleCardClick} viewAllLink="/games/all" />
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
