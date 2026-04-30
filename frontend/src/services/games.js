import axios from 'axios';

// IGDB-backed catalog service exposed with TMDB-ish names so existing
// components (ContentCard, HeroBanner, ContentModal) keep working.

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// getImageUrl: if the path is already a full URL (IGDB https://...), return it.
// If it's null/empty, return a placeholder SVG; if it's an old TMDB path, still render TMDB.
const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg width='500' height='750' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='500' height='750' fill='%23111827'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='24' fill='%236b7280' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

export const getImageUrl = (path /*, size */) => {
  if (!path) return PLACEHOLDER;
  if (typeof path === 'string' && (path.startsWith('http') || path.startsWith('data:') || path.startsWith('/'))) {
    return path;
  }
  return PLACEHOLDER;
};

const unwrap = (res) => (res?.data?.results ?? []);

export const getTrending = async (mode) => unwrap(await axios.get(`${API}/games/trending?limit=60${mode ? `&mode=${mode}` : ''}`));
export const getPopular = async () => unwrap(await axios.get(`${API}/games/trending?limit=60`));
export const getTopRated = async () => unwrap(await axios.get(`${API}/games/top-rated?limit=60`));
export const getUpcoming = async () => unwrap(await axios.get(`${API}/games/upcoming?limit=60`));
export const getNewReleases = async () => unwrap(await axios.get(`${API}/games/new-releases?limit=60`));
export const getByPlatform = async (platformKey, sort = 'rating', limit = 60) =>
  unwrap(await axios.get(`${API}/games/platform/${platformKey}?sort=${sort}&limit=${limit}`));

// Legacy signature kept for any code still calling getByGenre; route it to platform when possible.
export const getByGenre = async () => [];

// ---------- Genre / Theme rails (IGDB IDs) ----------
// Generic helper: pass either genre or theme ID
export const getByCategory = async ({ genre, theme, limit = 40, sort = 'popular', minRating = 70 } = {}) => {
  const params = new URLSearchParams();
  if (genre) params.set('genre', String(genre));
  if (theme) params.set('theme', String(theme));
  params.set('limit', String(limit));
  params.set('sort', sort);
  params.set('min_rating', String(minRating));
  return unwrap(await axios.get(`${API}/games/category?${params.toString()}`));
};

// IGDB Genre IDs (verified in IGDB API v4)
export const IGDB_GENRES = {
  FIGHTING: 4, SHOOTER: 5, MUSIC: 7, PLATFORM: 8, PUZZLE: 9, RACING: 10,
  RTS: 11, RPG: 12, SIMULATOR: 13, SPORT: 14, STRATEGY: 15, TURN_BASED: 16,
  TACTICAL: 24, HACK_AND_SLASH: 25, ADVENTURE: 31, INDIE: 32, ARCADE: 33,
  VISUAL_NOVEL: 34, CARD_BOARD: 35, MOBA: 36,
};

// IGDB Theme IDs (verified)
export const IGDB_THEMES = {
  ACTION: 1, FANTASY: 17, SCI_FI: 18, HORROR: 19, THRILLER: 20,
  SURVIVAL: 21, HISTORICAL: 22, STEALTH: 23, COMEDY: 27, SANDBOX: 33,
  OPEN_WORLD: 38, WARFARE: 39, FOUR_X: 41, MYSTERY: 43,
};

export const getDetails = async (_mediaType, id) => {
  const res = await axios.get(`${API}/games/details/${id}`);
  return res.data;
};

export const getVideos = async (_mediaType, id) => {
  try {
    const res = await axios.get(`${API}/games/videos/${id}`);
    return res.data || [];
  } catch {
    return [];
  }
};

export const search = async (query) => unwrap(await axios.get(`${API}/games/search?q=${encodeURIComponent(query)}`));

export const getMostPopular = async () => unwrap(await axios.get(`${API}/games/most-popular?limit=30`));
export const getTop10 = async () => unwrap(await axios.get(`${API}/games/top10`));

export const getGOTY = async (year) => {
  const url = year ? `${API}/games/goty?year=${year}` : `${API}/games/goty`;
  const res = await axios.get(url);
  return res.data?.results || [];
};

export const getNowPlaying = async () => unwrap(await axios.get(`${API}/games/new-releases?limit=30`));
export const getGenres = async () => [];

const tmdbApi = axios.create({ baseURL: API });
export default tmdbApi;
