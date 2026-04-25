import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const _genId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
};

const PageTracker = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const lastTrackedRef = useRef({ path: null, ts: 0 });

  useEffect(() => {
    // Wait for auth to finish loading so we KNOW whether the user is logged in
    // (otherwise the tracker fires before the token is available and the backend
    // can't tell admins apart from anonymous visitors).
    if (loading) return;

    // Dedupe — React StrictMode double-mounts in dev, and rapid back-button
    // navigation can fire the same path twice within milliseconds.
    const now = Date.now();
    if (
      lastTrackedRef.current.path === location.pathname &&
      now - lastTrackedRef.current.ts < 3000
    ) {
      return;
    }
    lastTrackedRef.current = { path: location.pathname, ts: now };

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
    // Re-run when path or auth state changes (so we re-fire properly after login)
  }, [location.pathname, loading, user]);

  return null;
};

export default PageTracker;
