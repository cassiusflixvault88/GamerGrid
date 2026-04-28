import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { Heart, Crown, MapPin, Volume2, VolumeX, Bell, BellOff } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const POLL_MS = 15000;
const SEEN_KEY = 'gg_admin_tips_seen_ids';
const SOUND_KEY = 'gg_admin_tips_sound';
const NOTIF_KEY = 'gg_admin_tips_notif';

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

const playDing = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    // Two-note bell: G5 then C6
    [
      { freq: 783.99, start: 0.0, dur: 0.35 },
      { freq: 1046.5, start: 0.18, dur: 0.45 },
    ].forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });
    setTimeout(() => ctx.close && ctx.close(), 1200);
  } catch (e) {
    // ignore — autoplay policy may block until first user gesture
  }
};

const showBrowserNotification = (tip) => {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const isPro = tip.payment_type === 'pro_subscription';
    const title = isPro ? `🎉 New Pro Subscriber!` : `💰 New Tip Received!`;
    const body = `$${tip.amount.toFixed(2)} from ${tip.display_name}${tip.city ? ` · ${tip.city}, ${tip.country_code}` : ''}`;
    new Notification(title, {
      body,
      icon: '/gamergrid-icon.svg',
      badge: '/gamergrid-icon.svg',
      tag: tip.session_id,
    });
  } catch {
    // ignore
  }
};

const AdminTipsFeed = () => {
  const [tips, setTips] = useState([]);
  const [totals, setTotals] = useState({ tips: 0, subs: 0, all: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem(SOUND_KEY) !== 'off');
  const [notifPerm, setNotifPerm] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));
  const seenIdsRef = useRef(new Set());
  const firstLoadRef = useRef(true);

  // Load seen IDs from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
      seenIdsRef.current = new Set(saved);
    } catch {
      seenIdsRef.current = new Set();
    }
  }, []);

  const persistSeen = (set) => {
    try {
      // Cap at 500 IDs
      const arr = Array.from(set).slice(-500);
      localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
    } catch { /* ignore */ }
  };

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`${API}/payments/admin/tips-feed?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newTips = r.data?.tips || [];
      const newTotals = r.data?.totals || { tips: 0, subs: 0, all: 0, count: 0 };
      const recovered = r.data?.recovered || 0;

      // Detect newly arrived tips (not seen before)
      const fresh = newTips.filter((t) => t.session_id && !seenIdsRef.current.has(t.session_id));

      setTips(newTips);
      setTotals(newTotals);

      // Mark all current as seen
      newTips.forEach((t) => t.session_id && seenIdsRef.current.add(t.session_id));
      persistSeen(seenIdsRef.current);

      // Fire alerts only if NOT first load (avoid spamming on dashboard open)
      if (!firstLoadRef.current && fresh.length > 0) {
        if (localStorage.getItem(SOUND_KEY) !== 'off') playDing();
        // Notify on the newest one
        showBrowserNotification(fresh[0]);
      }
      // If reconciliation recovered any missed payments, show an alert even on first load
      if (recovered > 0) {
        if (localStorage.getItem(SOUND_KEY) !== 'off') playDing();
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`✅ Recovered ${recovered} missed payment${recovered > 1 ? 's' : ''}!`, {
              body: 'Payment succeeded on Stripe but never got marked as paid. Fixed now.',
              icon: '/gamergrid-icon.svg',
            });
          }
        } catch { /* ignore */ }
      }
      firstLoadRef.current = false;
    } catch (e) {
      // 403 means non-admin — silently hide
      // console.error('tips feed load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    if (next) playDing(); // confirmation chirp
  };

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPerm(perm);
      localStorage.setItem(NOTIF_KEY, perm);
      if (perm === 'granted') {
        new Notification('🔔 GamerGrid alerts on!', {
          body: "You'll get a desktop ping the moment someone tips you.",
          icon: '/gamergrid-icon.svg',
        });
      }
    } catch { /* ignore */ }
  };

  if (loading) return null;

  return (
    <div
      data-testid="admin-tips-feed"
      className="rounded-2xl p-5 border border-pink-500/30 bg-gradient-to-br from-pink-900/30 via-purple-900/20 to-gray-900/40 shadow-lg shadow-pink-500/10"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
            <Heart className="w-5 h-5 text-pink-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Live Tips & Subs Feed</h2>
            <p className="text-white/50 text-xs">Auto-refreshes every {POLL_MS / 1000}s · ding on new payments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            data-testid="tips-feed-toggle-sound"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-all"
            title={soundOn ? 'Mute ding' : 'Enable ding'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-60" />}
            {soundOn ? 'Sound on' : 'Muted'}
          </button>
          {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
            <button
              onClick={enableNotifications}
              data-testid="tips-feed-enable-notif"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/30 hover:bg-pink-500/50 rounded-lg text-white text-xs transition-all"
              title="Enable browser notifications"
            >
              <BellOff className="w-4 h-4" />
              Enable phone alerts
            </button>
          )}
          {notifPerm === 'granted' && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 rounded-lg text-green-300 text-xs">
              <Bell className="w-4 h-4" /> Alerts on
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-white/50 text-xs">Total Earned</p>
          <p className="text-white text-2xl font-bold" data-testid="tips-total-all">${totals.all.toFixed(2)}</p>
        </div>
        <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-3">
          <p className="text-pink-300 text-xs">Tips</p>
          <p className="text-white text-2xl font-bold" data-testid="tips-total-tips">${totals.tips.toFixed(2)}</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
          <p className="text-yellow-300 text-xs">Pro Subs</p>
          <p className="text-white text-2xl font-bold" data-testid="tips-total-subs">${totals.subs.toFixed(2)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-white/50 text-xs">Payments</p>
          <p className="text-white text-2xl font-bold" data-testid="tips-total-count">{totals.count}</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tips-feed-table">
            <thead className="bg-white/5">
              <tr className="text-left text-white/60 text-xs uppercase tracking-wider">
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">From</th>
                <th className="px-4 py-2">Where</th>
                <th className="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {tips.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-white/50">
                    No payments yet — your first tip will land here with a ding.
                  </td>
                </tr>
              )}
              {tips.map((t) => {
                const isPro = t.payment_type === 'pro_subscription';
                return (
                  <tr key={t.session_id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                      ${Number(t.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isPro ? 'bg-yellow-500/20 text-yellow-300' : 'bg-pink-500/20 text-pink-300'}`}>
                        {isPro ? <Crown className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                        {isPro ? 'Pro' : 'Tip'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/90">
                      {t.display_name || 'Anonymous'}
                      {t.username && t.username !== t.display_name && (
                        <span className="text-white/40 text-xs ml-1">@{t.username}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {t.city || t.country ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-white/40" />
                          {[t.city, t.country_code || t.country].filter(Boolean).join(', ')}
                        </span>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                      {formatRelative(t.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTipsFeed;
