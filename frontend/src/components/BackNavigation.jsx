import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Home as HomeIcon, Search, Library, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BackNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Don't show on homepage
  if (location.pathname === '/') return null;

  const path = location.pathname;

  const QuickBtn = ({ onClick, icon: Icon, label, active, testid }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
        active
          ? 'bg-purple-600/30 text-white border border-purple-500/50'
          : 'bg-white/10 hover:bg-white/20 text-white/90 hover:text-white'
      }`}
      data-testid={testid}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="px-4 md:px-8 pt-20 pb-4" data-testid="back-navigation">
      <div className="flex flex-wrap items-center gap-2">
        {/* Back Arrow */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-sm font-medium"
          data-testid="back-btn"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Quick nav */}
        <QuickBtn
          onClick={() => navigate('/')}
          icon={HomeIcon}
          label="Home"
          active={path === '/'}
          testid="nav-home"
        />
        <QuickBtn
          onClick={() => navigate('/search')}
          icon={Search}
          label="Search"
          active={path.startsWith('/search')}
          testid="nav-search"
        />
        {user && (
          <QuickBtn
            onClick={() => navigate('/watchlist')}
            icon={Library}
            label="My Library"
            active={path.startsWith('/watchlist')}
            testid="nav-library"
          />
        )}
        {user && (
          <QuickBtn
            onClick={() => navigate('/settings')}
            icon={SettingsIcon}
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
