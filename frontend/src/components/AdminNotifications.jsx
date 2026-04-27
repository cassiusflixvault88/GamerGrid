import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Bell, Heart, Crown, MessageSquare, Star, UserPlus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Admin notifications card — shows counts of new tips, subs, reviews, signups
 * since the admin last marked them as seen.
 */
const AdminNotifications = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`${API}/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(r.data);
    } catch (e) {
      console.error('admin notifications load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // refresh every 60s
    return () => clearInterval(t);
  }, [load]);

  const markSeen = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/admin/notifications/seen`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch (e) {
      // swallow
    }
  };

  if (loading || !data) return null;

  const items = [
    { key: 'tips', label: 'New Tips 💖', count: data.new_tips, Icon: Heart, color: 'text-pink-400', onClick: () => navigate('/admin?tab=overview') },
    { key: 'subs', label: 'New Pro Subs', count: data.new_subscriptions, Icon: Crown, color: 'text-yellow-400', onClick: () => navigate('/admin?tab=overview') },
    { key: 'app_reviews', label: 'New App Reviews', count: data.new_app_reviews, Icon: Star, color: 'text-orange-400', onClick: () => navigate('/admin?tab=app-reviews') },
    { key: 'game_reviews', label: 'New Game Reviews', count: data.new_game_reviews, Icon: MessageSquare, color: 'text-blue-400', onClick: () => navigate('/admin?tab=reviews') },
    { key: 'signups', label: 'New Sign-ups', count: data.new_users, Icon: UserPlus, color: 'text-green-400', onClick: () => navigate('/admin?tab=users') },
  ];

  const hasAny = data.total > 0;

  return (
    <div
      data-testid="admin-notifications"
      className={`rounded-2xl p-5 border ${
        hasAny
          ? 'bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-orange-900/30 border-pink-500/40 shadow-lg shadow-pink-500/10'
          : 'bg-white/5 border-white/10'
      }`}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className={`w-6 h-6 ${hasAny ? 'text-pink-300 animate-pulse' : 'text-white/50'}`} />
            {hasAny && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center" data-testid="admin-notif-badge">
                {data.total > 99 ? '99+' : data.total}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {hasAny ? 'You have new activity!' : "You're all caught up ✨"}
            </h2>
            <p className="text-white/50 text-xs">
              Since {data.last_seen ? new Date(data.last_seen).toLocaleString() : 'recently'}
            </p>
          </div>
        </div>
        {hasAny && (
          <button
            onClick={markSeen}
            data-testid="admin-notif-mark-seen"
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-all"
          >
            <Check className="w-4 h-4" />
            Mark all seen
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map(({ key, label, count, Icon, color, onClick }) => (
          <button
            key={key}
            onClick={onClick}
            data-testid={`admin-notif-${key}`}
            className={`p-3 rounded-xl border text-left transition-all ${
              count > 0
                ? 'bg-white/10 border-white/20 hover:bg-white/15'
                : 'bg-white/5 border-white/10 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-white/70 text-xs">{label}</span>
            </div>
            <p className="text-white text-2xl font-bold">{count}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminNotifications;
