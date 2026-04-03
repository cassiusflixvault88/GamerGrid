import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SearchAutocomplete = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allMovies, setAllMovies] = useState([]);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  // Load all movies once on mount
  useEffect(() => {
    const loadAllMovies = async () => {
      try {
        const response = await fetch(`${API_URL}/api/catalog/movies?limit=1000`);
        const data = await response.json();
        setAllMovies(data.results || []);
        console.log(`🔍 Loaded ${data.results?.length || 0} movies for search`);
      } catch (error) {
        console.error('Error loading movies for search:', error);
      }
    };
    loadAllMovies();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search YOUR catalog as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setLoading(true);
      try {
        const searchTerm = query.toLowerCase();
        const filtered = allMovies.filter(movie => {
          const title = (movie.title || movie.name || '').toLowerCase();
          const overview = (movie.overview || '').toLowerCase();
          return title.includes(searchTerm) || overview.includes(searchTerm);
        });
        
        // Sort by relevance (title match first, then by popularity)
        const sorted = filtered.sort((a, b) => {
          const aTitle = (a.title || a.name || '').toLowerCase();
          const bTitle = (b.title || b.name || '').toLowerCase();
          const aStartsWith = aTitle.startsWith(searchTerm);
          const bStartsWith = bTitle.startsWith(searchTerm);
          
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;
          return (b.popularity || 0) - (a.popularity || 0);
        });
        
        setSuggestions(sorted.slice(0, 20)); // Show top 20
        setShowSuggestions(true);
        console.log(`Found ${sorted.length} movies matching "${query}"`);
      } catch (error) {
        console.error('Search autocomplete error:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300); // Debounce 300ms
    return () => clearTimeout(debounce);
  }, [query, allMovies]);

  const handleSuggestionClick = (item) => {
    setQuery('');
    setShowSuggestions(false);
    setSuggestions([]);
    // Navigate with exact title to open modal directly
    navigate(`/search?q=${encodeURIComponent(item.title || item.name)}&direct=true&id=${item.id}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setShowSuggestions(false);
      setQuery('');
    }
  };

  const getImageUrl = (path) => {
    if (!path) return '/placeholder-poster.png';
    return `https://image.tmdb.org/t/p/w92${path}`;
  };

  return (
    <div className="relative w-full max-w-xl" ref={wrapperRef}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies, shows..."
          className="w-full px-4 py-2 pl-10 pr-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-500 transition-colors"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setShowSuggestions(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Autocomplete Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full mt-2 w-full bg-gray-900 border border-white/20 rounded-lg shadow-2xl max-h-[500px] overflow-y-auto z-50">
          {loading ? (
            <div className="p-4 text-center text-white/50">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
            </div>
          ) : suggestions.length > 0 ? (
            <div className="py-2">
              {suggestions.map((item) => {
                const title = item.title || item.name;
                const year = item.release_date || item.first_air_date;
                const mediaType = item.media_type || 'movie';

                return (
                  <button
                    key={`${item.id}-${mediaType}`}
                    onClick={() => handleSuggestionClick(item)}
                    className="w-full px-4 py-2 hover:bg-white/10 flex items-center gap-3 transition-colors text-left"
                  >
                    {/* Poster Image */}
                    <img
                      src={getImageUrl(item.poster_path)}
                      alt={title}
                      className="w-12 h-16 object-cover rounded"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="64"%3E%3Crect width="48" height="64" fill="%23374151"/%3E%3C/svg%3E';
                      }}
                    />
                    
                    {/* Title & Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{title}</p>
                      <p className="text-white/50 text-sm">
                        {year ? year.substring(0, 4) : 'N/A'} • {mediaType === 'tv' ? 'TV Show' : 'Movie'}
                      </p>
                    </div>

                    {/* Rating */}
                    {item.vote_average > 0 && (
                      <div className="flex items-center gap-1 text-yellow-400 text-sm">
                        <span>⭐</span>
                        <span>{item.vote_average.toFixed(1)}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-white/50">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
