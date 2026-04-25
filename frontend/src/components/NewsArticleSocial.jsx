import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ThumbsUp, ThumbsDown, MessageSquare, Trash2, Send, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from './ui/dialog';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Compact reactions/comments bar shown under each news article card.
 * Click the comments button to open a discussion modal.
 */
const NewsArticleSocial = ({ article }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [counts, setCounts] = useState({ likes: 0, dislikes: 0 });
  const [myReaction, setMyReaction] = useState(null);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  const url = article.link;

  // Initial load (counts only — kept light)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await axios.get(`${API}/news/reactions/${encodeURIComponent(url)}`);
        if (!cancelled) setCounts({ likes: r.data.likes || 0, dislikes: r.data.dislikes || 0 });
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // When dialog opens, fetch comments + my reaction
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const cRes = await axios.get(`${API}/news/comments?article_url=${encodeURIComponent(url)}`);
        setComments(cRes.data.comments || []);
        setCommentCount(cRes.data.total || 0);
      } catch { /* silent */ }
      if (user) {
        try {
          const token = localStorage.getItem('token');
          const r = await axios.post(`${API}/news/reactions-for`, { article_urls: [url] }, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setMyReaction(r.data?.[url] || null);
        } catch { /* silent */ }
      }
    })();
  }, [open, url, user]);

  const toggleReact = async (reaction) => {
    if (!user) {
      toast({ title: 'Sign in to react', variant: 'destructive' });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const r = await axios.post(`${API}/news/react`, {
        article_url: url,
        article_title: article.title,
        reaction,
      }, { headers: { Authorization: `Bearer ${token}` } });
      // Optimistic refresh of counts
      const c = await axios.get(`${API}/news/reactions/${encodeURIComponent(url)}`);
      setCounts({ likes: c.data.likes || 0, dislikes: c.data.dislikes || 0 });
      setMyReaction(r.data.your_reaction);
    } catch (e) {
      toast({ title: 'Failed', description: e.response?.data?.detail || 'Try again', variant: 'destructive' });
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text || posting) return;
    if (!user) {
      toast({ title: 'Sign in to comment', variant: 'destructive' });
      return;
    }
    setPosting(true);
    try {
      const token = localStorage.getItem('token');
      const r = await axios.post(`${API}/news/comment`, {
        article_url: url,
        article_title: article.title,
        text,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setComments(prev => [...prev, r.data.comment]);
      setCommentCount(c => c + 1);
      setNewComment('');
    } catch (err) {
      toast({ title: 'Could not post', description: err.response?.data?.detail || 'Try again', variant: 'destructive' });
    } finally {
      setPosting(false);
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/news/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments(prev => prev.filter(c => c.id !== commentId));
      setCommentCount(c => Math.max(0, c - 1));
    } catch (e) {
      toast({ title: 'Delete failed', description: e.response?.data?.detail || 'Try again', variant: 'destructive' });
    }
  };

  return (
    <>
      {/* Compact bar in article card */}
      <div
        className="flex items-center gap-3 mt-2 pt-2 border-t border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => { e.preventDefault(); toggleReact('like'); }}
          className={`flex items-center gap-1 text-xs ${myReaction === 'like' ? 'text-green-400' : 'text-white/50 hover:text-green-400'} transition-colors`}
          data-testid={`like-${article.link}`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          {counts.likes}
        </button>
        <button
          onClick={(e) => { e.preventDefault(); toggleReact('dislike'); }}
          className={`flex items-center gap-1 text-xs ${myReaction === 'dislike' ? 'text-red-400' : 'text-white/50 hover:text-red-400'} transition-colors`}
          data-testid={`dislike-${article.link}`}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
          {counts.dislikes}
        </button>
        <button
          onClick={(e) => { e.preventDefault(); setOpen(true); }}
          className="flex items-center gap-1 text-xs text-white/50 hover:text-blue-400 transition-colors ml-auto"
          data-testid={`open-comments-${article.link}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Discuss
        </button>
      </div>

      {/* Discussion Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white pr-6">{article.title}</DialogTitle>
            <p className="text-white/50 text-xs">{commentCount} comment{commentCount !== 1 ? 's' : ''}</p>
          </DialogHeader>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-2">
            {comments.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-6">Be the first to comment!</p>
            ) : (
              comments.map(c => {
                const canDelete = user && (user.is_admin || user.id === c.user_id);
                return (
                  <div key={c.id} className="bg-white/5 border border-white/10 rounded-lg p-3" data-testid={`comment-${c.id}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{c.username}</span>
                      {c.is_admin && (
                        <span className="px-1.5 py-0.5 bg-yellow-500 text-black text-[10px] font-bold rounded">ADMIN</span>
                      )}
                      <span className="text-white/30 text-xs ml-auto">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                      {canDelete && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="text-white/40 hover:text-red-400"
                          title={user.is_admin && user.id !== c.user_id ? 'Admin: delete this comment' : 'Delete your comment'}
                          data-testid={`delete-comment-${c.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-white/85 text-sm whitespace-pre-wrap">{c.text}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Compose */}
          {user ? (
            <form onSubmit={submitComment} className="border-t border-white/10 pt-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts… (no spam, no trolling)"
                rows={2}
                maxLength={1000}
                className="w-full bg-black/40 border border-white/20 rounded-lg p-2 text-white text-sm resize-none focus:outline-none focus:border-purple-500"
                data-testid="comment-input"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-white/30 text-xs">{newComment.length}/1000</span>
                <Button
                  type="submit"
                  disabled={!newComment.trim() || posting}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="comment-submit"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  {posting ? 'Posting…' : 'Post Comment'}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-white/50 text-sm text-center border-t border-white/10 pt-3">Sign in to join the discussion.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NewsArticleSocial;
