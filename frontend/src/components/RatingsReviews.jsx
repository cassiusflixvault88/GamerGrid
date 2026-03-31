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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const handleStarClick = (starValue) => {
      if (!readonly && onChange) {
        console.log(`⭐ Star ${starValue} clicked! Current value: ${value}`);
        onChange(starValue);
      }
    };

    return (
      <div className="flex gap-3 relative" style={{ zIndex: 9999, position: 'relative' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <div
            key={star}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
            onPointerDown={(e) => {
              if (readonly) return;
              e.preventDefault();
              e.stopPropagation();
              console.log(`⭐ Pointer down on star ${star}`);
              handleStarClick(star);
            }}
            onTouchStart={(e) => {
              if (readonly) return;
              e.preventDefault();
              e.stopPropagation();
              console.log(`⭐ Touch start on star ${star}`);
              handleStarClick(star);
            }}
            onClick={(e) => {
              if (readonly) return;
              e.preventDefault();
              e.stopPropagation();
              console.log(`⭐ Click on star ${star}`);
              handleStarClick(star);
            }}
            className={`
              min-w-[56px] min-h-[56px] flex items-center justify-center
              ${readonly ? 'cursor-default' : 'cursor-pointer active:opacity-75'} 
              transition-opacity
            `}
            style={{ 
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'rgba(255, 255, 255, 0.3)',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              position: 'relative',
              zIndex: 9999
            }}
            role="button"
            tabIndex={readonly ? -1 : 0}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              className={`w-12 h-12 ${
                star <= (hover || value)
                  ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg'
                  : 'text-gray-500'
              }`}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overall Rating Display - FlixVault Style */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-center">
                <div className="text-5xl font-bold text-yellow-400">
                  {ratings.average > 0 ? ratings.average.toFixed(1) : 'N/A'}
                </div>
                <p className="text-yellow-400/80 text-xs font-semibold mt-1">VAULT SCORE</p>
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
        <div 
          className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4 relative" 
          style={{ zIndex: 9998, position: 'relative', isolation: 'isolate' }}
        >
          <h4 className="text-white font-semibold text-lg">Your Review for {contentTitle}</h4>
          
          <div className="relative" style={{ zIndex: 9999, position: 'relative' }}>
            <label className="text-white/90 text-base mb-4 block font-bold">
              ⭐ Your Rating (Tap a star below)
            </label>
            <StarRating value={rating} onChange={setRating} />
            {rating > 0 && (
              <p className="text-yellow-400 text-base mt-3 font-semibold animate-pulse">
                ✓ You selected {rating} star{rating > 1 ? 's' : ''}!
              </p>
            )}
            {rating === 0 && (
              <p className="text-red-400 text-sm mt-3">
                👆 Please tap a star above to rate (required)
              </p>
            )}
          </div>
          
          <div style={{ touchAction: 'auto' }}>
            <label className="text-white/90 text-sm mb-2 block">Your Review (Optional)</label>
            <Textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your thoughts about this movie/show..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
              style={{ touchAction: 'auto' }}
              onTouchStart={(e) => {
                // Allow default behavior for textarea
                e.stopPropagation();
              }}
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
