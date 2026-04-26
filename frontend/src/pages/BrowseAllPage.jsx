import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import ContentModal from '../components/ContentModal';
import ContentCard from '../components/ContentCard';
import VideoPlayer from '../components/VideoPlayer';
import { search as searchGames } from '../services/tmdb';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORMS = [
  { key: 'all', label: 'All Games', emoji: '🎮' },
  { key: 'playstation', label: 'PlayStation', emoji: '🎮' },
  { key: 'xbox', label: 'Xbox', emoji: '🎯' },
  { key: 'pc', label: 'PC / Steam', emoji: '💻' },
  { key: 'switch', label: 'Switch', emoji: '🕹️' },
];

const SORTS = [
  { key: 'rating', label: 'Top Rated' },
  { key: 'popular', label: 'Most Popular' },
  { key: 'release', label: 'Newest' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = ['Any', ...Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i)];

const BrowseAllPage = () => {
  const { platform } = useParams();
  const navigate = useNavigate();

  const initialPlatform = useMemo(() => {
    if (!platform) return 'all';
    return PLATFORMS.find((p) => p.key === platform)?.key || 'all';
  }, [platform]);

  const [activePlatform, setActivePlatform] = useState(initialPlatform);
  const [sort, setSort] = useState('rating');
  const [genre, setGenre] = useState(null); // genre id or null
  const [year, setYear] = useState('Any');
  const [genres, setGenres] = useState([]);

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContent, setSelectedContent] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);

  const handlePlayTrailer = (video) => {
    setCurrentVideo(video);
    setVideoPlayerOpen(true);
    setSelectedContent(null);
  };

  useEffect(() => {
    setActivePlatform(initialPlatform);
  }, [initialPlatform]);

  // Load genres once
  useEffect(() => {
    axios.get(`${API}/games/genres`).then((r) => setGenres(r.data || [])).catch(() => setGenres([]));
  }, []);

  useEffect(() => {
    loadGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlatform, sort, genre, year]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (genre) params.set('genre', genre);
      if (year && year !== 'Any') params.set('year', year);

      let url;
      if (activePlatform === 'all') {
        const mkUrl = (endpoint) => `${API}/games/${endpoint}?${params.toString()}`;
        const [trending, top, popular, newRel, ps, xbox, pc, switchGames] = await Promise.all([
          axios.get(mkUrl('trending')).then((x) => x.data?.results || []).catch(() => []),
          axios.get(mkUrl('top-rated')).then((x) => x.data?.results || []).catch(() => []),
          axios.get(mkUrl('most-popular')).then((x) => x.data?.results || []).catch(() => []),
          axios.get(mkUrl('new-releases')).then((x) => x.data?.results || []).catch(() => []),
          axios.get(`${API}/games/platform/playstation?${params.toString()}&sort=popular`).then((x) => x.data?.results || []).catch(() => []),
          axios.get(`${API}/games/platform/xbox?${params.toString()}&sort=popular`).then((x) => x.data?.results || []).catch(() => []),
          axios.get(`${API}/games/platform/pc?${params.toString()}&sort=popular`).then((x) => x.data?.results || []).catch(() => []),
          axios.get(`${API}/games/platform/switch?${params.toString()}&sort=popular`).then((x) => x.data?.results || []).catch(() => []),
        ]);
        const seen = new Set();
        const merged = [...popular, ...trending, ...top, ...newRel, ...ps, ...xbox, ...pc, ...switchGames].filter((g) => {
          if (!g || seen.has(g.id)) return false;
          seen.add(g.id);
          return true;
        });
        setGames(merged);
      } else {
        params.set('sort', sort);
        url = `${API}/games/platform/${activePlatform}?${params.toString()}`;
        const res = await axios.get(url);
        setGames(res.data?.results || []);
      }
    } catch (err) {
      console.error('Browse load error:', err);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformChange = (key) => {
    setActivePlatform(key);
    if (key === 'all') navigate('/games/all');
    else navigate(`/games/${key}`);
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return games;
    const q = searchQuery.toLowerCase();
    return games.filter((g) => (g.title || g.name || '').toLowerCase().includes(q));
  }, [games, searchQuery]);

  const onSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await searchGames(searchQuery.trim());
      setGames(results);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setGenre(null);
    setYear('Any');
    setSort('rating');
  };

  const hasFilters = genre || year !== 'Any' || sort !== 'rating';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900" data-testid="browse-all-page">
      <Navbar />
      <BackNavigation />

      <div className="max-w-7xl mx-auto px-4 py-8 mt-20">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">🎮 Browse Games</h1>
          <p className="text-white/60 text-lg">
            <span className="text-purple-300 font-bold">{games.length > 0 ? `${games.length}+ games` : 'Thousands of games'}</span>
            {' '}to discover — filter by platform, genre and release year. Powered by IGDB.
          </p>
        </div>

        {/* Platform chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePlatformChange(p.key)}
              data-testid={`platform-chip-${p.key}`}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                activePlatform === p.key
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
              }`}
            >
              <span className="mr-1">{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>

        {/* Genre chips */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setGenre(null)}
              data-testid="genre-chip-any"
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                !genre
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
              }`}
            >
              All Genres
            </button>
            {genres.map((g) => (
              <button
                key={g.id}
                onClick={() => setGenre(g.id)}
                data-testid={`genre-chip-${g.id}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  genre === g.id
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        {/* Year + Sort + Search row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-sm">Year:</span>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value === 'Any' ? 'Any' : parseInt(e.target.value, 10))}
                data-testid="year-select"
                className="bg-white/10 border border-white/20 text-white text-xs rounded-md px-3 py-1.5 focus:outline-none focus:border-purple-500"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y} className="bg-gray-900">{y}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white/60 text-sm">Sort:</span>
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  disabled={activePlatform === 'all'}
                  data-testid={`sort-${s.key}`}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    sort === s.key && activePlatform !== 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  } ${activePlatform === 'all' ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                data-testid="clear-filters"
                className="text-xs text-purple-300 hover:text-purple-200 underline"
              >
                Clear filters
              </button>
            )}
          </div>

          <form onSubmit={onSearchSubmit} className="flex-1 md:max-w-md">
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="browse-search-input"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </form>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-white/80 mb-6">
              {filtered.length} game{filtered.length === 1 ? '' : 's'}
            </p>
            <div className="flex flex-wrap gap-4">
              {filtered.map((g) => (
                <ContentCard key={g.id} content={g} onClick={setSelectedContent} />
              ))}
              {filtered.length === 0 && (
                <div className="w-full py-16 text-center">
                  <p className="text-white/60 text-lg mb-4">
                    {searchQuery
                      ? `No matches for "${searchQuery}".`
                      : 'No games match your filters.'}
                  </p>
                  {searchQuery && (
                    <a
                      href={`/request-content?title=${encodeURIComponent(searchQuery)}`}
                      data-testid="request-missing-game"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg"
                    >
                      📥 Didn't find it? Request "{searchQuery}"
                    </a>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Footer />

      {selectedContent && (
        <ContentModal
          content={selectedContent}
          isOpen={!!selectedContent}
          onClose={() => setSelectedContent(null)}
          onPlayTrailer={handlePlayTrailer}
          onSelectContent={(c) => setSelectedContent(c)}
        />
      )}

      <VideoPlayer
        video={currentVideo}
        isOpen={videoPlayerOpen}
        onClose={() => {
          setVideoPlayerOpen(false);
          setCurrentVideo(null);
        }}
        gameId={selectedContent?.id}
        gameTitle={selectedContent?.title || selectedContent?.name}
      />
    </div>
  );
};

export default BrowseAllPage;
