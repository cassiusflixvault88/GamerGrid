import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { BadgeCheck, MessageSquare, Star, Sparkles } from 'lucide-react';

/**
 * Compact "Meet the Creator" CTA shown on the Home page so any visitor — signed
 * in or guest — can find Cassius's public profile in one click and message
 * him or rate the app from there.
 */
const MeetCreatorCard = () => {
  const [founder, setFounder] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/founder`);
        if (!cancelled) setFounder(r.data || null);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!founder?.username) return null;

  const href = `/u/${encodeURIComponent(founder.username)}`;
  const avatar = founder.profile_picture_url || '/gamergrid-icon.svg';

  return (
    <Link
      to={href}
      data-testid="meet-creator-card"
      className="block group rounded-2xl overflow-hidden border border-yellow-500/30 bg-gradient-to-r from-yellow-500/15 via-orange-500/15 to-pink-500/15 hover:border-yellow-400/60 hover:from-yellow-500/25 hover:via-orange-500/25 hover:to-pink-500/25 transition-all"
    >
      <div className="px-5 sm:px-6 py-4 flex items-center gap-4 flex-wrap">
        <img
          src={avatar}
          alt={founder.display_name || founder.username}
          className="w-14 h-14 rounded-full object-cover border-2 border-yellow-400/60 bg-white/10 flex-shrink-0"
          onError={(e) => { e.target.src = '/gamergrid-icon.svg'; }}
        />
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-base sm:text-lg">{founder.display_name || founder.username}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-200 text-[10px] font-bold uppercase tracking-wider">
              <BadgeCheck className="w-3 h-3" />
              Founder
            </span>
          </div>
          <p className="text-white/70 text-xs sm:text-sm mt-0.5">
            Creator of GamerGrid · Tap to <span className="text-yellow-200 font-semibold">message him</span>, <span className="text-pink-200 font-semibold">rate the app</span>, or leave him a review.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 ml-auto">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/30 border border-purple-500/50 rounded-md text-purple-100 text-xs font-semibold group-hover:bg-purple-600/50 transition-colors">
            <MessageSquare className="w-3.5 h-3.5" /> Message
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-md text-yellow-100 text-xs font-semibold group-hover:bg-yellow-500/30 transition-colors">
            <Star className="w-3.5 h-3.5" /> Rate
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600/30 border border-pink-500/50 rounded-md text-pink-100 text-xs font-semibold group-hover:bg-pink-600/50 transition-colors">
            <Sparkles className="w-3.5 h-3.5" /> Review
          </span>
        </div>
      </div>
    </Link>
  );
};

export default MeetCreatorCard;
