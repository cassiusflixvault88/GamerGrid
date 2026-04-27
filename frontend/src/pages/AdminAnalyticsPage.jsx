import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Users, Eye, MousePointerClick, TrendingUp, Globe, Calendar, ArrowLeft, Mail, Send, Eye as EyeIcon, Clock, Smartphone, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackNavigation from '../components/BackNavigation';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RANGES = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '1 year', value: 365 },
];

const AdminAnalyticsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  const loadDigestRuns = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`${API}/email/digest/runs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLastRun((r.data.runs || [])[0] || null);
    } catch { /* ignore */ }
  }, []);

  const handlePreviewDigest = async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`${API}/email/digest/preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(r.data.html);
        w.document.close();
      }
    } catch (e) {
      toast({
        title: 'Preview failed',
        description: e.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    }
  };

  const handleSendTest = async () => {
    setEmailBusy(true);
    try {
      const token = localStorage.getItem('token');
      const r = await axios.post(`${API}/email/digest/send-test`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({
        title: 'Test email sent ✉️',
        description: `Sent to ${r.data.recipient}`,
      });
    } catch (e) {
      toast({
        title: 'Test send failed',
        description: e.response?.data?.detail || 'Check RESEND_API_KEY in .env',
        variant: 'destructive',
      });
    } finally {
      setEmailBusy(false);
    }
  };

  const handleSendWeekly = async () => {
    if (!window.confirm('Send the weekly digest to ALL subscribed users now? This cannot be undone.')) return;
    setEmailBusy(true);
    try {
      const token = localStorage.getItem('token');
      const r = await axios.post(`${API}/email/digest/send-weekly`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({
        title: 'Weekly digest broadcast 🚀',
        description: `Sent: ${r.data.sent} • Failed: ${r.data.failed}`,
      });
      loadDigestRuns();
    } catch (e) {
      toast({
        title: 'Broadcast failed',
        description: e.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    } finally {
      setEmailBusy(false);
    }
  };

  const load = useCallback(async (rangeDays) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/analytics/dashboard?days=${rangeDays}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (e) {
      toast({
        title: 'Failed to load analytics',
        description: e.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/');
      return;
    }
    const check = async () => {
      try {
        const token = localStorage.getItem('token');
        const r = await axios.get(`${API}/admin/check`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.data.is_admin) {
          setIsAdmin(true);
          load(days);
        } else {
          navigate('/');
        }
      } catch {
        navigate('/');
      }
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  useEffect(() => {
    if (isAdmin) load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  if (authLoading || (loading && !data)) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-32 text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const totals = data?.totals || {};
  const daily = data?.daily || [];
  const topPages = data?.top_pages || [];
  const topReferrers = data?.top_referrers || [];
  const recentVisits = data?.recent_visits || [];

  const formatTime = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now - d;
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDay = Math.floor(diffHr / 24);
      if (diffDay < 7) return `${diffDay}d ago`;
      return d.toLocaleDateString();
    } catch {
      return iso;
    }
  };

  // Compute max for bar chart
  const maxDaily = Math.max(1, ...daily.map(d => d.views));

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <BackNavigation />
      <div className="pt-24 pb-16 px-6 lg:px-12 max-w-7xl mx-auto" data-testid="admin-analytics-page">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="text-white/70 hover:text-white"
              data-testid="analytics-back-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Admin
            </Button>
            <BarChart3 className="w-8 h-8 text-yellow-400" />
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-white/60 text-sm">Visitor & engagement insights</p>
            </div>
          </div>

          {/* Range selector */}
          <div className="flex gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setDays(r.value)}
                data-testid={`analytics-range-${r.value}`}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  days === r.value
                    ? 'bg-yellow-400 text-black'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* All-Time Hero Stats */}
        <Card className="bg-gradient-to-r from-yellow-500/10 via-yellow-400/5 to-transparent border-yellow-500/30 p-6 mb-4" data-testid="analytics-alltime-card">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-yellow-400">Real Visitor Totals</h2>
            </div>
            <span className="text-xs text-white/50 italic">Your own visits are excluded ✓</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider">All-Time Page Views</p>
              <p className="text-3xl font-bold text-white" data-testid="alltime-views">{(totals.all_time_views || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider">All-Time Visitors</p>
              <p className="text-3xl font-bold text-white" data-testid="alltime-visitors">{(totals.all_time_visitors || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider">Signed-up Users</p>
              <p className="text-3xl font-bold text-white" data-testid="alltime-users">{(totals.total_users || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider">Conversion (period)</p>
              <p className="text-3xl font-bold text-green-400" data-testid="period-conversion">{totals.conversion_rate || 0}%</p>
            </div>
          </div>
        </Card>

        {/* Last 24h Live Pulse */}
        <Card className="bg-gradient-to-r from-green-500/10 to-transparent border-green-500/30 p-5 mb-8" data-testid="live-pulse-card">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Clock className="w-5 h-5 text-green-400" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            </div>
            <h2 className="text-lg font-semibold text-green-400">Last 24 Hours</h2>
            <div className="flex gap-6 ml-auto flex-wrap">
              <div>
                <span className="text-2xl font-bold text-white" data-testid="views-24h">{(totals.views_24h || 0).toLocaleString()}</span>
                <span className="text-white/60 text-sm ml-2">page views</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-white" data-testid="visitors-24h">{(totals.visitors_24h || 0).toLocaleString()}</span>
                <span className="text-white/60 text-sm ml-2">visitors</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Period Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10 p-5" data-testid="period-views-card">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="w-5 h-5 text-blue-400" />
              <p className="text-white/60 text-sm">Page Views</p>
            </div>
            <p className="text-3xl font-bold text-white">{(totals.page_views || 0).toLocaleString()}</p>
            <p className="text-white/40 text-xs mt-1">last {days} days</p>
          </Card>

          <Card className="bg-white/5 border-white/10 p-5" data-testid="period-visitors-card">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-purple-400" />
              <p className="text-white/60 text-sm">Unique Visitors</p>
            </div>
            <p className="text-3xl font-bold text-white">{(totals.unique_visitors || 0).toLocaleString()}</p>
            <p className="text-white/40 text-xs mt-1">last {days} days</p>
          </Card>

          <Card className="bg-white/5 border-white/10 p-5" data-testid="period-sessions-card">
            <div className="flex items-center gap-3 mb-2">
              <MousePointerClick className="w-5 h-5 text-cyan-400" />
              <p className="text-white/60 text-sm">Sessions</p>
            </div>
            <p className="text-3xl font-bold text-white">{(totals.sessions || 0).toLocaleString()}</p>
            <p className="text-white/40 text-xs mt-1">last {days} days</p>
          </Card>

          <Card className="bg-white/5 border-white/10 p-5" data-testid="period-newusers-card">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <p className="text-white/60 text-sm">New Sign-ups</p>
            </div>
            <p className="text-3xl font-bold text-white">{(totals.new_users_in_period || 0).toLocaleString()}</p>
            <p className="text-white/40 text-xs mt-1">last {days} days</p>
          </Card>
        </div>

        {/* Daily Bar Chart */}
        <Card className="bg-white/5 border-white/10 p-6 mb-8" data-testid="daily-chart-card">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Daily Page Views</h2>
          </div>
          {daily.length === 0 ? (
            <p className="text-white/50 py-12 text-center">No data yet — visit the app to start tracking!</p>
          ) : (
            <div className="flex items-end gap-1 h-48 overflow-x-auto pb-2">
              {daily.map((d) => {
                const heightPct = Math.max(2, (d.views / maxDaily) * 100);
                return (
                  <div
                    key={d.date}
                    className="group flex flex-col items-center min-w-[24px] flex-1"
                    title={`${d.date}: ${d.views} views, ${d.visitors} visitors`}
                  >
                    <div
                      className="w-full bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t hover:from-yellow-400 hover:to-yellow-200 transition-colors relative"
                      style={{ height: `${heightPct}%` }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black px-2 py-0.5 rounded">
                        {d.views}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/40 mt-1 rotate-45 origin-left whitespace-nowrap">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top Pages + Referrers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/5 border-white/10 p-6" data-testid="top-pages-card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Top Pages
            </h2>
            {topPages.length === 0 ? (
              <p className="text-white/50 text-sm">No data yet</p>
            ) : (
              <div className="space-y-2">
                {topPages.map((p, i) => (
                  <div key={p.path} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white/40 w-6">{i + 1}.</span>
                      <span className="text-white truncate font-mono text-xs">{p.path}</span>
                    </div>
                    <span className="text-yellow-400 font-semibold ml-2">{p.views.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="bg-white/5 border-white/10 p-6" data-testid="top-referrers-card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-green-400" />
              Top Referrers
            </h2>
            {topReferrers.length === 0 ? (
              <p className="text-white/50 text-sm">No referrer data yet — most visitors are direct or search.</p>
            ) : (
              <div className="space-y-2">
                {topReferrers.map((r, i) => (
                  <div key={r.referrer} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white/40 w-6">{i + 1}.</span>
                      <span className="text-white truncate text-xs">{r.referrer}</span>
                    </div>
                    <span className="text-green-400 font-semibold ml-2">{r.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Visitors Live Feed */}
        <Card className="bg-white/5 border-white/10 p-6 mt-6" data-testid="recent-visits-card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Recent Visitors
              <span className="text-xs text-white/50 font-normal">(last 50, your own excluded)</span>
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => load(days)}
              className="bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
              data-testid="refresh-recent-btn"
            >
              Refresh
            </Button>
          </div>
          {recentVisits.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/40 text-sm mb-1">No visitors yet besides you.</p>
              <p className="text-white/30 text-xs">Share your link — every real visit will show up here in real time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="text-left py-2 pr-3">When</th>
                    <th className="text-left py-2 pr-3">Page</th>
                    <th className="text-left py-2 pr-3">Came From</th>
                    <th className="text-left py-2 pr-3">Device</th>
                    <th className="text-left py-2">Visitor</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVisits.map((v, i) => (
                    <tr key={`${v.ts ?? 'visit'}-${i}`} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 pr-3 text-white/80 whitespace-nowrap">{formatTime(v.ts)}</td>
                      <td className="py-2 pr-3 text-white font-mono text-xs">{v.path}</td>
                      <td className="py-2 pr-3 text-green-300 text-xs">{v.referrer}</td>
                      <td className="py-2 pr-3 text-white/60 text-xs flex items-center gap-1">
                        <Smartphone className="w-3 h-3" />
                        {v.device}
                      </td>
                      <td className="py-2 text-white/40 font-mono text-xs">{v.visitor_id_short}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Weekly Email Digest Controls */}
        <Card className="bg-white/5 border-white/10 p-6 mt-8" data-testid="email-digest-card">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Top 10 Weekly Digest Email</h2>
          </div>
          <p className="text-white/60 text-sm mb-4">
            Send the current Top 10 to all subscribed users. Make sure <code className="bg-black/40 px-1 rounded">RESEND_API_KEY</code> is set in <code className="bg-black/40 px-1 rounded">backend/.env</code>.
          </p>
          {lastRun && (
            <p className="text-white/50 text-xs mb-4">
              Last broadcast: {new Date(lastRun.ts).toLocaleString()} — sent <span className="text-green-400">{lastRun.sent_count}</span>, failed <span className="text-red-400">{lastRun.failed_count}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handlePreviewDigest}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              data-testid="digest-preview-btn"
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              Preview Email
            </Button>
            <Button
              onClick={handleSendTest}
              disabled={emailBusy}
              variant="outline"
              className="bg-blue-500/20 border-blue-500/40 text-blue-300 hover:bg-blue-500/30"
              data-testid="digest-test-btn"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Test to Me
            </Button>
            <Button
              onClick={handleSendWeekly}
              disabled={emailBusy}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              data-testid="digest-broadcast-btn"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Weekly to All Subscribers
            </Button>
          </div>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default AdminAnalyticsPage;
