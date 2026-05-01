import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import ContentModal from '../components/ContentModal';
import ContentCard from '../components/ContentCard';
import VideoPlayer from '../components/VideoPlayer';
import SeoSchema from '../components/SeoSchema';
import { search as searchGames } from '../services/games';

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
  { key: 'oldest', label: 'Oldest' },
  { key: 'trending', label: 'Trending' },
];

const PAGE_SIZE = 100;

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
  const [visible, setVisible] = useState(PAGE_SIZE);

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
    setVisible(PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlatform, sort, genre, year]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // IGDB caps each request at 500 — for big catalogs we paginate via offset.
      // PlayStation and Xbox get the deepest catalog (1500 each) so newer/niche
      // titles (e.g. AC Shadows) surface alongside the all-time greats.
      const platformLimit = (key) => {
        if (key === 'playstation') return 4000;
        if (key === 'xbox') return 4000;
        if (key === 'pc') return 1500;
        if (key === 'switch') return 1000;
        return 500;
      };
      const generalLimit = '350';
      params.set('limit', generalLimit);
      if (genre) params.set('genre', genre);
      if (year && year !== 'Any') params.set('year', year);

      // Progressive loader — append new games as each request finishes so the
      // grid lights up within ~500ms instead of waiting for all 25 calls. The
      // de-dupe uses BOTH id AND normalised-title because IGDB often returns
      // the same physical game under different IDs per region/edition (e.g.
      // "Alan Wake II" vs "Alan Wake II: Deluxe Edition" — same game, 2 cards).
      const seenIds = new Set();
      const seenTitles = new Set();
      const normTitle = (t) => (t || '')
        .toLowerCase()
        .replace(/\s*[-–—:]\s*(deluxe|standard|digital|gold|premium|ultimate|complete|definitive|goty|game of the year|special|collector'?s?|anniversary|remaster(?:ed)?)\s*edition.*$/i, '')
        .replace(/\s*\(.*?\)\s*$/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const appendGames = (incoming) => {
        if (!incoming?.length) return;
        setGames((prev) => {
          const fresh = incoming.filter((g) => {
            if (!g || seenIds.has(g.id)) return false;
            const nt = normTitle(g.title || g.name);
            if (nt && seenTitles.has(nt)) return false;
            seenIds.add(g.id);
            if (nt) seenTitles.add(nt);
            return true;
          });
          if (!fresh.length) return prev;
          return [...prev, ...fresh];
        });
      };

      let url;
      if (activePlatform === 'all') {
        const mkUrl = (endpoint) => `${API}/games/${endpoint}?${params.toString()}`;
        // Reset list before progressive append.
        setGames([]);

        // PHASE 1 — quick wins: 4 small endpoints fire in parallel and stream
        // results into the grid as each one returns. User typically sees their
        // first row of games in under 500ms.
        const phase1 = [
          axios.get(mkUrl('most-popular')).then((x) => x.data?.results || []).catch(() => []),
          axios.get(mkUrl('trending')).then((x) => x.data?.results || []).catch(() => []),
          axios.get(mkUrl('top-rated')).then((x) => x.data?.results || []).catch(() => []),
          axios.get(mkUrl('new-releases')).then((x) => x.data?.results || []).catch(() => []),
        ];
        phase1.forEach((p) => p.then(appendGames));
        // Stop the spinner the moment phase 1 has anything to show.
        Promise.race(phase1).then(() => setLoading(false));
        await Promise.all(phase1);

        // PHASE 2 — deep platform catalogs in the background. Each chunk
        // appends as it arrives so the count grows naturally while browsing.
        [
          ['playstation', platformLimit('playstation')],
          ['xbox', platformLimit('xbox')],
          ['pc', platformLimit('pc')],
          ['switch', platformLimit('switch')],
        ].forEach(async ([key, total]) => {
          for (let off = 0; off < total; off += 500) {
            const p = new URLSearchParams(params);
            p.set('limit', String(Math.min(500, total - off)));
            p.set('offset', String(off));
            p.set('sort', 'popular');
            try {
              const res = await axios.get(`${API}/games/platform/${key}?${p.toString()}`);
              appendGames(res.data?.results || []);
            } catch { /* skip failed page */ }
          }
        });
      } else {
        // Single-platform view — stream the catalog page-by-page so the grid
        // lights up after the first 500 games and grows in the background.
        const total = platformLimit(activePlatform);
        const serverSort = sort === 'trending' || sort === 'oldest' ? 'rating' : sort;
        setGames([]);

        if (total <= 500) {
          const platParams = new URLSearchParams(params);
          platParams.set('limit', String(total));
          platParams.set('sort', serverSort);
          url = `${API}/games/platform/${activePlatform}?${platParams.toString()}`;
          const res = await axios.get(url);
          setGames(res.data?.results || []);
          setLoading(false);
        } else {
          // Stream-paginate. Await ONLY the first chunk to clear the spinner;
          // the rest stream in via appendGames on their own.
          for (let off = 0; off < total; off += 500) {
            const p = new URLSearchParams(params);
            p.set('limit', String(Math.min(500, total - off)));
            p.set('offset', String(off));
            p.set('sort', serverSort);
            const promise = axios.get(`${API}/games/platform/${activePlatform}?${p.toString()}`)
              .then((x) => appendGames(x.data?.results || []))
              .catch(() => {});
            if (off === 0) {
              await promise;
              setLoading(false);
            }
          }
        }
      }
    } catch (err) {
      console.error('Browse load error:', err);
      setGames([]);
      setLoading(false);
    }
  };

  const handlePlatformChange = (key) => {
    setActivePlatform(key);
    if (key === 'all') navigate('/games/all');
    else navigate(`/games/${key}`);
  };

  const filtered = useMemo(() => {
    let list = games;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((g) => (g.title || g.name || '').toLowerCase().includes(q));
    }

    // Client-side sort so every option works on every platform (incl. "All")
    const arr = [...list];
    const dateOf = (g) => {
      const d = g.release_date || g.first_release_date || '';
      const t = typeof d === 'string' ? Date.parse(d) : (typeof d === 'number' ? d * 1000 : NaN);
      return Number.isFinite(t) ? t : 0;
    };
    if (sort === 'rating') {
      arr.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (sort === 'popular') {
      arr.sort((a, b) => (b.popularity || b.vote_count || 0) - (a.popularity || a.vote_count || 0));
    } else if (sort === 'release') {
      arr.sort((a, b) => dateOf(b) - dateOf(a));
    } else if (sort === 'oldest') {
      arr.sort((a, b) => dateOf(a) - dateOf(b));
    } else if (sort === 'trending') {
      // Trending = recent + popular weighted
      const now = Date.now();
      const score = (g) => {
        const rec = Math.max(0, 1 - (now - dateOf(g)) / (1000 * 60 * 60 * 24 * 365 * 2)); // last 2y
        return (g.popularity || g.vote_count || 0) * (0.6 + 0.4 * rec) + (g.vote_average || 0) * 5;
      };
      arr.sort((a, b) => score(b) - score(a));
    }
    return arr;
  }, [games, searchQuery, sort]);

  const visibleGames = useMemo(() => filtered.slice(0, visible), [filtered, visible]);
  const hasMore = visible < filtered.length;

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
      {/* Platform-specific JSON-LD list so Google can build rich carousels
          like "Top PS5 games" / "Top Xbox games" in mobile search. */}
      <SeoSchema
        id={`browse-${activePlatform}`}
        type="VideoGameList"
        games={games}
        listName={`GamerGrid · ${(PLATFORMS.find((p) => p.key === activePlatform) || {}).label || 'Games'}`}
        pageUrl={`https://gamer-grid.com/games/${activePlatform}`}
      />
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

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white/60 text-sm">Sort:</span>
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  data-testid={`sort-${s.key}`}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    sort === s.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
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

        {loading && games.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-white/80 mb-6 flex items-center gap-3">
              <span>
                Showing <span className="text-purple-300 font-semibold">{visibleGames.length}</span> of {filtered.length} game{filtered.length === 1 ? '' : 's'}
              </span>
              {loading && (
                <span className="inline-flex items-center gap-2 text-xs text-purple-300">
                  <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  loading more…
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-4">
              {visibleGames.map((g) => (
                <ContentCard key={g.id} content={g} onClick={setSelectedContent} />
              ))}
              {filtered.length === 0 && !loading && (
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

            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  data-testid="load-more-games"
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg"
                >
                  Load 100 More ({filtered.length - visible} remaining)
                </button>
              </div>
            )}
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
