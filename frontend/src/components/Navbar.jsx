import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, LogOut, List } from 'lucide-react';
import { Input } from './ui/input';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-black/95 backdrop-blur-sm' : 'bg-gradient-to-b from-black/80 to-transparent'
        }`}
      >
        <div className="max-w-[1920px] mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                FlixVault
              </div>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/"
                className="text-white/90 hover:text-white transition-colors text-sm font-medium"
              >
                Home
              </Link>
              <Link
                to="/movies"
                className="text-white/90 hover:text-white transition-colors text-sm font-medium"
              >
                Movies
              </Link>
              <Link
                to="/series"
                className="text-white/90 hover:text-white transition-colors text-sm font-medium"
              >
                Series
              </Link>
              <Link
                to="/originals"
                className="text-white/90 hover:text-white transition-colors text-sm font-medium"
              >
                Originals
              </Link>
              <Link
                to="/public-domain"
                className="text-white/90 hover:text-white transition-colors text-sm font-medium bg-gradient-to-r from-purple-600/20 to-blue-600/20 px-3 py-1 rounded-md"
              >
                Free Movies
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="bg-black/50 border-white/20 text-white placeholder:text-white/50 w-64"
                  autoFocus
                  onBlur={() => {
                    if (!searchQuery) setSearchOpen(false);
                  }}
                />
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-white/90 hover:text-white transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-2 text-white/90 hover:text-white transition-colors flex items-center space-x-2"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden md:inline text-sm">{user.username}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-black/95 border border-white/20 rounded-md shadow-lg py-2">
                    <Link
                      to="/watchlist"
                      className="flex items-center space-x-2 px-4 py-2 text-white/90 hover:bg-white/10 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <List className="w-4 h-4" />
                      <span>My Watchlist</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-white/90 hover:bg-white/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-md text-sm font-semibold transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

export default Navbar;
