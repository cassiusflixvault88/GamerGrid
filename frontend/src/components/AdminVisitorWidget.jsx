import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Users, TrendingUp, RefreshCw, BarChart3, Sparkles } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * AdminVisitorWidget — a private "Owner only" card showing real-time visitor
 * stats. Renders only when the signed-in viewer is an admin (CEO/founder) so
 * regular profile viewers never see it.
 */
const AdminVisitorWidget = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const isAdmin = Boolean(user && user.is_admin);

  const fetchSummary = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`${API}/analytics/new-visitors-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(r.data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    // Run the backfill once per session so stale CEO visits drop out.
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const ran = sessionStorage.getItem('gg_backfill_ran');
        if (!ran) {
          await axios.post(`${API}/analytics/admin/backfill-admin-flag`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
          sessionStorage.setItem('gg_backfill_ran', '1');
        }
      } catch { /* silent */ }
      fetchSummary();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const cleanMyVisits = async () => {
    if (!isAdmin || busy) return;
    setBusy(true);
    try {
      const token = localStorage.getItem('token');
      const r = await axios.post(`${API}/analytics/admin/backfill-admin-flag`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      sessionStorage.setItem('gg_backfill_ran', '1');
      // Show how many got cleaned
      const n = r.data?.updated || 0;
      // Small inline toast via title (avoid pulling toast lib here)
      console.log(`✅ Cleaned ${n} of your own visits from public stats.`);
      await fetchSummary();
    } catch { /* silent */ } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) return null;

  const Block = ({ label, visitors, newVisitors }) => (
    <div className="rounded-xl bg-black/40 border border-white/10 p-4">
      <p className="text-white/50 text-xs uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-extrabold text-white">{visitors ?? '—'}</span>
        <span className="text-white/50 text-xs">visitors</span>
      </div>
      <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
        <Sparkles className="w-3.5 h-3.5" />
        +{newVisitors ?? 0} new
      </div>
    </div>
  );

  return (
    <div
      className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-900/20 via-black/60 to-purple-900/20 p-5 sm:p-6 mb-6 backdrop-blur-sm"
      data-testid="admin-visitor-widget"
    >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              Your Traffic
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 uppercase tracking-wider font-bold">
                Owner only
              </span>
            </h2>
            <p className="text-white/50 text-xs">Real visitors only — your own browsing is excluded.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={cleanMyVisits}
            disabled={busy}
            className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-lg border border-white/15 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Re-run the cleanup of your own visits from public stats"
            data-testid="admin-cleanup-visits"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
            Clean my visits
          </button>
          <a
            href="/admin/analytics"
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 rounded-lg border border-emerald-400/30 transition-colors flex items-center gap-1.5"
            data-testid="admin-full-analytics"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Full dashboard →
          </a>
        </div>
      </div>

      {loading && !data ? (
        <p className="text-white/50 text-sm">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Block label="Last 24 hours" visitors={data?.last_24h?.visitors} newVisitors={data?.last_24h?.new_visitors} />
          <Block label="Last 7 days" visitors={data?.last_7d?.visitors} newVisitors={data?.last_7d?.new_visitors} />
          <Block label="Last 30 days" visitors={data?.last_30d?.visitors} newVisitors={data?.last_30d?.new_visitors} />
        </div>
      )}

      {data && data.last_24h?.new_visitors > 0 && (
        <div className="mt-4 flex items-center gap-2 text-emerald-300 text-sm">
          <TrendingUp className="w-4 h-4" />
          🎉 You got {data.last_24h.new_visitors} brand-new visitor{data.last_24h.new_visitors === 1 ? '' : 's'} in the last 24h.
        </div>
      )}
    </div>
  );
};

export default AdminVisitorWidget;
