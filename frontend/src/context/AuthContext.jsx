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
    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    // Track user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  // Auto-refresh token every 5 minutes to keep session alive
  useEffect(() => {
    if (!token) return;

    const refreshInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivity;
      const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds

      // Only logout if inactive for more than 10 minutes
      if (timeSinceActivity > tenMinutes) {
        console.log('⏰ Session expired due to inactivity');
        logout();
      } else {
        // User is active, refresh token automatically
        fetchCurrentUser();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [token, lastActivity]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
      console.log('✅ User data refreshed:', response.data);
      console.log('📸 Profile picture URL:', response.data.profile_picture_url);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Don't logout on every error - only if explicitly unauthorized
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Add function to manually refresh user data (for profile updates)
  const refreshUser = useCallback(async () => {
    if (token) {
      await fetchCurrentUser();
    }
  }, [token, fetchCurrentUser]);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchCurrentUser]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
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
    setToken(null);
    setUser(null);
    
    // Clear service worker cache to prevent stale data in PWA
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
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

      // Update user state immediately for instant feedback
      await fetchCurrentUser();
      return true;
    } catch (error) {
      console.error('Failed to add to watchlist:', error);
      return false;
    }
  }, [token, fetchCurrentUser]);

  const removeFromWatchlist = useCallback(async (contentId) => {
    try {
      await axios.delete(`${API}/watchlist/remove/${contentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchCurrentUser();
      return true;
    } catch (error) {
      console.error('Failed to remove from watchlist:', error);
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
