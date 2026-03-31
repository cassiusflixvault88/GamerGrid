import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import { Star } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AppReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const response = await axios.get(`${API}/app-reviews`);
      setReviews(response.data.reviews);
      setAverageRating(response.data.average_rating);
      setTotalReviews(response.data.total);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to leave a review',
        variant: 'destructive',
      });
      return;
    }

    if (userRating === 0) {
      toast({
        title: 'Rating required',
        description: 'Please select a star rating',
        variant: 'destructive',
      });
      return;
    }

    if (!userReview.trim()) {
      toast({
        title: 'Review required',
        description: 'Please write a review',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/app-reviews/submit`,
        { rating: userRating, review: userReview },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({
        title: 'Success!',
        description: 'Your review has been submitted',
      });

      setUserRating(0);
      setUserReview('');
      
      // Force refresh reviews
      setTimeout(() => {
        loadReviews();
      }, 500);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to submit review',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating, interactive = false, onHover = null, onClick = null) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-6 h-6 ${
              star <= (interactive ? (hoverRating || userRating) : rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-400'
            } ${interactive ? 'cursor-pointer transition-all' : ''}`}
            onMouseEnter={() => interactive && onHover && onHover(star)}
            onMouseLeave={() => interactive && onHover && onHover(0)}
            onClick={() => interactive && onClick && onClick(star)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      <Navbar />
      <BackNavigation />

      <div className="container mx-auto px-4 pb-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Rate <span className="text-purple-500">FlixVault</span>
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            Share your experience with FlixVault - our movie discovery and trailer app!
          </p>

          {/* Average Rating Display */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <span className="text-5xl font-bold text-yellow-400">
                {averageRating.toFixed(1)}
              </span>
              {renderStars(Math.round(averageRating))}
            </div>
            <p className="text-gray-400">
              Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
            </p>
          </div>
        </div>

        {/* Review Submission Form */}
        {user ? (
          <Card className="bg-white/5 border-white/10 p-6 mb-12 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-4">Leave Your Review</h3>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Your Rating</label>
              {renderStars(
                userRating,
                true,
                setHoverRating,
                setUserRating
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Your Review</label>
              <Textarea
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
                placeholder="Tell us what you think about FlixVault..."
                className="bg-white/5 border-white/20 text-white min-h-[120px]"
                rows={5}
              />
            </div>

            <Button
              onClick={handleSubmitReview}
              disabled={submitting || userRating === 0 || !userReview.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </Card>
        ) : (
          <Card className="bg-white/5 border-white/10 p-6 mb-12 max-w-2xl mx-auto text-center">
            <p className="text-gray-400">Please sign in to leave a review</p>
          </Card>
        )}

        {/* Reviews List */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Community Reviews</h2>
          
          {loading ? (
            <p className="text-center text-gray-400">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <Card className="bg-white/5 border-white/10 p-8 text-center">
              <p className="text-gray-400">No reviews yet. Be the first to review FlixVault!</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id} className="bg-white/5 border-white/10 p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-lg">{review.username}</p>
                      <p className="text-sm text-gray-400">
                        {new Date(review.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                  <p className="text-gray-300">{review.review}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AppReviewsPage;
