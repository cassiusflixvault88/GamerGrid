import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-black border-t border-white/10 py-8 mt-20">
      <div className="max-w-[1920px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              StreamFlix
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
              © {new Date().getFullYear()} StreamFlix. All rights reserved.
            </p>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap justify-center md:justify-start gap-6 text-white/50 text-sm">
          <a href="#" className="hover:text-white transition-colors">About</a>
          <a href="#" className="hover:text-white transition-colors">Help Center</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Use</a>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Cookie Preferences</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
