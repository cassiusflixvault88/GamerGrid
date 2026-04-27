import React from 'react';
import axios from 'axios';
import { Crown, Sparkles, CreditCard } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SubscriptionTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleUpgradeToPro = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/payments/subscription/checkout`,
        { origin_url: window.location.origin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.url) window.location.href = response.data.url;
    } catch (error) {
      toast({
        title: 'Could not start checkout',
        description: error.response?.data?.detail || 'Try again in a moment',
        variant: 'destructive',
      });
    }
  };

  if (user?.is_pro || user?.is_admin) {
    return (
      <div
        className="bg-gradient-to-br from-yellow-500/15 via-yellow-400/5 to-transparent border border-yellow-500/40 rounded-lg p-6 mb-6"
        data-testid="pro-active-card"
      >
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500 rounded-lg">
              <Crown className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                GamerGrid PRO
                <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs font-black rounded">ACTIVE</span>
              </h2>
              <p className="text-white/60 text-sm">
                {user?.is_admin ? 'CEO / Admin · all Pro perks unlocked' : 'Thanks for supporting GamerGrid!'}
              </p>
            </div>
          </div>
          {!user?.is_admin && (
            <Button
              variant="outline"
              className="bg-white/5 border-white/20 text-white/80 hover:bg-white/10"
              data-testid="manage-subscription-btn"
              onClick={() =>
                toast({
                  title: 'Manage subscription',
                  description: 'Email cassiusflixvault@gmail.com to cancel or update your subscription.',
                })
              }
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Manage
            </Button>
          )}
        </div>
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-white/80">
          <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> 100% ad-free</li>
          <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> Save trailers to your library</li>
          <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> Early access to new features</li>
          <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> Priority support</li>
        </ul>
      </div>
    );
  }

  return (
    <div
      className="bg-gradient-to-br from-yellow-500/10 via-purple-500/5 to-transparent border border-yellow-500/30 rounded-lg p-6 mb-6"
      data-testid="pro-upgrade-card"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-3 bg-yellow-500 rounded-lg">
          <Crown className="w-5 h-5 text-black" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Upgrade to GamerGrid PRO</h2>
          <p className="text-yellow-400 text-sm font-semibold">$4.99/month · cancel anytime</p>
        </div>
      </div>
      <ul className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-white/80">
        <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> 100% ad-free experience</li>
        <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> Save trailers to your library</li>
        <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> Early access to new features</li>
        <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> Priority support</li>
      </ul>
      <Button
        onClick={handleUpgradeToPro}
        className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
        data-testid="upgrade-pro-btn"
      >
        <Crown className="w-4 h-4 mr-2" />
        Upgrade to Pro — $4.99/mo
      </Button>
    </div>
  );
};

export default SubscriptionTab;
