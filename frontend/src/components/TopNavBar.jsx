import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Heart, Settings, Search, Film, User, ArrowLeft } from 'lucide-react';

const TopNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="fixed top-16 left-0 right-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          {/* Left side - Back button */}
          <div>
            {!isHome && (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </button>
            )}
          </div>

          {/* Right side - Quick nav icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/')}
              className={`p-2 rounded-lg transition-colors ${
                location.pathname === '/' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="Home"
            >
              <Home className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => navigate('/search')}
              className={`p-2 rounded-lg transition-colors ${
                location.pathname === '/search' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => navigate('/watchlist')}
              className={`p-2 rounded-lg transition-colors ${
                location.pathname === '/watchlist' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="Watchlist"
            >
              <Heart className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => navigate('/public-domain')}
              className={`p-2 rounded-lg transition-colors ${
                location.pathname === '/public-domain' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="Free Movies"
            >
              <Film className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => navigate('/settings')}
              className={`p-2 rounded-lg transition-colors ${
                location.pathname === '/settings' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNavBar;