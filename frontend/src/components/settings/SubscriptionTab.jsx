import React, { useState } from 'react';
import axios from 'axios';
import { Crown, Sparkles, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SubscriptionTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUpgradeToPro = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/payments/subscription/checkout`,
        { origin_url: window.location.origin },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000 
        }
      );

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        toast({
          title: "Error",
          description: "No checkout URL received",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: 'Could not start checkout',
        description: error.response?.data?.detail || error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (user?.is_pro || user?.is_admin) {
    return (
      <div className="bg-gradient-to-br from-yellow-500/15 via-yellow-400/5 to-transparent border border-yellow-500/40 rounded-lg p-6 mb-6">
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
    <div className="bg-gradient-to-br from-yellow-500/10 via-purple-500/5 to-transparent border border-yellow-500/30 rounded-lg p-6 mb-6">
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
        disabled={loading}
        className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Redirecting to Stripe...
          </>
        ) : (
          <>
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Pro — $4.99/mo
          </>
        )}
      </Button>
    </div>
  );
};

export default SubscriptionTab;
