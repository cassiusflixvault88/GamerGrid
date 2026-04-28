import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Gift, Copy, Check, Users, Crown, Trophy, Send, Sparkles, Loader2,
  Facebook, Twitter, MessageCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ReferAFriendPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [info, setInfo] = useState(null);
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [a, b] = await Promise.all([
        axios.get(`${API}/referrals/me`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/referrals/leaderboard`).catch(() => ({ data: { leaders: [] } })),
      ]);
      setInfo(a.data);
      setBoard(b.data?.leaders || []);
    } catch (e) {
      toast({ title: 'Could not load referral data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    load();
  }, [user, load, navigate]);

  const copyLink = async () => {
    if (!info?.share_url) return;
    try {
      await navigator.clipboard.writeText(info.share_url);
      setCopied(true);
      toast({ title: 'Link copied!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const redeem = async () => {
    if (!info?.pro_months_credit) return;
    setRedeeming(true);
    try {
      const token = localStorage.getItem('token');
      const r = await axios.post(`${API}/referrals/redeem-credits`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({
        title: `🎉 ${r.data.months_redeemed} month${r.data.months_redeemed === 1 ? '' : 's'} added to your Pro!`,
        description: `Pro now active until ${new Date(r.data.pro_until).toLocaleDateString()}`,
      });
      load();
    } catch (err) {
      toast({
        title: 'Could not redeem',
        description: err.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    } finally {
      setRedeeming(false);
    }
  };

  if (!user) return null;

  if (loading || !info) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  const url = info.share_url;
  const text = encodeURIComponent(`🎮 Join me on GamerGrid — discover, watch trailers and buy games on PS5/Xbox/PC/Switch. Sign up with my link and we BOTH get 1 free month of Pro! ${url}`);
  const u = encodeURIComponent(url);

  const socials = [
    { key: 'facebook',  label: 'Facebook', Icon: Facebook,       bg: 'bg-[#1877F2] hover:bg-[#0e63d6]', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: 'twitter',   label: 'X / Twitter', Icon: Twitter,    bg: 'bg-black hover:bg-gray-900', href: `https://twitter.com/intent/tweet?text=${text}` },
    { key: 'whatsapp',  label: 'WhatsApp', Icon: MessageCircle, bg: 'bg-[#25D366] hover:bg-[#1da851]', href: `https://wa.me/?text=${text}` },
    { key: 'telegram',  label: 'Telegram', Icon: Send,          bg: 'bg-[#229ED9] hover:bg-[#1a7eb0]', href: `https://t.me/share/url?url=${u}&text=${text}` },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white" data-testid="refer-page">
      <Navbar />
      <BackNavigation />

      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-24 pb-20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/30 mb-4">
            <Gift className="w-4 h-4 text-pink-400" />
            <span className="text-pink-300 text-xs font-bold uppercase tracking-widest">Refer a Friend — Both Get Pro!</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            Give 1 month free, get 1 month free
          </h1>
          <p className="text-white/70 mt-4 max-w-2xl mx-auto">
            Share your unique link. When a friend signs up and upgrades to GamerGrid Pro, you BOTH get a free month of Pro added to your account.
          </p>
        </div>

        {/* Stats card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-xl bg-white/5 border border-white/10" data-testid="stat-signups">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Friends signed up</span>
            </div>
            <p className="text-4xl font-bold text-white">{info.total_signups}</p>
          </div>
          <div className="p-5 rounded-xl bg-white/5 border border-white/10" data-testid="stat-pro">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span>Upgraded to Pro</span>
            </div>
            <p className="text-4xl font-bold text-yellow-300">{info.total_pro_conversions}</p>
          </div>
          <div className="p-5 rounded-xl bg-gradient-to-br from-purple-900/50 to-pink-900/40 border border-pink-500/40" data-testid="stat-credits">
            <div className="flex items-center gap-2 text-pink-300 text-sm mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Free Pro months earned</span>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-4xl font-bold text-white">{info.pro_months_credit}</p>
              {info.pro_months_credit > 0 && (
                <button
                  onClick={redeem}
                  disabled={redeeming}
                  data-testid="redeem-credits-btn"
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 text-black font-bold rounded-lg text-sm transition-all"
                >
                  {redeeming ? 'Redeeming…' : 'Redeem now'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Share link card */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 mb-8">
          <p className="text-white/60 text-xs uppercase tracking-wider font-bold mb-2">Your unique referral link</p>
          <div className="flex items-stretch gap-2 flex-wrap">
            <code
              className="flex-1 min-w-0 px-4 py-3 bg-black/40 rounded-lg text-purple-200 text-sm font-mono break-all"
              data-testid="referral-link"
            >
              {url}
            </code>
            <button
              onClick={copyLink}
              data-testid="copy-referral-link"
              className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold text-sm transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          <p className="text-white/50 text-xs mt-3">
            Code: <span className="font-mono text-purple-300">{info.code}</span> — anyone can also enter this manually.
          </p>

          {/* Social shortcuts */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {socials.map((s) => (
              <a
                key={s.key}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`refer-share-${s.key}`}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 ${s.bg} text-white rounded-lg text-sm font-semibold transition-all hover:scale-[1.02]`}
              >
                <s.Icon className="w-4 h-4" />
                {s.label}
              </a>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { n: 1, t: 'Share your link', d: 'Send it to friends, post it anywhere — Discord, group chat, social media.' },
            { n: 2, t: 'They sign up', d: 'When they create their GamerGrid account from your link, you\'re paired up.' },
            { n: 3, t: 'Both get Pro!', d: 'When your friend upgrades to GamerGrid Pro, you BOTH get 1 free month — automatically.' },
          ].map((s) => (
            <div key={s.n} className="p-5 rounded-xl bg-white/5 border border-white/10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm mb-3">
                {s.n}
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{s.t}</h3>
              <p className="text-white/60 text-sm">{s.d}</p>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        {board.length > 0 && (
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10" data-testid="leaderboard">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Top GamerGrid Ambassadors
            </h2>
            <div className="space-y-2">
              {board.map((leader, i) => (
                <div key={leader.username} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-300 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-white/70'
                  }`}>
                    {i + 1}
                  </span>
                  <img
                    src={leader.avatar || '/gamergrid-icon.svg'}
                    alt={leader.display_name}
                    className="w-8 h-8 rounded-full object-cover bg-white/10"
                    onError={(e) => { e.target.src = '/gamergrid-icon.svg'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{leader.display_name}</p>
                    <p className="text-white/50 text-xs">@{leader.username}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-300 font-bold text-sm">{leader.total_pro} Pro</p>
                    <p className="text-white/50 text-xs">{leader.total_signups} signups</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default ReferAFriendPage;
