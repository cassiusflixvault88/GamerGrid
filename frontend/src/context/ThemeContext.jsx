import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(null);

// Available accent palettes for dark mode. Each one tweaks Tailwind CSS variables
// at runtime via inline style on <html> so the rest of the app keeps working.
export const ACCENTS = [
  { id: 'purple',   label: 'Royal Purple',  primary: '#a855f7', secondary: '#3b82f6', bg: '#0a0a0a', emoji: '👑' },
  { id: 'cyber',    label: 'Cyber Pink',    primary: '#ec4899', secondary: '#8b5cf6', bg: '#0a0014', emoji: '🌸' },
  { id: 'neon',     label: 'Neon Green',    primary: '#22c55e', secondary: '#06b6d4', bg: '#040a06', emoji: '💚' },
  { id: 'sunset',   label: 'Sunset Orange', primary: '#f97316', secondary: '#ef4444', bg: '#100503', emoji: '🌅' },
  { id: 'ocean',    label: 'Ocean Blue',    primary: '#3b82f6', secondary: '#06b6d4', bg: '#020617', emoji: '🌊' },
  { id: 'gold',     label: 'Gold Rush',     primary: '#fbbf24', secondary: '#f59e0b', bg: '#0c0a04', emoji: '✨' },
  { id: 'crimson',  label: 'Crimson Red',   primary: '#dc2626', secondary: '#f59e0b', bg: '#100404', emoji: '🔥' },
];

const ACCENT_IDS = ACCENTS.map((a) => a.id);

const applyAccent = (accentId) => {
  const cfg = ACCENTS.find((a) => a.id === accentId) || ACCENTS[0];
  const root = document.documentElement;
  root.style.setProperty('--gg-accent', cfg.primary);
  root.style.setProperty('--gg-accent-2', cfg.secondary);
  root.style.setProperty('--gg-bg', cfg.bg);
  root.dataset.accent = cfg.id;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('gamergrid-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'dark';
  });

  const [accent, setAccentState] = useState(() => {
    const saved = localStorage.getItem('gamergrid-accent');
    return ACCENT_IDS.includes(saved) ? saved : 'purple';
  });

  const setTheme = useCallback((t) => {
    setThemeState(t);
    localStorage.setItem('gamergrid-theme', t);
  }, []);

  const setAccent = useCallback((a) => {
    if (!ACCENT_IDS.includes(a)) return;
    setAccentState(a);
    localStorage.setItem('gamergrid-accent', a);
    applyAccent(a);
  }, []);

  // Apply theme (dark/light/system)
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', isDark);
      root.classList.toggle('light', !isDark);
      root.dataset.theme = isDark ? 'dark' : 'light';
    };
    apply();

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  // Apply accent on mount + whenever it changes
  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accent, setAccent, accents: ACCENTS }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
