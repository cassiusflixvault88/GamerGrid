import React from 'react';
import { Play, Library, Zap, Crown, Search, Heart } from 'lucide-react';

/**
 * GuestMarketingHero — replaces the old cyan "Take the Tour" banner with a
 * proper above-the-fold sales pitch for non-signed-in visitors.
 *
 * Renders only when no user is signed in. Shows on every visit (no
 * localStorage gate) so people who arrive from social/SEO always see why
 * GamerGrid is worth their time.
 */
const GuestMarketingHero = ({ onTakeTour, onSignUp }) => {
  return (
    <div
      className="relative px-6 lg:px-12 max-w-[1920px] mx-auto -mt-2 mb-4"
      data-testid="guest-marketing-hero"
    >
      <div className="relative overflow-hidden rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-900/60 via-blue-900/50 to-cyan-900/40 backdrop-blur-sm shadow-2xl">
        {/* Glow accents */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 sm:p-8 lg:p-10">
          {/* LEFT — pitch */}
          <div className="lg:col-span-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-400/40 mb-4">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
              <span className="text-pink-300 text-xs font-bold uppercase tracking-wider">New for 2026</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-3">
              Discover your next{' '}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                favorite game
              </span>{' '}
              — across every platform.
            </h1>

            <p className="text-white/75 text-base sm:text-lg mb-5 leading-relaxed">
              10,000+ titles for PS5, Xbox, PC and Switch. HD trailers, screenshots, live deals,
              community reviews — all free, no install required.
            </p>

            {/* Feature chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Chip icon={<Play className="w-3.5 h-3.5" />} label="HD Trailers" />
              <Chip icon={<Library className="w-3.5 h-3.5" />} label="Save Games" />
              <Chip icon={<Zap className="w-3.5 h-3.5" />} label="Live PC Deals" />
              <Chip icon={<Heart className="w-3.5 h-3.5" />} label="Community Reviews" />
              <Chip icon={<Search className="w-3.5 h-3.5" />} label="Smart Search" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onSignUp}
                className="px-7 py-3.5 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white font-bold rounded-xl shadow-xl transition-all hover:scale-[1.02] hover:shadow-pink-500/30"
                data-testid="guest-signup-cta"
              >
                Sign Up Free →
              </button>
              <button
                onClick={onTakeTour}
                className="px-7 py-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/20 transition-all"
                data-testid="guest-tour-cta"
              >
                🎬 Take the 60s Tour
              </button>
            </div>

            <p className="text-white/40 text-xs mt-4">
              Free forever • Pro $4.99/mo for ad-free + saved trailers • Cancel anytime
            </p>
          </div>

          {/* RIGHT — feature highlight cards */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3">
            <FeatureCard
              icon={<Library className="w-6 h-6 text-purple-300" />}
              title="Build Your Library"
              body="Save games and trailers across PlayStation, Xbox, PC and Switch."
              gradient="from-purple-600/30 to-purple-900/30"
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-yellow-300" />}
              title="Live Deals"
              body="Real-time PC pricing across Steam, Epic, GOG, Humble and more."
              gradient="from-yellow-600/25 to-orange-900/25"
            />
            <FeatureCard
              icon={<Crown className="w-6 h-6 text-pink-300" />}
              title="Pro Perks"
              body="Ad-free browsing + save trailers to your personal library."
              gradient="from-pink-600/30 to-rose-900/30"
            />
            <FeatureCard
              icon={<Heart className="w-6 h-6 text-cyan-300" />}
              title="Real Reviews"
              body="Like, comment, reply — built by gamers, for gamers."
              gradient="from-cyan-600/25 to-blue-900/30"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const Chip = ({ icon, label }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/85 text-xs font-medium">
    {icon}
    {label}
  </span>
);

const FeatureCard = ({ icon, title, body, gradient }) => (
  <div className={`rounded-xl p-4 border border-white/10 bg-gradient-to-br ${gradient} backdrop-blur-sm`}>
    <div className="mb-2">{icon}</div>
    <h3 className="text-white font-bold text-sm mb-1">{title}</h3>
    <p className="text-white/65 text-xs leading-snug">{body}</p>
  </div>
);

export default GuestMarketingHero;
