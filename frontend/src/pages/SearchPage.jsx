import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import ContentCard from '../components/ContentCard';
import ContentModal from '../components/ContentModal';
import VideoPlayer from '../components/VideoPlayer';
import Footer from '../components/Footer';
import { search as searchGames } from '../services/games';

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const isDirect = searchParams.get('direct') === 'true';
  const directId = searchParams.get('id');

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (isDirect && directId && results.length > 0) {
      const match = results.find((g) => String(g.id) === String(directId));
      if (match) {
        setSelectedContent(match);
        setModalOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, isDirect, directId]);

  const runSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchGames(query);
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
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
    <div className="min-h-screen bg-black" data-testid="search-page">
      <Navbar />
      <BackNavigation />

      <div className="px-6 lg:px-12 max-w-[1920px] mx-auto pt-24">
        <h1 className="text-3xl font-bold text-white mb-8">
          {query ? `Search results for "${query}"` : 'Search Games'}
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <div className="flex flex-wrap gap-4 pb-20">
            {results.map((item) => (
              <ContentCard key={item.id} content={item} onClick={handleCardClick} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-white/70 text-lg mb-6">
              {query ? `No games found for "${query}"` : 'Start typing to search games...'}
            </p>
            {query && (
              <a
                href={`/request-content?title=${encodeURIComponent(query)}`}
                data-testid="search-request-missing-game"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                📥 Didn't find it? Request "{query}"
              </a>
            )}
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
