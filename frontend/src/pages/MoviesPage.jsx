import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ContentCard from '../components/ContentCard';
import ContentModal from '../components/ContentModal';
import VideoPlayer from '../components/VideoPlayer';
import Footer from '../components/Footer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MoviesPage = () => {
  const [allMovies, setAllMovies] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [action, setAction] = useState([]);
  const [comedy, setComedy] = useState([]);
  const [horror, setHorror] = useState([]);
  const [sciFi, setSciFi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async () => {
    try {
      // Load ALL movies from YOUR catalog (446+ movies)
      const response = await fetch(`${API_URL}/api/catalog/movies?limit=1000`);
      const data = await response.json();
      const movies = data.results || [];
      
      setAllMovies(movies);
      
      // Sort by popularity for "Popular" tab
      const popularMovies = [...movies].sort((a, b) => b.popularity - a.popularity);
      setPopular(popularMovies);
      
      // Sort by rating for "Top Rated" tab
      const topRatedMovies = [...movies]
        .filter(m => m.vote_average > 0)
        .sort((a, b) => b.vote_average - a.vote_average);
      setTopRated(topRatedMovies);
      
      // Filter by genre
      const actionMovies = movies.filter(m => m.genre_ids?.includes(28)); // Action
      const comedyMovies = movies.filter(m => m.genre_ids?.includes(35)); // Comedy
      const horrorMovies = movies.filter(m => m.genre_ids?.includes(27)); // Horror
      const sciFiMovies = movies.filter(m => m.genre_ids?.includes(878)); // Sci-Fi
      
      setAction(actionMovies);
      setComedy(comedyMovies);
      setHorror(horrorMovies);
      setSciFi(sciFiMovies);
      
      console.log(`✅ Loaded ${movies.length} movies from FlixVault catalog`);
    } catch (error) {
      console.error('Error loading movies:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-24 px-6 lg:px-12 max-w-[1920px] mx-auto pb-20">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">All Movies</h1>
          <p className="text-white/60">Browse our complete collection of movies with trailers</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-white/10 border border-white/20 mb-8 flex-wrap">
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">
              All Movies ({allMovies.length})
            </TabsTrigger>
            <TabsTrigger value="popular" className="data-[state=active]:bg-purple-600">
              Popular
            </TabsTrigger>
            <TabsTrigger value="top-rated" className="data-[state=active]:bg-purple-600">
              Top Rated
            </TabsTrigger>
            <TabsTrigger value="action" className="data-[state=active]:bg-purple-600">
              Action ({action.length})
            </TabsTrigger>
            <TabsTrigger value="comedy" className="data-[state=active]:bg-purple-600">
              Comedy ({comedy.length})
            </TabsTrigger>
            <TabsTrigger value="horror" className="data-[state=active]:bg-purple-600">
              Horror ({horror.length})
            </TabsTrigger>
            <TabsTrigger value="sci-fi" className="data-[state=active]:bg-purple-600">
              Sci-Fi ({sciFi.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {allMovies.map((item) => (
                <ContentCard key={item.id} content={item} onClick={handleCardClick} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="popular">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {popular.map((item) => (
                <ContentCard key={item.id} content={item} onClick={handleCardClick} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="top-rated">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {topRated.map((item) => (
                <ContentCard key={item.id} content={item} onClick={handleCardClick} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="action">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {action.map((item) => (
                <ContentCard key={item.id} content={item} onClick={handleCardClick} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="comedy">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {comedy.map((item) => (
                <ContentCard key={item.id} content={item} onClick={handleCardClick} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="horror">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {horror.map((item) => (
                <ContentCard key={item.id} content={item} onClick={handleCardClick} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sci-fi">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {sciFi.map((item) => (
                <ContentCard key={item.id} content={item} onClick={handleCardClick} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ContentModal
        content={selectedContent}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onPlayTrailer={handlePlayTrailer}
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

export default MoviesPage;
