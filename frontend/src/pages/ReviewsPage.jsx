import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MessageSquare, Film, Tv, Calendar, User } from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ReviewsPage = () => {
  const [allReviews, setAllReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, movies, series
  const navigate = useNavigate();

  useEffect(() => {
    loadAllReviews();
  }, []);

  const loadAllReviews = async () => {
    try {
      setLoading(true);
      // Since we don't have a dedicated "all reviews" endpoint, 
      // we'll need to fetch from multiple content items
      // For now, let's create a simple aggregation
      
      const response = await axios.get(`${API}/reviews/all`);
      setAllReviews(response.data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
      // Fallback: empty array
      setAllReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ value }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-500'
            }`}
          />
        ))}
      </div>
    );
  };

  const filteredReviews = allReviews.filter(review => {
    if (filter === 'all') return true;
    if (filter === 'movies') return review.media_type === 'movie';
    if (filter === 'series') return review.media_type === 'tv';
    return true;
  });

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <BackNavigation />
      
      <main className="px-6 lg:px-12 max-w-6xl mx-auto pb-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <MessageSquare className="w-10 h-10 text-purple-500" />
            All Reviews
          </h1>
          <p className="text-white/60">Community reviews from GamerGrid users</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-8 border-b border-white/10 pb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            All Reviews
          </button>
          <button
            onClick={() => setFilter('movies')}
            className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              filter === 'movies'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <Film className="w-4 h-4" />
            Movies
          </button>
          <button
            onClick={() => setFilter('series')}
            className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              filter === 'series'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <Tv className="w-4 h-4" />
            Series
          </button>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-white/60">Loading reviews...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-lg">
            <MessageSquare className="w-16 h-16 mx-auto text-white/30 mb-4" />
            <p className="text-white/70 text-lg mb-2">No reviews yet</p>
            <p className="text-white/50">Be the first to review content on GamerGrid!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredReviews.map((review, index) => (
              <div
                key={`${review.id}-${index}`}
                className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => navigate(`/movies`)} // TODO: Navigate to specific content
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-bold text-xl mb-2">{review.content_title}</h3>
                    <div className="flex items-center gap-3 text-sm text-white/60">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {review.username}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <StarRating value={review.rating} />
                </div>
                
                {review.review && (
                  <p className="text-white/80 leading-relaxed">{review.review}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {!loading && filteredReviews.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg p-6 text-center">
              <p className="text-4xl font-bold text-white mb-2">{allReviews.length}</p>
              <p className="text-white/70">Total Reviews</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg p-6 text-center">
              <p className="text-4xl font-bold text-white mb-2">
                {(allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length || 0).toFixed(1)}
              </p>
              <p className="text-white/70">Average Rating</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg p-6 text-center">
              <p className="text-4xl font-bold text-white mb-2">
                {new Set(allReviews.map(r => r.username)).size}
              </p>
              <p className="text-white/70">Contributors</p>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default ReviewsPage;
