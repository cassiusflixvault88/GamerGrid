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
      console.log('👆 User activity detected');
    };

    // Track user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  // Check for inactivity and validate token when app becomes visible again
  useEffect(() => {
    if (!token) return;

    // Handle visibility change (when user returns to tab/app)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 App became visible, checking session...');
        const timeSinceActivity = Date.now() - lastActivity;
        const tenMinutes = 10 * 60 * 1000;

        if (timeSinceActivity > tenMinutes) {
          console.log('⏰ Session expired due to inactivity');
          logout();
        } else {
          // Validate token is still valid
          try {
            await fetchCurrentUser();
          } catch (error) {
            console.error('Token invalid, logging out');
            logout();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
    console.log('🔐 Logging in...', email);
    
    // Clear old user data first
    localStorage.removeItem('user');
    setUser(null);
    
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    
    console.log('✅ Login successful for:', userData.username, userData.email);
    
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    
    // Force immediate refresh to ensure data is current
    setTimeout(async () => {
      console.log('🔄 Force refreshing user data...');
      try {
        const freshResponse = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        console.log('✅ Fresh user data:', freshResponse.data);
        setUser(freshResponse.data);
      } catch (error) {
        console.error('⚠️ Failed to refresh user data:', error);
      }
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
    console.log('🚪 Logging out user...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
    
    // Force redirect to home to clear UI state
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

      console.log('➕ Adding to watchlist:', item.title);
      
      await axios.post(`${API}/watchlist/add`, item, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('✅ Added to watchlist, refreshing user data...');
      
      // Add small delay to ensure backend has processed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Update user state immediately for instant feedback
      await fetchCurrentUser();
      
      console.log('✅ Watchlist updated in UI');
      return true;
    } catch (error) {
      console.error('❌ Failed to add to watchlist:', error);
      return false;
    }
  }, [token, fetchCurrentUser]);

  const removeFromWatchlist = useCallback(async (contentId) => {
    try {
      console.log('➖ Removing from watchlist:', contentId);
      
      await axios.delete(`${API}/watchlist/remove/${contentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('✅ Removed from watchlist, refreshing user data...');
      
      // Add small delay to ensure backend has processed
      await new Promise(resolve => setTimeout(resolve, 300));

      await fetchCurrentUser();
      
      console.log('✅ Watchlist updated in UI');
      return true;
    } catch (error) {
      console.error('❌ Failed to remove from watchlist:', error);
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
