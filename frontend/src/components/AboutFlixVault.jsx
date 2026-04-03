import React from 'react';
import { Film, Star, Play, Users, Award, Tv } from 'lucide-react';

const AboutFlixVault = ({ onClose }) => {
  return (
    <div className="bg-gradient-to-br from-purple-900/90 to-black rounded-xl p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white flex items-center gap-2">
          <Film className="w-8 h-8 text-purple-400" />
          About FlixVault
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-6 text-white/90">
        {/* Mission */}
        <section>
          <h3 className="text-xl font-semibold text-purple-300 mb-3 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Our Mission
          </h3>
          <p className="leading-relaxed">
            FlixVault is your <strong className="text-purple-300">movie & TV series discovery companion</strong> - like IMDb and Rotten Tomatoes combined. 
            We're building the ultimate platform where you can:
          </p>
          <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
            <li>Watch HD trailers for thousands of movies and TV shows</li>
            <li>Rate and review content you love</li>
            <li>Build your personal watchlist</li>
            <li>Discover what's trending in entertainment</li>
            <li>Stream select free movies</li>
          </ul>
          <p className="mt-3 text-sm text-white/70">
            FlixVault is a <strong>trailer discovery platform</strong> 
            where you can discover, rate, and track movies & series - with the occasional free movie as a bonus treat.
          </p>
        </section>

        {/* Origin Story */}
        <section>
          <h3 className="text-xl font-semibold text-purple-300 mb-3">The Story</h3>
          <p className="leading-relaxed">
            FlixVault was born from a simple frustration: finding good trailers and trusted reviews was too scattered. 
            The vision of creating a unified platform that revolutionizes 
            how people discover movies, shows, and watch trailers became a reality through determination and innovation.
          </p>
        </section>

        {/* Team */}
        <section>
          <h3 className="text-xl font-semibold text-purple-300 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            The Team
          </h3>
          <p className="leading-relaxed">
            Built by passionate cinephiles and tech enthusiasts, FlixVault represents countless hours 
            of development, testing, and refinement - 
            all continuing the mission: making movie & TV series discovery better, smarter, and more enjoyable for everyone.
          </p>
        </section>

        {/* Features Highlight */}
        <section className="bg-white/5 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-purple-300 mb-4">What Makes Us Different</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Play className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">HD Trailers</h4>
                <p className="text-sm text-white/70">Watch high-quality trailers for every title</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Star className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">Community Ratings</h4>
                <p className="text-sm text-white/70">See what fellow viewers think</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Film className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">Free Movies</h4>
                <p className="text-sm text-white/70">Stream select full-length movies</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Tv className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">TV Series</h4>
                <p className="text-sm text-white/70">Discover the best shows to binge</p>
              </div>
            </div>
          </div>
        </section>

        {/* Vision */}
        <section className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-6 border border-purple-500/30">
          <p className="text-center italic text-lg">
            "Building the future of movie & TV series discovery, one feature at a time."
          </p>
        </section>

        {/* Version */}
        <div className="text-center text-sm text-white/50 pt-4 border-t border-white/10">
          FlixVault v1.0 | Made with ❤️ for entertainment lovers worldwide
        </div>
      </div>
    </div>
  );
};

export default AboutFlixVault;