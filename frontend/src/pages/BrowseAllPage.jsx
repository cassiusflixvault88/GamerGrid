import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import ContentModal from '../components/ContentModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Film, Tv } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BrowseAllPage = () => {
  const [allMovies, setAllMovies] = useState([]);
  const [allSeries, setAllSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      // Fetch 2000 items (mix of movies and series)
      const response = await fetch(`${API_URL}/api/catalog/movies?limit=2000`);
      const data = await response.json();
      const allItems = data.results || [];

      // Separate movies and series
      const movies = allItems.filter(item => item.media_type === 'movie');
      const series = allItems.filter(item => item.media_type === 'tv');

      // Sort by rating
      const sortedMovies = movies.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      const sortedSeries = series.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

      setAllMovies(sortedMovies);
      setAllSeries(sortedSeries);

      console.log(`✅ Loaded ${movies.length} movies, ${series.length} series`);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (item) => {
    setSelectedContent(item);
  };

  const renderGrid = (items) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((item) => (
        <div
          key={item.id}
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
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
      <Navbar />
      <BackNavigation />

      <div className="max-w-7xl mx-auto px-4 py-8 mt-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            🎬 Browse All Content
          </h1>
          <p className="text-white/60 text-lg">Discover 10,000+ movies and TV shows</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-white text-xl">Loading content...</div>
          </div>
        ) : (
          <Tabs defaultValue="movies" className="w-full">
            <TabsList className="bg-white/10 border border-white/20 mb-8">
              <TabsTrigger value="movies" className="data-[state=active]:bg-purple-600">
                <Film className="w-4 h-4 mr-2" />
                Movies ({allMovies.length})
              </TabsTrigger>
              <TabsTrigger value="series" className="data-[state=active]:bg-purple-600">
                <Tv className="w-4 h-4 mr-2" />
                TV Series ({allSeries.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="movies">
              {allMovies.length > 0 ? (
                renderGrid(allMovies)
              ) : (
                <p className="text-white/60 text-center py-12">No movies found</p>
              )}
            </TabsContent>

            <TabsContent value="series">
              {allSeries.length > 0 ? (
                renderGrid(allSeries)
              ) : (
                <p className="text-white/60 text-center py-12">No series found</p>
              )}
            </TabsContent>
          </Tabs>
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
