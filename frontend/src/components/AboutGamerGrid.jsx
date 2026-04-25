import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Gamepad2, Star, Heart, Tv, Download, Shield, Zap, Film } from 'lucide-react';

const AboutGamerGrid = ({ isOpen, onClose }) => {
  const features = [
    {
      icon: Gamepad2,
      title: 'Discover Games & Trailers',
      description: 'Browse games across all platforms - PS5, Xbox, PC, Switch - with gameplay trailers and screenshots'
    },
    {
      icon: Star,
      title: 'Rate & Review Games',
      description: 'Share your gaming opinions with community ratings and detailed reviews'
    },
    {
      icon: Heart,
      title: 'Build Your Game Library',
      description: 'Track games you own, want to play, and have completed - organize your gaming journey'
    },
    {
      icon: Tv,
      title: 'Latest Gaming News',
      description: 'Stay updated with game releases, updates, and industry news - all in one place'
    },
    {
      icon: Film,
      title: 'Live Patches & DLC Tracking',
      description: 'Auto-fetched DLC, expansions, patches and announcements straight from IGDB and major gaming outlets'
    },
    {
      icon: Shield,
      title: 'Community-Driven Platform',
      description: 'Built by Cassius Fox for gamers, moderated by admins, powered by your reviews'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-gray-900 to-black border-purple-500/20">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            About GamerGrid
          </DialogTitle>
          <p className="text-white/70 text-sm">
            Your Ultimate Gaming Hub - Discover Games, Watch Trailers, Track Releases Across All Platforms
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* What is GamerGrid */}
          <div className="bg-white/5 rounded-lg p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              What is GamerGrid?
            </h3>
            <p className="text-white/80 leading-relaxed mb-4">
              GamerGrid is your <strong className="text-purple-300">ultimate gaming discovery companion</strong> - explore games across 
              PS5, Xbox, PC, and Nintendo Switch. Watch trailers, read reviews, track release dates, and discover your next 
              favorite game - all in one beautiful, fast, and installable web app.
            </p>
            <p className="text-white/80 leading-relaxed mb-4">
              <strong className="text-blue-300">Always Up-to-Date:</strong> The catalog auto-fetches new releases, patches, DLC drops and gaming news every few minutes. Zero manual work — discover your next favorite game the moment it's announced.
            </p>
            <p className="text-white/80 leading-relaxed">
              Built from scratch by Cassius Fox, GamerGrid is <strong>the gamer's hub for discovery, reviews, and tracking</strong> - with live news from IGN, GameSpot, PCGamer and more.
            </p>
          </div>

          {/* Creator Story */}
          <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-lg p-6 border border-purple-500/30">
            <h3 className="text-xl font-semibold text-white mb-3">The Creator's Journey</h3>
            <div className="space-y-3 text-white/80">
              <p className="leading-relaxed">
                <strong className="text-purple-300">Cassius Fox</strong>, born September 30, 1988 in Upper Sandusky, Ohio, 
                is the 37-year-old founder and sole creator of GamerGrid. What started as a vision to help gamers 
                discover and track games across platforms became a reality through determination and innovation.
              </p>
              <p className="leading-relaxed">
                Building GamerGrid was a journey of learning, iterating, and creating the ultimate gaming hub. From 
                conceptualizing the user experience to implementing game catalogs, trailers, and cross-platform tracking - 
                every feature was crafted with gamers in mind.
              </p>
              <p className="leading-relaxed">
                The challenges were real: integrating massive gaming databases, creating an intuitive interface that 
                works across devices, implementing community features, and making it all work flawlessly. But through 
                persistence and love for gaming, GamerGrid came to life.
              </p>
              <p className="leading-relaxed font-semibold text-purple-300">
                This is version 1.0. Future updates will bring even more gaming features, news integrations, and 
                community tools - all continuing the mission: making game discovery better for every gamer.
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
                    <div className="bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 p-2 rounded-lg flex-shrink-0">
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
          <div className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20 rounded-lg p-6 border border-purple-500/30">
            <h3 className="text-xl font-semibold text-white mb-3">Why Install GamerGrid?</h3>
            <ul className="space-y-2 text-white/80">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">✓</span>
                <span><strong>Instant Access:</strong> Launch from your home screen like a native app</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span><strong>Offline Mode:</strong> Access your game library without internet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span><strong>Cross-Platform:</strong> Works on desktop, mobile, and tablet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">✓</span>
                <span><strong>No App Store Needed:</strong> Install directly - no downloads required</span>
              </li>
            </ul>
          </div>

          {/* Creator Info */}
          <div className="text-center py-4 border-t border-white/10">
            <p className="text-white/60 text-sm mb-1">
              Created by{' '}
              <span className="font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Cassius Fox
              </span>
            </p>
            <p className="text-white/50 text-xs">
              Founder & CEO • Born September 30, 1988 • Upper Sandusky, Ohio
            </p>
            <p className="text-white/40 text-xs mt-1">
              "Building the ultimate gaming hub, one feature at a time."
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AboutGamerGrid;
