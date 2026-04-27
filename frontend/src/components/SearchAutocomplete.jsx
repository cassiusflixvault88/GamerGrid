import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Flame } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SearchAutocomplete = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [popular, setPopular] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pre-load popular games once for the empty-state suggestions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pop, trend, fresh] = await Promise.all([
          axios.get(`${API}/games/most-popular?limit=8`).then((r) => r.data?.results || []).catch(() => []),
          axios.get(`${API}/games/trending?limit=6`).then((r) => r.data?.results || []).catch(() => []),
          axios.get(`${API}/games/new-releases?limit=6`).then((r) => r.data?.results || []).catch(() => []),
        ]);
        if (cancelled) return;
        const seen = new Set();
        const merged = [...pop, ...trend, ...fresh].filter((g) => {
          if (!g || seen.has(g.id)) return false;
          seen.add(g.id);
          return true;
        }).slice(0, 18);
        setPopular(merged);
      } catch (e) {
        // ignore — empty state will just be a hint
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const res = await axios.get(`${API}/games/search?q=${encodeURIComponent(query)}&limit=15`);
        const results = res.data?.results || [];
        setSuggestions(results);
      } catch (e) {
        console.error('Search error:', e);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSuggestionClick = (item) => {
    setQuery('');
    setShowSuggestions(false);
    setSuggestions([]);
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

  const imageFallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="64"%3E%3Crect width="48" height="64" fill="%23374151"/%3E%3C/svg%3E';

  return (
    <div className="relative w-full max-w-xl" ref={wrapperRef}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search games..."
          data-testid="search-autocomplete-input"
          className="w-full px-4 py-2 pl-10 pr-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-500 transition-colors"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {showSuggestions && (
        <div className="absolute top-full mt-2 w-full bg-gray-900 border border-white/20 rounded-lg shadow-2xl max-h-[500px] overflow-y-auto z-50">
          {loading ? (
            <div className="p-4 text-center text-white/50">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
            </div>
          ) : query.trim().length >= 2 ? (
            suggestions.length > 0 ? (
              <div className="py-2">
                {suggestions.map((item) => {
                  const title = item.title || item.name;
                  const year = (item.release_date || '').substring(0, 4);
                  const platforms = (item.platforms || []).slice(0, 2).join(', ');
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSuggestionClick(item)}
                      className="w-full px-4 py-2 hover:bg-white/10 flex items-center gap-3 transition-colors text-left"
                      data-testid={`search-suggestion-${item.id}`}
                    >
                      <img
                        src={item.poster_path || imageFallback}
                        alt={title}
                        className="w-12 h-16 object-cover rounded"
                        onError={(e) => {
                          e.target.src = imageFallback;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{title}</p>
                        <p className="text-white/50 text-sm truncate">
                          {year || 'N/A'}{platforms ? ` • ${platforms}` : ''}
                        </p>
                      </div>
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
              <div className="p-4 text-center text-white/50">No results found</div>
            )
          ) : popular.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider border-b border-white/10">
                <Flame className="w-3.5 h-3.5" />
                Popular &amp; Trending Right Now
              </div>
              {popular.map((item) => {
                const title = item.title || item.name;
                const year = (item.release_date || '').substring(0, 4);
                const platforms = (item.platforms || []).slice(0, 2).join(', ');
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSuggestionClick(item)}
                    className="w-full px-4 py-2 hover:bg-white/10 flex items-center gap-3 transition-colors text-left"
                    data-testid={`search-popular-${item.id}`}
                  >
                    <img
                      src={item.poster_path || imageFallback}
                      alt={title}
                      className="w-12 h-16 object-cover rounded"
                      onError={(e) => {
                        e.target.src = imageFallback;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{title}</p>
                      <p className="text-white/50 text-sm truncate">
                        {year || 'N/A'}{platforms ? ` • ${platforms}` : ''}
                      </p>
                    </div>
                    {item.vote_average > 0 && (
                      <div className="flex items-center gap-1 text-yellow-400 text-sm">
                        <span>⭐</span>
                        <span>{item.vote_average.toFixed(1)}</span>
                      </div>
                    )}
                  </button>
                );
              })}
              <div className="px-4 py-2 text-center border-t border-white/10">
                <button
                  type="button"
                  onClick={() => navigate('/games/all')}
                  className="text-purple-300 text-sm font-semibold hover:text-purple-200"
                >
                  Browse all games →
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-white/50 text-sm">Start typing to search games...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
