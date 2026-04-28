import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Heart, Crown, X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const POLL_MS = 30000;
const SHOW_MS = 8000;
const SEEN_KEY = 'gg_homepage_tip_seen';

/**
 * Floating "🔥 Someone just tipped!" pop-in for ALL homepage visitors.
 * Polls /api/payments/recent-public; when a NEW tip arrives, slides in from
 * bottom-right for 8 seconds. First-load suppression so it doesn't spam on
 * page refresh — only truly fresh tips fire the toast.
 */
const HomepageTipPing = () => {
  const [active, setActive] = useState(null); // current tip being shown, or null
  const seenRef = useRef(new Set());
  const firstLoadRef = useRef(true);
  const hideTimerRef = useRef(null);

  // Restore seen IDs (using created_at as ID since public endpoint doesn't expose session_id)
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]');
      seenRef.current = new Set(saved);
    } catch {
      seenRef.current = new Set();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await axios.get(`${API}/payments/recent-public?limit=5`);
        if (cancelled) return;
        const items = r.data?.items || [];
        if (firstLoadRef.current) {
          // Seed seen set with everything currently on the server — we only
          // alert on NEW tips that arrive after the visitor opened the page.
          items.forEach((it) => seenRef.current.add(it.created_at));
          firstLoadRef.current = false;
          try {
            sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seenRef.current)));
          } catch { /* ignore */ }
          return;
        }
        const fresh = items.find((it) => !seenRef.current.has(it.created_at));
        if (fresh) {
          seenRef.current.add(fresh.created_at);
          try {
            sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seenRef.current).slice(-50)));
          } catch { /* ignore */ }
          setActive(fresh);
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          hideTimerRef.current = setTimeout(() => setActive(null), SHOW_MS);
        }
      } catch {
        // silent
      }
    };
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!active) return null;
  const isPro = active.payment_type === 'pro_subscription';

  return (
    <div
      data-testid="homepage-tip-ping"
      className="fixed bottom-6 right-6 z-[60] max-w-xs animate-[gg-ping-slide_0.4s_ease-out_forwards]"
      style={{ animationFillMode: 'both' }}
    >
      <div className="rounded-2xl bg-gradient-to-br from-pink-600 via-fuchsia-500 to-rose-500 p-[1px] shadow-2xl shadow-pink-500/40">
        <div className="rounded-2xl bg-gray-900/95 backdrop-blur px-4 py-3 flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-500/30 flex items-center justify-center">
            {isPro ? <Crown className="w-5 h-5 text-yellow-300" /> : <Heart className="w-5 h-5 text-pink-300 animate-pulse" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">
              🔥 {active.name} just {isPro ? 'subscribed!' : 'tipped!'}
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              <span className="text-pink-300 font-bold">${Number(active.amount).toFixed(2)}</span>
              {active.location && <span className="text-white/50"> · {active.location}</span>}
            </p>
          </div>
          <button
            onClick={() => setActive(null)}
            data-testid="homepage-tip-ping-close"
            aria-label="Dismiss"
            className="flex-shrink-0 text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <style>{`
        @keyframes gg-ping-slide {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default HomepageTipPing;
