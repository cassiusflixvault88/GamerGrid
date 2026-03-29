import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, MessageSquare, ThumbsUp } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RatingsReviews = ({ contentId, contentTitle }) => {
  const [ratings, setRatings] = useState({ average: 0, count: 0, ratings: [] });
  const [userRating, setUserRating] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadRatings();
    if (user) {
      loadUserRating();
    }
  }, [contentId, user]);

  const loadRatings = async () => {
    try {
      const response = await axios.get(`${API}/ratings/${contentId}`);
      setRatings(response.data);
    } catch (error) {
      console.error('Error loading ratings:', error);
    }
  };

  const loadUserRating = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/ratings/user/content/${contentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setUserRating(response.data);
        setRating(response.data.rating);
        setReview(response.data.review || '');
      }
    } catch (error) {
      console.error('Error loading user rating:', error);
    }
  };

  const handleSubmitRating = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to rate content',
        variant: 'destructive',
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: 'Select a rating',
        description: 'Please select a star rating',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/ratings`,
        { content_id: contentId, rating, review: review || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: 'Rating submitted!',
        description: 'Thank you for your review',
      });
      
      setShowReviewForm(false);
      loadRatings();
      loadUserRating();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to submit rating',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ value, onChange, readonly = false }) => {
    const [hover, setHover] = useState(0);

    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
            onClick={() => !readonly && onChange && onChange(star)}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer'} transition-transform hover:scale-110`}
          >
            <Star
              className={`w-6 h-6 ${
                star <= (hover || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-white/30'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overall Rating Display (Rotten Tomatoes style) */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <div className="text-5xl font-bold text-yellow-400">
                {ratings.average > 0 ? ratings.average.toFixed(1) : 'N/A'}
              </div>
              <div>
                <StarRating value={Math.round(ratings.average)} readonly />
                <p className="text-white/70 text-sm mt-1">
                  {ratings.count} {ratings.count === 1 ? 'review' : 'reviews'}
                </p>
              </div>
            </div>
          </div>
          
          {user && (
            <Button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              {userRating ? 'Update Review' : 'Write a Review'}
            </Button>
          )}
          
          {!user && (
            <p className="text-white/70 text-sm">Sign in to review</p>
          )}
        </div>
      </div>

      {/* Review Form */}
      {showReviewForm && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
          <h4 className="text-white font-semibold text-lg">Your Review for {contentTitle}</h4>
          
          <div>
            <label className="text-white/90 text-sm mb-2 block">Your Rating</label>
            <StarRating value={rating} onChange={setRating} />
          </div>
          
          <div>
            <label className="text-white/90 text-sm mb-2 block">Your Review (Optional)</label>
            <Textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your thoughts about this movie/show..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
            />
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleSubmitRating}
              disabled={loading || rating === 0}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              {loading ? 'Submitting...' : (userRating ? 'Update' : 'Submit Review')}
            </Button>
            <Button
              onClick={() => setShowReviewForm(false)}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {ratings.ratings && ratings.ratings.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-white font-semibold text-lg flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            User Reviews ({ratings.count})
          </h4>
          
          {ratings.ratings.map((r) => (
            <div
              key={r.id}
              className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {r.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{r.username}</p>
                    <StarRating value={r.rating} readonly />
                  </div>
                </div>
                <p className="text-white/50 text-xs">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              
              {r.review && (
                <p className="text-white/80 text-sm mt-3">{r.review}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RatingsReviews;
