import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Play, Star, Heart, Tv, Download, Shield, Zap } from 'lucide-react';

const AboutFlixVault = ({ isOpen, onClose }) => {
  const features = [
    {
      icon: Play,
      title: 'Watch Movie & Series Trailers',
      description: 'Browse movies and TV shows with high-quality trailers - discover what to watch next'
    },
    {
      icon: Star,
      title: 'Rate & Review Content',
      description: 'Share your opinions with IMDb and Rotten Tomatoes-style ratings and reviews'
    },
    {
      icon: Heart,
      title: 'Personal Watchlist',
      description: 'Save movies and series you want to watch and build your perfect watchlist'
    },
    {
      icon: Tv,
      title: 'TV Series Discovery',
      description: 'Explore hundreds of TV shows with trailers, ratings, and community reviews'
    },
    {
      icon: Download,
      title: 'Install as an App',
      description: 'Install FlixVault on any device - works offline and feels like a native app (PWA)'
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
            Your Movie & TV Series Discovery Vault - Watch Trailers, Rate Content, Build Your Watchlist
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* What is FlixVault */}
          <div className="bg-white/5 rounded-lg p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              What is FlixVault?
            </h3>
            <p className="text-white/80 leading-relaxed mb-4">
              FlixVault is your <strong className="text-purple-300">movie & TV series discovery companion</strong> - like IMDb and Rotten Tomatoes combined. 
              Browse movies and TV shows with trailers, rate and review what you've watched, and build your personal watchlist. 
              Discover what's hot, explore by genre, and find your next favorite film or series - all in one beautiful, 
              fast, and installable web app.
            </p>
            <p className="text-white/80 leading-relaxed mb-4">
              <strong className="text-blue-300">Bonus:</strong> We feature free full-length movies you can watch! 
              Enjoy public domain classics and select films at no cost.
            </p>
            <p className="text-white/80 leading-relaxed">
              Built entirely from scratch by Cassius Fox, FlixVault is <strong>primarily a movie & TV series rating and trailer vault</strong> where you can discover, rate, and track content - with the occasional free movie as a bonus treat.
            </p>
          </div>

          {/* Creator Story */}
          <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-lg p-6 border border-purple-500/30">
            <h3 className="text-xl font-semibold text-white mb-3">The Creator's Journey</h3>
            <div className="space-y-3 text-white/80">
              <p className="leading-relaxed">
                <strong className="text-purple-300">Cassius Fox</strong>, born September 30, 1988 in Upper Sandusky, Ohio, 
                is the 37-year-old founder and sole creator of FlixVault. What started as a vision to revolutionize 
                how people discover movies and watch trailers became a reality through determination and innovation.
              </p>
              <p className="leading-relaxed">
                Building FlixVault was a journey of learning, iterating, and pushing boundaries. From conceptualizing 
                the user experience to implementing every feature you see today, Cassius handled it all - design, 
                development, testing, and deployment. Every movie card, every rating system, every smooth animation 
                was crafted with care.
              </p>
              <p className="leading-relaxed">
                The challenges were real: integrating massive movie databases, creating an intuitive interface that 
                works seamlessly across devices, implementing review systems, building admin controls, and making it 
                all work together flawlessly. But through persistence and a commitment to quality, FlixVault came to life.
              </p>
              <p className="leading-relaxed font-semibold text-purple-300">
                This is just version 1.0. Future versions of FlixVault will bring even more groundbreaking features, 
                all continuing the mission: making movie & TV series discovery better, smarter, and more enjoyable for everyone.
              </p>
            </div>
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
            <p className="text-white/60 text-sm mb-1">
              Created by{' '}
              <span className="font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Cassius Fox
              </span>
            </p>
            <p className="text-white/50 text-xs">
              Founder & CEO • Born September 30, 1988 • Upper Sandusky, Ohio
            </p>
            <p className="text-white/40 text-xs mt-1">
              "Building the future of movie & TV series discovery, one feature at a time."
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AboutFlixVault;
