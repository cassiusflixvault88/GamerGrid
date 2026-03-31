import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import ContentCard from '../components/ContentCard';
import ContentModal from '../components/ContentModal';
import VideoPlayer from '../components/VideoPlayer';
import Footer from '../components/Footer';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);

  useEffect(() => {
    if (query) {
      searchContent();
    } else {
      // Show all movies if no query
      loadAllMovies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const loadAllMovies = async () => {
    setLoading(true);
    try {
      // Get all movies from your catalog
      const response = await fetch(`${API_URL}/api/catalog/movies?limit=100`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchContent = async () => {
    setLoading(true);
    try {
      // Search through YOUR catalog movies
      const response = await fetch(`${API_URL}/api/catalog/movies?limit=100`);
      const data = await response.json();
      const allMovies = data.results || [];
      
      // Filter movies that match search query
      const filtered = allMovies.filter(movie => {
        const title = movie.title?.toLowerCase() || '';
        const overview = movie.overview?.toLowerCase() || '';
        const searchTerm = query.toLowerCase();
        return title.includes(searchTerm) || overview.includes(searchTerm);
      });
      
      setResults(filtered);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (content) => {
    setSelectedContent(content);
    setModalOpen(true);
  };

  const handlePlayTrailer = (video) => {
    setCurrentVideo(video);
    setVideoPlayerOpen(true);
    setModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <BackNavigation />
      
      <div className="px-6 lg:px-12 max-w-[1920px] mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          {query ? `Search results for "${query}"` : 'Search'}
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-20">
            {results.map((item) => (
              <ContentCard 
                key={item.id} 
                content={{...item, media_type: item.media_type || 'movie'}} 
                onClick={handleCardClick} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-white/70 text-lg">
              {query ? `No results found for "${query}"` : 'Start typing to search movies...'}
            </p>
          </div>
        )}
      </div>

      <ContentModal
        content={selectedContent}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onPlayTrailer={handlePlayTrailer}
        onSelectContent={(content) => {
          setSelectedContent(content);
          setModalOpen(true);
        }}
      />

      <VideoPlayer
        video={currentVideo}
        isOpen={videoPlayerOpen}
        onClose={() => {
          setVideoPlayerOpen(false);
          setCurrentVideo(null);
        }}
      />

      <Footer />
    </div>
  );
};

export default SearchPage;
