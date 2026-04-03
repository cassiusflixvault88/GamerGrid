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
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingRatingId, setEditingRatingId] = useState(null);
  const [replyingToAdminId, setReplyingToAdminId] = useState(null);
  const [replyText, setReplyText] = useState('');
  
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
      console.log(`📊 Loading ratings for content_id: ${contentId}`);
      const response = await axios.get(`${API}/ratings/${contentId}`);
      console.log(`✅ Loaded ratings:`, response.data);
      setRatings(response.data);
    } catch (error) {
      console.error('❌ Error loading ratings:', error);
      setRatings({ average: 0, count: 0, ratings: [] });
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
      console.log(`💾 ${editingRatingId ? 'Updating' : 'Submitting'} rating for content_id ${contentId}: ${rating}★`);
      
      if (editingRatingId) {
        // Update existing rating
        await axios.put(
          `${API}/ratings/${editingRatingId}`,
          { content_id: contentId, content_title: contentTitle, rating, review: review || null },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log(`✅ Rating updated successfully`);
        toast({ title: 'Updated!', description: 'Your review has been updated' });
      } else {
        // Create new rating
        const response = await axios.post(
          `${API}/ratings`,
          { 
            content_id: contentId, 
            content_title: contentTitle,
            rating, 
            review: review || null 
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log(`✅ Rating submitted successfully:`, response.data);
        toast({ title: 'Rating submitted!', description: 'Thank you for your review' });
      }
      
      // Close form and reset
      setShowReviewForm(false);
      setEditingRatingId(null);
      setRating(0);
      setReview('');
      
      // Force reload ratings
      setTimeout(async () => {
        console.log('🔄 Reloading ratings after submission...');
        await loadRatings();
        await loadUserRating();
        console.log('✅ Ratings reloaded!');
      }, 500);
      
    } catch (error) {
      console.error('❌ Error submitting rating:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to submit rating',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditReview = (ratingData) => {
    setEditingRatingId(ratingData.id);
    setRating(ratingData.rating);
    setReview(ratingData.review || '');
    setShowReviewForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteReview = async (ratingId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/ratings/${ratingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({ title: 'Success', description: 'Review deleted successfully' });
      loadRatings();
      loadUserRating();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete review',
        variant: 'destructive',
      });
    }
  };

  const handleReplyToAdmin = async (adminReplyId) => {
    if (!replyText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/user-reply-to-admin`,
        { admin_reply_id: adminReplyId, reply_text: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({ title: 'Success', description: 'Reply posted successfully' });
      setReplyText('');
      setReplyingToAdminId(null);
      loadRatings();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post reply',
        variant: 'destructive',
      });
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
        <div className="space-y-4" key={`reviews-${ratings.count}-${contentId}`}>
          <h4 className="text-white font-semibold text-lg flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            User Reviews ({ratings.count})
          </h4>
          
          {ratings.ratings.map((r, index) => {
            console.log(`🎬 Rendering rating ${index}:`, {
              id: r.id,
              username: r.username,
              admin_replies_count: r.admin_replies?.length || 0,
              admin_replies: r.admin_replies
            });
            
            return (
            <div
              key={`${r.id}-${index}`}
              className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2 animate-fadeIn"
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
                <div className="flex items-center gap-2">
                  <p className="text-white/50 text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                  {/* Edit/Delete buttons for own reviews */}
                  {user && user.id === r.user_id && (
                    <div className="flex gap-1">
                      <Button
                        onClick={() => handleEditReview(r)}
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteReview(r.id)}
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {r.review && (
                <p className="text-white/80 text-sm mt-3">{r.review}</p>
              )}
              
              {/* Admin Replies */}
              {r.admin_replies && r.admin_replies.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {console.log(`✅ Rendering ${r.admin_replies.length} admin replies for rating ${r.id}`)}
                  {r.admin_replies.map((reply, replyIdx) => (
                    <div key={reply.id || replyIdx} className="space-y-2">
                      <div className="pl-4 border-l-4 border-yellow-500 bg-yellow-900/10 p-4 rounded">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded">
                            👑 ADMIN
                          </span>
                          <span className="text-yellow-400 font-semibold text-sm">
                            {reply.admin_username}
                          </span>
                        </div>
                        <p className="text-white/90 text-sm">{reply.reply_text}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-white/40 text-xs">
                            {new Date(reply.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                          {/* Reply to Admin button */}
                          {user && (
                            <Button
                              onClick={() => setReplyingToAdminId(replyingToAdminId === reply.id ? null : reply.id)}
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20"
                            >
                              {replyingToAdminId === reply.id ? 'Cancel' : 'Reply'}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Reply form */}
                      {replyingToAdminId === reply.id && (
                        <div className="ml-8 p-3 bg-white/5 border border-white/10 rounded">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Reply to admin..."
                            className="bg-white/10 border-white/20 text-white mb-2"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => {
                                setReplyingToAdminId(null);
                                setReplyText('');
                              }}
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleReplyToAdmin(reply.id)}
                              size="sm"
                              className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs"
                              disabled={!replyText.trim()}
                            >
                              Post Reply
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                console.log(`❌ No admin replies for rating ${r.id}`)
              )}
            </div>
            );
          })}
        </div>
      )}
      
      {/* No Reviews Yet Message */}
      {(!ratings.ratings || ratings.ratings.length === 0) && !showReviewForm && (
        <div className="text-center py-8 bg-white/5 border border-white/10 rounded-lg">
          <MessageSquare className="w-12 h-12 mx-auto text-white/30 mb-3" />
          <p className="text-white/70 text-sm mb-2">No reviews yet</p>
          <p className="text-white/50 text-xs">Be the first to review {contentTitle}!</p>
        </div>
      )}
    </div>
  );
};

export default RatingsReviews;
