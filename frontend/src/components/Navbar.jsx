import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User } from 'lucide-react';
import { Input } from './ui/input';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

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

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/95 backdrop-blur-sm' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="max-w-[1920px] mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center">
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              MAX
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
          <button className="p-2 text-white/90 hover:text-white transition-colors">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
