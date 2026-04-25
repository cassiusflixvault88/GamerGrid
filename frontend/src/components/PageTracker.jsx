import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const _genId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
};

const PageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      // Persistent visitor ID (across sessions) — anonymous
      let vid = localStorage.getItem('gg_vid');
      if (!vid) {
        vid = _genId();
        localStorage.setItem('gg_vid', vid);
      }
      // Per-session ID
      let sid = sessionStorage.getItem('gg_sid');
      if (!sid) {
        sid = _genId();
        sessionStorage.setItem('gg_sid', sid);
      }

      const token = (() => {
        try { return localStorage.getItem('token') || null; } catch { return null; }
      })();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      axios.post(`${API}/analytics/track`, {
        visitor_id: vid,
        session_id: sid,
        path: location.pathname,
        referrer: document.referrer || null,
      }, { headers }).catch(() => { /* silent */ });

      // GA4 hook (only fires if gtag is loaded; user pastes snippet in index.html)
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_path: location.pathname,
          page_location: window.location.href,
        });
      }
    } catch (e) {
      // never break the app over analytics
    }
  }, [location.pathname]);

  return null;
};

export default PageTracker;
