import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Edit2, Trash2, Send, X, Check } from 'lucide-react';

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

  // Social state per review
  const [reactionCounts, setReactionCounts] = useState({}); // {review_id: {likes, dislikes}}
  const [myReactions, setMyReactions] = useState({}); // {review_id: 'like'|'dislike'|null}
  const [openReplies, setOpenReplies] = useState({}); // {review_id: bool}
  const [repliesByReview, setRepliesByReview] = useState({}); // {review_id: [...]}
  const [replyText, setReplyText] = useState({}); // {review_id: 'text'}
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editingReply, setEditingReply] = useState(null); // {reply_id, text}
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState(0);

  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = Boolean(user?.is_admin);

  const loadReviews = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/app-reviews?t=${Date.now()}`);
      const list = response.data.reviews || [];
      setReviews(list);
      setAverageRating(response.data.average_rating || 0);
      setTotalReviews(response.data.total || 0);
      // Load reaction counts in parallel
      const counts = {};
      await Promise.all(list.map(async (r) => {
        try {
          const res = await axios.get(`${API}/app-reviews/${r.id}/reactions`);
          counts[r.id] = { likes: res.data.likes || 0, dislikes: res.data.dislikes || 0 };
        } catch { counts[r.id] = { likes: 0, dislikes: 0 }; }
      }));
      setReactionCounts(counts);
      // Load my reactions
      if (user && list.length > 0) {
        try {
          const token = localStorage.getItem('token');
          const r = await axios.post(
            `${API}/app-reviews/my-reactions`,
            { review_ids: list.map(x => x.id) },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setMyReactions(r.data || {});
        } catch { /* silent */ }
      }
    } catch (e) {
      console.error('Failed to load reviews:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const handleSubmitReview = async () => {
    if (!user) return toast({ title: 'Sign in required', variant: 'destructive' });
    if (userRating === 0) return toast({ title: 'Please select a star rating', variant: 'destructive' });
    if (!userReview.trim()) return toast({ title: 'Please write a review', variant: 'destructive' });
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/app-reviews/submit`,
        { rating: userRating, review: userReview },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Thanks for your review! ⭐' });
      setUserRating(0); setUserReview('');
      await new Promise(r => setTimeout(r, 800));
      loadReviews();
    } catch (e) {
      toast({ title: 'Submit failed', description: e.response?.data?.detail || 'Try again', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReact = async (reviewId, reaction) => {
    if (!user) return toast({ title: 'Sign in to react', variant: 'destructive' });
    try {
      const token = localStorage.getItem('token');
      const r = await axios.post(
        `${API}/app-reviews/${reviewId}/react`,
        { reaction },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMyReactions(prev => ({ ...prev, [reviewId]: r.data.your_reaction }));
      const cRes = await axios.get(`${API}/app-reviews/${reviewId}/reactions`);
      setReactionCounts(prev => ({ ...prev, [reviewId]: { likes: cRes.data.likes, dislikes: cRes.data.dislikes } }));
    } catch (e) {
      toast({ title: 'Failed', variant: 'destructive' });
    }
  };

  const toggleRepliesPanel = async (reviewId) => {
    const willOpen = !openReplies[reviewId];
    setOpenReplies(prev => ({ ...prev, [reviewId]: willOpen }));
    if (willOpen && !repliesByReview[reviewId]) {
      try {
        const r = await axios.get(`${API}/app-reviews/${reviewId}/replies`);
        setRepliesByReview(prev => ({ ...prev, [reviewId]: r.data.replies || [] }));
      } catch { /* silent */ }
    }
  };

  const submitReply = async (reviewId) => {
    const text = (replyText[reviewId] || '').trim();
    if (!text || !user) return;
    try {
      const token = localStorage.getItem('token');
      const r = await axios.post(
        `${API}/app-reviews/${reviewId}/reply`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRepliesByReview(prev => ({ ...prev, [reviewId]: [...(prev[reviewId] || []), r.data.reply] }));
      setReplyText(prev => ({ ...prev, [reviewId]: '' }));
    } catch (e) {
      toast({ title: 'Reply failed', description: e.response?.data?.detail || 'Try again', variant: 'destructive' });
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/app-reviews/${reviewId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'Review deleted' });
      loadReviews();
    } catch (e) {
      toast({ title: 'Delete failed', description: e.response?.data?.detail || 'Try again', variant: 'destructive' });
    }
  };

  const startEditReview = (review) => {
    setEditingReviewId(review.id);
    setEditText(review.review);
    setEditRating(review.rating);
  };

  const saveEditReview = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/app-reviews/${editingReviewId}`,
        { rating: editRating, review: editText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Updated ✅' });
      setEditingReviewId(null);
      loadReviews();
    } catch (e) {
      toast({ title: 'Save failed', description: e.response?.data?.detail || 'Try again', variant: 'destructive' });
    }
  };

  const deleteReply = async (reviewId, replyId) => {
    if (!window.confirm('Delete this reply?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/app-reviews/replies/${replyId}`, { headers: { Authorization: `Bearer ${token}` } });
      setRepliesByReview(prev => ({
        ...prev,
        [reviewId]: (prev[reviewId] || []).filter(r => r.id !== replyId)
      }));
    } catch (e) {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const saveEditReply = async (reviewId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/app-reviews/replies/${editingReply.reply_id}`,
        { text: editingReply.text.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRepliesByReview(prev => ({
        ...prev,
        [reviewId]: (prev[reviewId] || []).map(r =>
          r.id === editingReply.reply_id ? { ...r, text: editingReply.text.trim(), edited_at: new Date().toISOString() } : r
        )
      }));
      setEditingReply(null);
    } catch (e) {
      toast({ title: 'Save failed', variant: 'destructive' });
    }
  };

  const renderStars = (rating, interactive = false, onHover = null, onClick = null) => (
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

  const renderEditStars = (rating, onClick) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 cursor-pointer ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
          }`}
          onClick={() => onClick(star)}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      <Navbar />
      <BackNavigation />

      <div className="container mx-auto px-4 pb-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Rate <span className="text-purple-500">GamerGrid</span>
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            Share your experience with GamerGrid — the gaming discovery hub for trailers, news, and reviews.
          </p>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <span className="text-5xl font-bold text-yellow-400">{averageRating.toFixed(1)}</span>
              {renderStars(Math.round(averageRating))}
            </div>
            <p className="text-gray-400">Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</p>
          </div>
        </div>

        {/* Submit Form */}
        {user ? (
          <Card className="bg-white/5 border-white/10 p-6 mb-12 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-4">Leave Your Review</h3>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Your Rating</label>
              {renderStars(userRating, true, setHoverRating, setUserRating)}
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Your Review</label>
              <Textarea
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
                placeholder="Tell us what you think about GamerGrid..."
                className="bg-white/5 border-white/20 text-white min-h-[120px]"
                rows={5}
              />
            </div>
            <Button
              onClick={handleSubmitReview}
              disabled={submitting || userRating === 0 || !userReview.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700"
              data-testid="submit-app-review"
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
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
            <p className="text-center text-gray-400">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <Card className="bg-white/5 border-white/10 p-8 text-center">
              <p className="text-gray-400">No reviews yet. Be the first to review GamerGrid!</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const isOwner = user?.id === review.user_id;
                const counts = reactionCounts[review.id] || { likes: 0, dislikes: 0 };
                const my = myReactions[review.id];
                const isEditing = editingReviewId === review.id;
                const replies = repliesByReview[review.id] || [];
                return (
                  <Card key={review.id} className="bg-white/5 border-white/10 p-6" data-testid={`app-review-${review.id}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-lg">{review.username}</p>
                        <p className="text-sm text-gray-400">
                          {new Date(review.created_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })}
                          {review.edited_at && <span className="text-white/40 italic"> (edited)</span>}
                        </p>
                      </div>
                      {isEditing ? renderEditStars(editRating, setEditRating) : renderStars(review.rating)}
                    </div>

                    {isEditing ? (
                      <div>
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="bg-white/5 border-white/20 text-white"
                          rows={3}
                        />
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={saveEditReview} className="bg-green-600 hover:bg-green-700">
                            <Check className="w-4 h-4 mr-1" />Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingReviewId(null)}>
                            <X className="w-4 h-4 mr-1" />Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-300 whitespace-pre-wrap">{review.review}</p>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5 text-sm">
                      <button
                        onClick={() => toggleReact(review.id, 'like')}
                        className={`flex items-center gap-1 ${my === 'like' ? 'text-green-400' : 'text-white/50 hover:text-green-400'} transition-colors`}
                        data-testid={`like-app-review-${review.id}`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        {counts.likes}
                      </button>
                      <button
                        onClick={() => toggleReact(review.id, 'dislike')}
                        className={`flex items-center gap-1 ${my === 'dislike' ? 'text-red-400' : 'text-white/50 hover:text-red-400'} transition-colors`}
                        data-testid={`dislike-app-review-${review.id}`}
                      >
                        <ThumbsDown className="w-4 h-4" />
                        {counts.dislikes}
                      </button>
                      <button
                        onClick={() => toggleRepliesPanel(review.id)}
                        className="flex items-center gap-1 text-white/50 hover:text-blue-400 transition-colors"
                        data-testid={`reply-app-review-${review.id}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        Reply{replies.length > 0 ? ` (${replies.length})` : ''}
                      </button>

                      <div className="flex gap-2 ml-auto">
                        {isOwner && !isEditing && (
                          <button
                            onClick={() => startEditReview(review)}
                            className="text-white/50 hover:text-yellow-400 transition-colors flex items-center gap-1"
                            data-testid={`edit-app-review-${review.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                        )}
                        {(isOwner || isAdmin) && (
                          <button
                            onClick={() => deleteReview(review.id)}
                            className="text-white/50 hover:text-red-400 transition-colors flex items-center gap-1"
                            title={isAdmin && !isOwner ? 'Admin: delete this review' : 'Delete your review'}
                            data-testid={`delete-app-review-${review.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Admin Replies (legacy yellow box) */}
                    {review.admin_replies && review.admin_replies.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {review.admin_replies.map((reply) => (
                          <div key={reply.id} className="pl-4 border-l-4 border-yellow-500 bg-yellow-900/10 p-4 rounded">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded">👑 ADMIN</span>
                              <span className="text-yellow-400 font-semibold text-sm">{reply.admin_username}</span>
                            </div>
                            <p className="text-white/90 whitespace-pre-wrap">{reply.reply_text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* User Replies Panel */}
                    {openReplies[review.id] && (
                      <div className="mt-4 space-y-3 pl-4 border-l-2 border-white/10">
                        {replies.length === 0 ? (
                          <p className="text-white/40 text-sm italic">No replies yet — be the first!</p>
                        ) : (
                          replies.map(rep => {
                            const repIsOwner = user?.id === rep.user_id;
                            const beingEdited = editingReply?.reply_id === rep.id;
                            return (
                              <div key={rep.id} className="bg-white/5 rounded-lg p-3" data-testid={`app-reply-${rep.id}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm text-white">{rep.username}</span>
                                  {rep.is_admin && (
                                    <span className="px-1.5 py-0.5 bg-yellow-500 text-black text-[10px] font-bold rounded">ADMIN</span>
                                  )}
                                  <span className="text-white/30 text-xs ml-auto">
                                    {new Date(rep.created_at).toLocaleString()}
                                    {rep.edited_at && <span className="italic"> (edited)</span>}
                                  </span>
                                </div>
                                {beingEdited ? (
                                  <div>
                                    <Textarea
                                      value={editingReply.text}
                                      onChange={(e) => setEditingReply({ ...editingReply, text: e.target.value })}
                                      className="bg-black/40 border-white/20 text-white text-sm"
                                      rows={2}
                                    />
                                    <div className="flex gap-2 mt-2">
                                      <Button size="sm" onClick={() => saveEditReply(review.id)} className="bg-green-600 hover:bg-green-700 h-7 text-xs">Save</Button>
                                      <Button size="sm" variant="ghost" onClick={() => setEditingReply(null)} className="h-7 text-xs">Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-white/85 text-sm whitespace-pre-wrap">{rep.text}</p>
                                )}
                                {!beingEdited && (repIsOwner || isAdmin) && (
                                  <div className="flex gap-3 mt-2 text-xs">
                                    {repIsOwner && (
                                      <button
                                        onClick={() => setEditingReply({ reply_id: rep.id, text: rep.text })}
                                        className="text-white/40 hover:text-yellow-400"
                                      >
                                        Edit
                                      </button>
                                    )}
                                    <button
                                      onClick={() => deleteReply(review.id, rep.id)}
                                      className="text-white/40 hover:text-red-400"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}

                        {/* Compose */}
                        {user && (
                          <div className="bg-black/40 rounded-lg p-3">
                            <Textarea
                              value={replyText[review.id] || ''}
                              onChange={(e) => setReplyText(prev => ({ ...prev, [review.id]: e.target.value }))}
                              placeholder="Write a reply…"
                              className="bg-white/5 border-white/20 text-white text-sm resize-none"
                              rows={2}
                              maxLength={2000}
                            />
                            <div className="flex justify-end mt-2">
                              <Button
                                size="sm"
                                onClick={() => submitReply(review.id)}
                                disabled={!(replyText[review.id] || '').trim()}
                                className="bg-purple-600 hover:bg-purple-700 h-7 text-xs"
                                data-testid={`submit-reply-${review.id}`}
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Reply
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AppReviewsPage;
