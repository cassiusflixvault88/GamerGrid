import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';

// Bump this version every time you ship a new "what's new" entry. The pulsing
// badge re-appears for everyone who hasn't dismissed THIS version yet.
const CURRENT_VERSION = '2026.02.26';

const ENTRIES = [
  {
    title: '10,000+ games — fresh categories',
    body: '350 PlayStation, 250 Xbox, 250 PC and 200 Switch titles. Plus new homepage rails for RPG, Shooters, Open World, Sci-Fi, Horror, Racing and Indie Gems.',
    emoji: '🎮',
  },
  {
    title: 'Top 10 chart now rotates',
    body: 'Slots 1–3 lock to today\'s real chart-toppers, slots 4–10 shuffle so you don\'t see the same lineup every visit.',
    emoji: '🔁',
  },
  {
    title: 'Saved Trailers moved to "My Library"',
    body: 'Trailers you save now live alongside your saved games — open them right inside GamerGrid, no leaving the app.',
    emoji: '🎬',
  },
  {
    title: 'Pro membership lives — $4.99/mo',
    body: '100% ad-free, save trailers to your library, early access to new features. Cancel anytime.',
    emoji: '👑',
  },
];

const WhatsNewButton = () => {
  const [open, setOpen] = useState(false);
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem('gg_whats_new_version');
      setHasUnseen(seen !== CURRENT_VERSION);
    } catch { /* ignore */ }
  }, []);

  const markSeen = () => {
    try { localStorage.setItem('gg_whats_new_version', CURRENT_VERSION); } catch { /* ignore */ }
    setHasUnseen(false);
  };

  const handleOpen = () => {
    setOpen(true);
    // Mark seen on open so the pulse stops immediately
    markSeen();
  };

  return (
    <>
      <button
        onClick={handleOpen}
        title="What's new"
        aria-label="What's new"
        className="relative flex flex-col items-center gap-0.5 px-2 py-1 text-white/80 hover:text-white transition-colors group"
        data-testid="whats-new-btn"
      >
        <div className="relative">
          <Sparkles className="w-5 h-5" />
          {hasUnseen && (
            <>
              {/* Pulsing ping ring */}
              <span className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5 rounded-full bg-pink-500 opacity-75 animate-ping" />
              {/* Solid dot */}
              <span className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5 rounded-full bg-pink-500 ring-2 ring-black" />
            </>
          )}
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider leading-none ${
            hasUnseen ? 'text-pink-400' : 'text-white/60 group-hover:text-white/80'
          }`}
        >
          New Features
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-gradient-to-br from-gray-900 via-black to-purple-900/30 border-purple-500/30 p-0 overflow-hidden">
          <DialogTitle className="sr-only">What's New on GamerGrid</DialogTitle>
          <DialogDescription className="sr-only">Latest updates and features</DialogDescription>

          <div className="relative p-6 sm:p-8">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-pink-400" />
              <span className="uppercase tracking-wide text-pink-400 text-xs font-bold">What's New</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Fresh updates from GamerGrid</h2>
            <p className="text-white/60 text-sm mb-5">v{CURRENT_VERSION}</p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {ENTRIES.map((entry) => (
                <div
                  key={entry.title}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="text-2xl flex-shrink-0">{entry.emoji}</div>
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-1">{entry.title}</h3>
                    <p className="text-white/65 text-sm leading-relaxed">{entry.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold transition-all"
              data-testid="whats-new-dismiss"
            >
              Got it
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhatsNewButton;
