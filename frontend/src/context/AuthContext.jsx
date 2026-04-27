import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Track user activity to prevent auto-logout
  useEffect(() => {
    const updateActivity = () => setLastActivity(Date.now());
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, updateActivity));
  }, []);

  // Re-validate token when the app becomes visible again
  useEffect(() => {
    if (!token) return;
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      const tenMinutes = 10 * 60 * 1000;
      if (Date.now() - lastActivity > tenMinutes) {
        logout();
      } else {
        try { await fetchCurrentUser(); } catch { logout(); }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [token, lastActivity]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (token) await fetchCurrentUser();
  }, [token, fetchCurrentUser]);

  useEffect(() => {
    if (token) fetchCurrentUser();
    else setLoading(false);
  }, [token, fetchCurrentUser]);

  const login = async (email, password) => {
    localStorage.removeItem('user');
    setUser(null);

    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;

    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);

    // Re-fetch in case the login response is missing fresh fields (e.g. is_pro flipped)
    setTimeout(async () => {
      try {
        const fresh = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        setUser(fresh.data);
      } catch { /* silent */ }
    }, 500);

    return userData;
  };

  const signup = async (email, username, password) => {
    const response = await axios.post(`${API}/auth/signup`, { email, username, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);

    // Wipe service-worker caches so the PWA doesn't serve a logged-in shell
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    }

    window.location.href = '/';
  };

  const addToWatchlist = useCallback(async (content) => {
    try {
      const item = {
        content_id: content.id,
        title: content.title || content.name,
        poster_path: content.poster_path,
        media_type: content.media_type || (content.title ? 'movie' : 'tv'),
      };
      await axios.post(`${API}/watchlist/add`, item, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      await fetchCurrentUser();
      return true;
    } catch {
      return false;
    }
  }, [token, fetchCurrentUser]);

  const removeFromWatchlist = useCallback(async (contentId) => {
    try {
      await axios.delete(`${API}/watchlist/remove/${contentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      await fetchCurrentUser();
      return true;
    } catch {
      return false;
    }
  }, [token, fetchCurrentUser]);

  const isInWatchlist = useCallback((contentId) => {
    if (!user || !user.watchlist) return false;
    return user.watchlist.some((item) => item.content_id === contentId);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        refreshUser,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
