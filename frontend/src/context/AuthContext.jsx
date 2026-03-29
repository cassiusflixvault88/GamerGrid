import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

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
