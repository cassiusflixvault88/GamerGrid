import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

export const useAutoLogout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  const handleLogout = useCallback(() => {
    if (user) {
      logout();
      navigate('/');
      alert('You have been logged out due to inactivity.');
    }
  }, [user, logout, navigate]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (user) {
      timeoutRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
    }
  }, [user, handleLogout]);

  useEffect(() => {
    if (!user) return;

    // Events that count as activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    // Reset timer on any activity
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Start initial timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, resetTimer]);
};