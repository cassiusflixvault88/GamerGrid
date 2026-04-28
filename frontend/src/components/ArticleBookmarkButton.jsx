import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Bookmark button for news articles. Saves into the user's library.
 * Shows a sign-in prompt for guests.
 */
const ArticleBookmarkButton = ({ article, size = 'sm' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !article?.link) return;
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const r = await axios.get(
          `${API}/saved-articles/check?article_url=${encodeURIComponent(article.link)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!cancelled) setSaved(Boolean(r.data?.saved));
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [user, article?.link]);

  const toggle = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!user) {
      toast({ title: 'Sign in to save articles', description: 'Bookmark articles to read later in your Library.' });
      return;
    }
    setBusy(true);
    try {
      const token = localStorage.getItem('token');
      if (saved) {
        // Need the saved-doc id; look it up
        const r = await axios.get(
          `${API}/saved-articles/check?article_url=${encodeURIComponent(article.link)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (r.data?.id) {
          await axios.delete(`${API}/saved-articles/${r.data.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSaved(false);
          toast({ title: 'Removed from your library' });
        }
      } else {
        await axios.post(`${API}/saved-articles`, {
          article_url: article.link,
          title: article.title || 'Untitled',
          summary: article.summary || '',
          image: article.image || '',
          source: article.source || '',
          source_color: article.source_color || '',
          published: article.published || '',
        }, { headers: { Authorization: `Bearer ${token}` } });
        setSaved(true);
        toast({ title: 'Saved! 🔖', description: 'Find it in My Library → Saved Articles.' });
      }
    } catch (e) {
      toast({ title: 'Could not save', description: e.response?.data?.detail || 'Try again', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const iconSize = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <button
      onClick={toggle}
      disabled={busy}
      data-testid="bookmark-article-btn"
      title={saved ? 'Remove from library' : 'Save to library'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
        saved
          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 hover:bg-yellow-500/30'
          : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20 hover:text-white'
      }`}
    >
      {saved ? <BookmarkCheck className={iconSize} /> : <Bookmark className={iconSize} />}
      <span>{saved ? 'Saved' : 'Save'}</span>
    </button>
  );
};

export default ArticleBookmarkButton;
