import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Heart, Crown } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const REFRESH_MS = 60000;

const formatRelative = (iso) => {
  if (!iso) return '';
  try {
    const t = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - t) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return '';
  }
};

const RecentTippersTicker = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await axios.get(`${API}/payments/recent-public?limit=6`);
        if (!cancelled) setItems(r.data?.items || []);
      } catch {
        // silent — endpoint failure shouldn't break the home page
      }
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (!items || items.length === 0) return null;

  // Duplicate items for seamless loop
  const reel = [...items, ...items];

  return (
    <div
      data-testid="recent-tippers-ticker"
      className="relative overflow-hidden rounded-xl border border-pink-500/20 bg-gradient-to-r from-pink-900/20 via-purple-900/20 to-pink-900/20 py-3 my-6"
    >
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-900 to-transparent z-10 pointer-events-none" />
      <div className="flex items-center gap-3 px-4">
        <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/30 text-pink-200 text-xs font-bold uppercase tracking-wider">
          <Heart className="w-3 h-3 animate-pulse" /> Live tips
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex gap-6 animate-[ticker_45s_linear_infinite] whitespace-nowrap">
            {reel.map((it, i) => {
              const isPro = it.payment_type === 'pro_subscription';
              return (
                <div key={`${it.created_at}-${i}`} className="flex items-center gap-2 text-sm text-white/85" data-testid={i < items.length ? `ticker-item-${i}` : undefined}>
                  {isPro ? <Crown className="w-4 h-4 text-yellow-300" /> : <Heart className="w-4 h-4 text-pink-300" />}
                  <span className="font-semibold text-white">{it.name}</span>
                  <span className="text-white/60">
                    {isPro ? 'subscribed' : 'tipped'}
                  </span>
                  <span className="font-bold text-pink-300">${Number(it.amount).toFixed(2)}</span>
                  {it.location && <span className="text-white/50">· {it.location}</span>}
                  <span className="text-white/40 text-xs">· {formatRelative(it.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default RecentTippersTicker;
