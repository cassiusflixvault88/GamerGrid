import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Play, Star, Heart, Tv, Download, Shield, Zap } from 'lucide-react';

const AboutFlixVault = ({ isOpen, onClose }) => {
  const features = [
    {
      icon: Play,
      title: 'Stream Unlimited Content',
      description: 'Access thousands of movies and TV shows from TMDB database with YouTube trailers'
    },
    {
      icon: Star,
      title: 'Rate & Review',
      description: 'Share your thoughts with Rotten Tomatoes-style ratings and reviews'
    },
    {
      icon: Heart,
      title: 'Personal Watchlist',
      description: 'Save your favorite content and build your perfect watchlist'
    },
    {
      icon: Tv,
      title: 'Free Movies Section',
      description: 'Watch public domain movies completely free - full-length, no subscription required'
    },
    {
      icon: Download,
      title: 'Progressive Web App',
      description: 'Install FlixVault on any device - works offline and feels like a native app'
    },
    {
      icon: Shield,
      title: 'Community-Driven',
      description: 'Built by Cassius Fox, moderated by admins, powered by your reviews and ratings'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-gray-900 to-black border-purple-500/20">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            About FlixVault
          </DialogTitle>
          <p className="text-white/70 text-sm">
            Your ultimate streaming companion - Free, Fast, and Feature-Rich
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* What is FlixVault */}
          <div className="bg-white/5 rounded-lg p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              What is FlixVault?
            </h3>
            <p className="text-white/80 leading-relaxed">
              FlixVault is a modern streaming platform that brings together content discovery, 
              community reviews, and personalized watchlists. Browse thousands of movies and series, 
              watch trailers, read ratings, and discover what's trending - all in one beautiful, 
              fast, and installable web app.
            </p>
          </div>

          {/* Features Grid */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Key Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-lg p-4 border border-white/10 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2 rounded-lg flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                      <p className="text-sm text-white/70">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Why Install */}
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-6 border border-purple-500/30">
            <h3 className="text-xl font-semibold text-white mb-3">Why Install FlixVault?</h3>
            <ul className="space-y-2 text-white/80">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">✓</span>
                <span><strong>Faster Access:</strong> Launch instantly from your home screen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">✓</span>
                <span><strong>Offline Ready:</strong> Access cached content without internet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">✓</span>
                <span><strong>Native Feel:</strong> Works like a real app on any device</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">✓</span>
                <span><strong>No App Store:</strong> Install directly - no download limits</span>
              </li>
            </ul>
          </div>

          {/* Creator Info */}
          <div className="text-center py-4 border-t border-white/10">
            <p className="text-white/60 text-sm">
              Created with ❤️ by{' '}
              <span className="font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Cassius Fox
              </span>
            </p>
            <p className="text-white/40 text-xs mt-1">
              CEO & Founder of FlixVault
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AboutFlixVault;
