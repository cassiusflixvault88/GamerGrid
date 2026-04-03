import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import ContentModal from '../components/ContentModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BrowseAllPage = () => {
  const [allContent, setAllContent] = useState([]);
  const [filteredContent, setFilteredContent] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);

  useEffect(() => {
    loadAllContent();
  }, []);

  useEffect(() => {
    // Filter content based on search query
    if (searchQuery.trim() === '') {
      setFilteredContent(allContent);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allContent.filter(item => {
        const title = (item.title || item.name || '').toLowerCase();
        return title.includes(query);
      });
      setFilteredContent(filtered);
    }
  }, [searchQuery, allContent]);

  const loadAllContent = async () => {
    try {
      // Fetch ALL items in multiple batches to avoid timeout
      // Catalog has ~9,937 items total (page 1: 0-2999, page 2: 3000-5999, page 3: 6000-8999, page 4: 9000+)
      const [data1, data2, data3, data4] = await Promise.all([
        fetch(`${API_URL}/api/catalog/movies?limit=2500&page=1`).then(r => r.json()),
        fetch(`${API_URL}/api/catalog/movies?limit=2500&page=2`).then(r => r.json()),
        fetch(`${API_URL}/api/catalog/movies?limit=2500&page=3`).then(r => r.json()),
        fetch(`${API_URL}/api/catalog/movies?limit=2500&page=4`).then(r => r.json()),
      ]);
      
      // Combine all results
      const allItems = [
        ...(data1.results || []),
        ...(data2.results || []),
        ...(data3.results || []),
        ...(data4.results || [])
      ];
      
      console.log(`📥 Fetched ${allItems.length} total items from catalog`);
      
      // Remove duplicates by unique ID
      const uniqueItems = [];
      const seenIds = new Set();
      
      for (const item of allItems) {
        const uniqueKey = `${item.media_type}-${item.id}`;
        if (!seenIds.has(uniqueKey)) {
          seenIds.add(uniqueKey);
          uniqueItems.push(item);
        }
      }
      
      console.log(`🔍 Removed ${allItems.length - uniqueItems.length} duplicates`);
      
      // Sort: English content first, then by rating (highest first)
      const sorted = uniqueItems.sort((a, b) => {
        const aIsEnglish = a.original_language === 'en' ? 1 : 0;
        const bIsEnglish = b.original_language === 'en' ? 1 : 0;
        
        // Prioritize English content
        if (aIsEnglish !== bIsEnglish) {
          return bIsEnglish - aIsEnglish;
        }
        
        // Then sort by rating
        return (b.vote_average || 0) - (a.vote_average || 0);
      });
      
      setAllContent(sorted);
      setFilteredContent(sorted);
      
      const movies = sorted.filter(x => x.media_type === 'movie');
      const series = sorted.filter(x => x.media_type === 'tv');
      const englishContent = sorted.filter(x => x.original_language === 'en');
      
      console.log(`✅ Loaded ${movies.length} movies + ${series.length} series = ${sorted.length} total (${englishContent.length} English)`);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (item) => {
    setSelectedContent(item);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
      <Navbar />
      <BackNavigation />

      <div className="max-w-7xl mx-auto px-4 py-8 mt-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            🎬 Browse All
          </h1>
          <p className="text-white/60 text-lg">Discover 10,000+ movies and TV shows</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search movies and TV shows..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-white text-xl">Loading content...</div>
          </div>
        ) : (
          <div>
            <p className="text-white/80 mb-6">
              Showing {filteredContent.length} {searchQuery ? 'results' : 'top-rated movies and series'}
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredContent.map((item) => (
                <div
                  key={`${item.media_type}-${item.id}`}
                  onClick={() => handleCardClick(item)}
                  className="group cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-lg bg-gray-800 aspect-[2/3] hover:scale-105 transition-transform duration-200">
                    {item.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                        alt={item.title || item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-700">
                        <span className="text-gray-500 text-xs text-center px-2">
                          {item.title || item.name}
                        </span>
                      </div>
                    )}
                    
                    {/* Media type badge */}
                    <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                      {item.media_type === 'movie' ? '🎬' : '📺'}
                    </div>
                    
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-sm font-semibold text-center px-2">
                        {item.title || item.name}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-white text-sm font-medium truncate">
                      {item.title || item.name}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                      <span>⭐ {item.vote_average?.toFixed(1) || 'N/A'}</span>
                      <span>{(item.release_date || item.first_air_date || '').substring(0, 4)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />

      {selectedContent && (
        <ContentModal
          content={selectedContent}
          isOpen={!!selectedContent}
          onClose={() => setSelectedContent(null)}
        />
      )}
    </div>
  );
};

export default BrowseAllPage;
