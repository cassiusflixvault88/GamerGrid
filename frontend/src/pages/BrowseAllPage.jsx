import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import ContentModal from '../components/ContentModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BrowseAllPage = () => {
  const [allContent, setAllContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);

  useEffect(() => {
    loadAllContent();
  }, []);

  const loadAllContent = async () => {
    try {
      // Fetch multiple pages to get both movies AND series
      const page1 = await fetch(`${API_URL}/api/catalog/movies?limit=1000&page=1`);
      const data1 = await page1.json();
      
      const page3 = await fetch(`${API_URL}/api/catalog/movies?limit=1000&page=3`);
      const data3 = await page3.json();
      
      // Combine both pages (movies from page 1, series from page 3)
      const allItems = [...(data1.results || []), ...(data3.results || [])];
      
      // Sort by rating
      const sorted = allItems.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      
      setAllContent(sorted);
      
      const movies = sorted.filter(x => x.media_type === 'movie');
      const series = sorted.filter(x => x.media_type === 'tv');
      console.log(`✅ Loaded ${movies.length} movies + ${series.length} series = ${sorted.length} total`);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (item) => {
    setSelectedContent(item);
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

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-white text-xl">Loading content...</div>
          </div>
        ) : (
          <div>
            <p className="text-white/80 mb-6">
              Showing {allContent.length} top-rated movies and series
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {allContent.map((item) => (
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
