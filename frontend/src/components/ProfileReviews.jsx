import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Star, MessageSquare, Loader2, Reply, Trash2, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StarRow = ({ value, onChange, readOnly = false, size = 'w-5 h-5' }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        disabled={readOnly}
        onClick={() => !readOnly && onChange?.(n)}
        className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        aria-label={`${n} star`}
      >
        <Star
          className={`${size} ${n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`}
        />
      </button>
    ))}
  </div>
);

/**
 * Reviews on a public profile. Visitors can leave a 1-5 star + text review,
 * and the profile owner can reply to each.
 */
const ProfileReviews = ({ username, isOwner, displayName }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [count, setCount] = useState(0);
  const [avg, setAvg] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const [replyOpenId, setReplyOpenId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyPosting, setReplyPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/profile-reviews/${encodeURIComponent(username)}`);
      setReviews(r.data?.reviews || []);
      setCount(r.data?.count || 0);
      setAvg(r.data?.avg_rating ?? null);
    } catch {
      // ignore — empty state will render
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!user) {
      toast({ title: 'Sign in to leave a review' });
      return;
    }
    if (text.trim().length < 2) {
      toast({ title: 'Review too short', variant: 'destructive' });
      return;
    }
    setPosting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/profile-reviews/${encodeURIComponent(username)}`, {
        rating,
        review: text.trim(),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setText('');
      setRating(5);
      toast({ title: 'Review posted! ⭐' });
      load();
    } catch (err) {
      toast({
        title: 'Could not post review',
        description: err.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    } finally {
      setPosting(false);
    }
  };

  const submitReply = async (reviewId) => {
    if (replyText.trim().length < 1) return;
    setReplyPosting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/profile-reviews/${encodeURIComponent(username)}/${reviewId}/reply`,
        { reply: replyText.trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setReplyText('');
      setReplyOpenId(null);
      toast({ title: 'Reply posted!' });
      load();
    } catch (err) {
      toast({
        title: 'Could not reply',
        description: err.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    } finally {
      setReplyPosting(false);
    }
  };

  const removeReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/profile-reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      load();
    } catch (err) {
      toast({
        title: 'Could not delete',
        description: err.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    }
  };

  return (
    <section className="max-w-3xl mx-auto px-6 py-10" data-testid="profile-reviews-section">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">Reviews for {displayName}</h2>
        </div>
        {avg !== null && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
            <StarRow value={Math.round(avg)} readOnly size="w-4 h-4" />
            <span className="text-yellow-300 font-bold text-sm">{avg.toFixed(2)}</span>
            <span className="text-white/50 text-xs">({count})</span>
          </div>
        )}
      </div>

      {/* Compose */}
      {!isOwner && (
        <form onSubmit={submit} className="mb-8 p-5 rounded-xl bg-white/5 border border-white/10" data-testid="profile-review-form">
          <p className="text-white font-semibold mb-2">Leave a review</p>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-white/60 text-sm">Your rating:</span>
            <StarRow value={rating} onChange={setRating} size="w-6 h-6" />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={user ? 'Share your experience…' : 'Sign in to leave a review.'}
            disabled={!user}
            data-testid="profile-review-textarea"
            className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-md text-white placeholder-white/40 focus:outline-none focus:border-purple-500 resize-none disabled:opacity-50"
            maxLength={2000}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-white/40 text-xs">{text.length} / 2000</span>
            <button
              type="submit"
              disabled={posting || !user}
              data-testid="profile-review-submit"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-semibold rounded-md text-sm transition-all"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Post review
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <p className="text-white/50 text-sm">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-white/50 text-sm py-6 text-center">No reviews yet — be the first!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => {
            const canDelete = (user && (user.id === r.reviewer_user_id || user.is_admin));
            const isOpen = replyOpenId === r.id;
            return (
              <div
                key={r.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
                data-testid={`profile-review-${r.id}`}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={r.reviewer_avatar || '/gamergrid-icon.svg'}
                    alt={r.reviewer_display_name || r.reviewer_username}
                    className="w-10 h-10 rounded-full object-cover bg-white/10"
                    onError={(e) => { e.target.src = '/gamergrid-icon.svg'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm">
                        {r.reviewer_display_name || r.reviewer_username || 'Anonymous'}
                      </span>
                      <StarRow value={r.rating} readOnly size="w-3.5 h-3.5" />
                      <span className="text-white/40 text-xs">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-white/85 text-sm mt-1.5 whitespace-pre-line">{r.review}</p>

                    {/* Owner reply */}
                    {r.owner_reply && (
                      <div className="mt-3 ml-4 pl-3 border-l-2 border-purple-500/40 bg-purple-500/5 rounded-r-md py-2 pr-3">
                        <p className="text-purple-300 text-xs font-bold mb-1">
                          ↳ Reply from {displayName}
                        </p>
                        <p className="text-white/90 text-sm whitespace-pre-line">{r.owner_reply}</p>
                        {r.owner_replied_at && (
                          <p className="text-white/40 text-xs mt-1">
                            {new Date(r.owner_replied_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-2">
                      {isOwner && !r.owner_reply && (
                        <button
                          onClick={() => { setReplyOpenId(isOpen ? null : r.id); setReplyText(''); }}
                          className="flex items-center gap-1 text-purple-300 hover:text-purple-200 text-xs font-semibold"
                          data-testid={`reply-review-btn-${r.id}`}
                        >
                          <Reply className="w-3.5 h-3.5" />
                          {isOpen ? 'Cancel' : 'Reply'}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => removeReview(r.id)}
                          className="flex items-center gap-1 text-white/40 hover:text-red-400 text-xs"
                          data-testid={`delete-review-btn-${r.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>

                    {isOpen && (
                      <div className="mt-3">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={2}
                          placeholder="Write a reply…"
                          className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-md text-white placeholder-white/40 focus:outline-none focus:border-purple-500 resize-none text-sm"
                          autoFocus
                          maxLength={2000}
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => submitReply(r.id)}
                            disabled={replyPosting}
                            data-testid={`submit-reply-${r.id}`}
                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md"
                          >
                            {replyPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Post reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ProfileReviews;
