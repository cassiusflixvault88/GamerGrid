import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import ContentModal from '../components/ContentModal';
import ContentCard from '../components/ContentCard';
import { getByPlatform, getTrending, getTopRated, search as searchGames } from '../services/tmdb';

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

const BrowseAllPage = () => {
  const { platform } = useParams();
  const navigate = useNavigate();

  const initialPlatform = useMemo(() => {
    if (!platform) return 'all';
    const match = PLATFORMS.find((p) => p.key === platform);
    return match ? match.key : 'all';
  }, [platform]);

  const [activePlatform, setActivePlatform] = useState(initialPlatform);
  const [sort, setSort] = useState('rating');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContent, setSelectedContent] = useState(null);

  useEffect(() => {
    setActivePlatform(initialPlatform);
  }, [initialPlatform]);

  useEffect(() => {
    loadGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlatform, sort]);

  const loadGames = async () => {
    setLoading(true);
    try {
      if (activePlatform === 'all') {
        // Load a larger "all" feed from multiple sources
        const [trending, top] = await Promise.all([
          getTrending().catch(() => []),
          getTopRated().catch(() => []),
        ]);
        const seen = new Set();
        const merged = [...trending, ...top].filter((g) => {
          if (!g || seen.has(g.id)) return false;
          seen.add(g.id);
          return true;
        });
        setGames(merged);
      } else {
        const list = await getByPlatform(activePlatform, sort, 80);
        setGames(list);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900" data-testid="browse-all-page">
      <Navbar />
      <BackNavigation />

      <div className="max-w-7xl mx-auto px-4 py-8 mt-20">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            🎮 Browse Games
          </h1>
          <p className="text-white/60 text-lg">Discover trending and top-rated games across every platform</p>
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

        {/* Sort + Search */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Sort:</span>
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                disabled={activePlatform === 'all'}
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
                <p className="text-white/60 py-16 text-center w-full">No games found. Try a different platform or search.</p>
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
          onPlayTrailer={() => {}}
          onSelectContent={(c) => setSelectedContent(c)}
        />
      )}
    </div>
  );
};

export default BrowseAllPage;
