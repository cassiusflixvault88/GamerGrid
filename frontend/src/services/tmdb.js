import axios from 'axios';

const TMDB_API_KEYS = [
  'c8dea14dc917687ac631a52620e4f7ad',
  '3cb41ecea3bf606c56552db3d17adefd'
];

let currentKeyIndex = 0;

const getApiKey = () => TMDB_API_KEYS[currentKeyIndex];

const rotateApiKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % TMDB_API_KEYS.length;
};

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

const tmdbApi = axios.create({
  baseURL: BASE_URL,
});

tmdbApi.interceptors.request.use((config) => {
  config.params = {
    ...config.params,
    api_key: getApiKey(),
  };
  return config;
});

tmdbApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      rotateApiKey();
      return tmdbApi.request(error.config);
    }
    return Promise.reject(error);
  }
);

export const getImageUrl = (path, size = 'original') => {
  if (!path) return '/placeholder.jpg';
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

export const getTrending = async (mediaType = 'all', timeWindow = 'week') => {
  const response = await tmdbApi.get(`/trending/${mediaType}/${timeWindow}`);
  return response.data.results;
};

export const getPopular = async (mediaType = 'movie') => {
  const response = await tmdbApi.get(`/${mediaType}/popular`);
  return response.data.results;
};

export const getTopRated = async (mediaType = 'movie') => {
  const response = await tmdbApi.get(`/${mediaType}/top_rated`);
  return response.data.results;
};

export const getGenres = async (mediaType = 'movie') => {
  const response = await tmdbApi.get(`/genre/${mediaType}/list`);
  return response.data.genres;
};

export const getByGenre = async (genreId, mediaType = 'movie') => {
  const response = await tmdbApi.get(`/discover/${mediaType}`, {
    params: { with_genres: genreId },
  });
  return response.data.results;
};

export const getDetails = async (mediaType, id) => {
  const response = await tmdbApi.get(`/${mediaType}/${id}`, {
    params: { append_to_response: 'videos,credits,similar' },
  });
  return response.data;
};

export const getVideos = async (mediaType, id) => {
  const response = await tmdbApi.get(`/${mediaType}/${id}/videos`);
  return response.data.results;
};

export const search = async (query) => {
  const response = await tmdbApi.get('/search/multi', {
    params: { query },
  });
  return response.data.results;
};

export default tmdbApi;
