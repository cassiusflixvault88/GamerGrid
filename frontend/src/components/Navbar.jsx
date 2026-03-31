import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, LogOut, List, Shield, Settings, Home, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import SearchAutocomplete from './SearchAutocomplete';

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

  const goToAdmin = () => {
    navigate('/admin');
    setShowUserMenu(false);
  };

  const goToSettings = () => {
    navigate('/settings');
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
            {/* Desktop Search */}
            <div className="hidden md:block">
              <SearchAutocomplete />
            </div>

            {/* Mobile Search Button */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="md:hidden p-2 text-white/90 hover:text-white transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors"
                >
                  {user.profile_picture_url ? (
                    <img 
                      src={user.profile_picture_url.startsWith('http') 
                        ? user.profile_picture_url 
                        : `${process.env.REACT_APP_BACKEND_URL}${user.profile_picture_url}`
                      }
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover border-2 border-purple-500 bg-gray-800"
                      onError={(e) => {
                        console.error('❌ Profile picture failed to load:', user.profile_picture_url);
                        console.error('Full URL:', e.target.src);
                        // Hide broken image, show fallback
                        e.target.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log('✅ Profile picture loaded successfully');
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center border-2 border-purple-500">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <span className="hidden md:inline text-sm">{user.username}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-black/95 border border-white/20 rounded-md shadow-lg py-2">
                    {/* Profile picture in dropdown */}
                    <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                      <div className="flex items-center space-x-3 mb-2">
                        {user.profile_picture_url ? (
                          <img 
                            src={user.profile_picture_url.startsWith('http') 
                              ? user.profile_picture_url 
                              : `${process.env.REACT_APP_BACKEND_URL}${user.profile_picture_url}`
                            }
                            alt={user.username}
                            className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <User className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm text-white font-semibold truncate">{user.username}</p>
                        </div>
                      </div>
                      <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Signed in as</p>
                      <p className="text-xs text-purple-400 truncate">{user?.email}</p>
                    </div>
                    
                    <Link
                      to="/"
                      className="flex items-center space-x-2 px-4 py-2 text-white/90 hover:bg-white/10 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Home className="w-4 h-4" />
                      <span>Home</span>
                    </Link>
                    <Link
                      to="/watchlist"
                      className="flex items-center space-x-2 px-4 py-2 text-white/90 hover:bg-white/10 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <List className="w-4 h-4" />
                      <span>My Watchlist</span>
                    </Link>
                    <button
                      onClick={goToSettings}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-white/90 hover:bg-white/10 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Account Settings</span>
                    </button>
                    <a
                      href="mailto:cassiusflixvault@gmail.com"
                      className="flex items-center space-x-2 px-4 py-2 text-white/90 hover:bg-white/10 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Mail className="w-4 h-4" />
                      <span>Contact Support</span>
                    </a>
                    <div className="border-t border-white/10 my-2"></div>
                    <button
                      onClick={goToAdmin}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-yellow-400 hover:bg-white/10 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Panel</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-red-400 hover:bg-white/10 transition-colors"
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

      {/* Mobile Search Overlay */}
      {searchOpen && (
        <div className="md:hidden fixed inset-0 bg-black z-50 pt-20 px-4">
          <div className="mb-4">
            <SearchAutocomplete />
          </div>
          <button
            onClick={() => setSearchOpen(false)}
            className="absolute top-4 right-4 text-white p-2"
          >
            ✕ Close
          </button>
        </div>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

export default Navbar;
