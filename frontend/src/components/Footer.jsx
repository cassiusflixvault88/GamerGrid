import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ShareButton from './ShareButton';
import InstallInstructions from './InstallInstructions';
import AboutGamerGrid from './AboutGamerGrid';

const Footer = () => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <footer className="bg-black border-t border-white/10 py-8 mt-20">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <img 
                src="/gamergrid-icon.svg" 
                alt="GamerGrid" 
                className="w-8 h-8"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                GamerGrid
              </span>
            </div>
            
            <div className="flex flex-col items-center md:items-end space-y-2">
              <p className="text-white/60 text-sm">
                Created by{' '}
                <span className="text-white font-semibold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Cassius Fox
                </span>
              </p>
              <p className="text-white/40 text-xs">
                © {new Date().getFullYear()} GamerGrid. All rights reserved.
              </p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap justify-center md:justify-start gap-6 text-white/50 text-sm items-center">
            <ShareButton variant="outline" size="sm" />
            <Link 
              to="/support"
              className="hover:text-white transition-colors text-purple-400 font-semibold"
            >
              💜 Support Creator
            </Link>
            <Link 
              to="/app-reviews"
              className="hover:text-white transition-colors text-yellow-400 font-semibold"
            >
              ⭐ Rate GamerGrid
            </Link>
            <Link 
              to="/request-content"
              className="hover:text-white transition-colors text-green-400 font-semibold"
            >
              🎬 Request Content
            </Link>
            <Link 
              to="/feedback"
              className="hover:text-white transition-colors text-red-400 font-semibold"
            >
              🐛 Report Issues
            </Link>
            <button 
              onClick={() => setShowAbout(true)}
              className="hover:text-white transition-colors"
            >
              About GamerGrid
            </button>
            <a 
              href="mailto:cassiusgamergrid@gmail.com" 
              className="hover:text-white transition-colors"
            >
              📧 Help & Support
            </a>
            <button 
              onClick={() => setShowInstructions(true)}
              className="hover:text-white transition-colors text-purple-400 font-semibold"
            >
              📱 Install App
            </button>
            <a 
              href="https://www.themoviedb.org/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors text-xs"
            >
              Powered by TMDB
            </a>
          </div>
        </div>
      </footer>

      <InstallInstructions isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
      <AboutGamerGrid isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
};

export default Footer;
