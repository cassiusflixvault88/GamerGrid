import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Home as HomeIcon, Search, Library, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const QuickLink = ({ to, Icon, label, active, testid }) => (
  <Link
    to={to}
    data-testid={testid}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-sm font-medium select-none ${
      active
        ? 'bg-purple-600/30 text-white border border-purple-500/50'
        : 'bg-white/10 hover:bg-white/20 text-white/90 hover:text-white'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="hidden sm:inline">{label}</span>
  </Link>
);

const BackNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Don't show on homepage
  if (location.pathname === '/') return null;

  const path = location.pathname;

  const handleBack = () => {
    // If there's history, go back; otherwise go home (avoids dead-ends)
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div
      className="relative z-30 px-4 md:px-8 pt-20 pb-4"
      data-testid="back-navigation"
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Back button — kept as <button> because navigate(-1) needs JS */}
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-sm font-medium select-none"
          data-testid="back-btn"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Quick nav — use Link so navigation works even before JS hydrates */}
        <QuickLink to="/" Icon={HomeIcon} label="Home" active={path === '/'} testid="nav-home" />
        <QuickLink
          to="/search"
          Icon={Search}
          label="Search"
          active={path.startsWith('/search')}
          testid="nav-search"
        />
        {user && (
          <QuickLink
            to="/watchlist"
            Icon={Library}
            label="My Library"
            active={path.startsWith('/watchlist')}
            testid="nav-library"
          />
        )}
        {user && (
          <QuickLink
            to="/settings"
            Icon={SettingsIcon}
            label="Settings"
            active={path.startsWith('/settings')}
            testid="nav-settings"
          />
        )}
      </div>
    </div>
  );
};

export default BackNavigation;
