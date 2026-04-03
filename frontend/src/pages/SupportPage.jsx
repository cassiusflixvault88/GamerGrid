import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Heart, Crown, Zap, Check, Gift, Star, X, Home, Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SupportPage = () => {
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleTip = async (packageId) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to support FlixVault',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const originUrl = window.location.origin;

      const response = await axios.post(
        `${API}/payments/tip/checkout`,
        {
          package_id: packageId,
          payment_type: 'tip',
          origin_url: originUrl,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to process tip',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleCustomTip = async () => {
    const amount = parseFloat(customAmount);

    if (!amount || amount < 1) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter an amount of at least $1',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to support FlixVault',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const originUrl = window.location.origin;

      const response = await axios.post(
        `${API}/payments/tip/custom`,
        {
          amount: amount,
          origin_url: originUrl,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      window.location.href = response.data.url;
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to process custom tip',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleUpgradeToPro = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to upgrade to Pro',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const originUrl = window.location.origin;

      const response = await axios.post(
        `${API}/payments/subscription/checkout`,
        {
          package_id: 'pro',
          payment_type: 'subscription',
          origin_url: originUrl,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      window.location.href = response.data.url;
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to start upgrade process',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900">
      <Navbar />
      <BackNavigation />

      <div className="max-w-7xl mx-auto px-4 py-12 mt-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Support <span className="text-purple-400">FlixVault</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Help us keep FlixVault free and ad-free for everyone. Your support means the world! 💜
          </p>
        </div>

        {/* Pro Upgrade Card */}
        <Card className="bg-gradient-to-r from-purple-600 to-pink-600 border-none p-8 mb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-8 h-8 text-yellow-300" />
                <h2 className="text-3xl font-bold">FlixVault Pro</h2>
              </div>
              <p className="text-lg mb-4">Unlock premium features for just $4.99/month</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>No Ads Ever</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>Unlimited Watchlist</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>Early Access to Content</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>Custom Lists</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>Download Trailers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>Priority Support</span>
                </div>
              </div>

              <Button
                onClick={handleUpgradeToPro}
                disabled={loading}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-6 text-lg"
              >
                <Crown className="w-5 h-5 mr-2" />
                Upgrade to Pro - $4.99/month
              </Button>
            </div>

            <div className="flex-shrink-0">
              <Star className="w-32 h-32 text-yellow-300 opacity-50" />
            </div>
          </div>
        </Card>

        {/* One-Time Tips */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white text-center mb-2">
            Or Send a One-Time Tip
          </h2>
          <p className="text-gray-400 text-center mb-8">
            Every contribution helps us improve FlixVault
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card
              onClick={() => handleTip('small')}
              className="p-6 cursor-pointer hover:border-purple-500 transition-all hover:scale-105 bg-gray-800 border-gray-700"
            >
              <div className="text-center">
                <Gift className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">$1</p>
                <p className="text-sm text-gray-400">Coffee</p>
              </div>
            </Card>

            <Card
              onClick={() => handleTip('medium')}
              className="p-6 cursor-pointer hover:border-purple-500 transition-all hover:scale-105 bg-gray-800 border-gray-700"
            >
              <div className="text-center">
                <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">$5</p>
                <p className="text-sm text-gray-400">Generous</p>
              </div>
            </Card>

            <Card
              onClick={() => handleTip('large')}
              className="p-6 cursor-pointer hover:border-purple-500 transition-all hover:scale-105 bg-gray-800 border-gray-700"
            >
              <div className="text-center">
                <Heart className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">$10</p>
                <p className="text-sm text-gray-400">Amazing</p>
              </div>
            </Card>

            <Card
              onClick={() => handleTip('huge')}
              className="p-6 cursor-pointer hover:border-purple-500 transition-all hover:scale-105 bg-gray-800 border-gray-700"
            >
              <div className="text-center">
                <Crown className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">$20</p>
                <p className="text-sm text-gray-400">Legendary</p>
              </div>
            </Card>
          </div>

          {/* Custom Amount */}
          <Card className="p-6 bg-gray-800 border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Custom Amount</h3>
            <div className="flex gap-4">
              <Input
                type="number"
                placeholder="Enter amount ($)"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="flex-1 bg-gray-700 border-gray-600 text-white"
                min="1"
                step="0.01"
              />
              <Button
                onClick={handleCustomTip}
                disabled={loading || !customAmount}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Heart className="w-4 h-4 mr-2" />
                Send Tip
              </Button>
            </div>
          </Card>
        </div>

        {/* Why Support */}
        <Card className="p-8 bg-gray-800/50 border-gray-700 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">
            Why Your Support Matters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-300">
            <div>
              <p className="font-semibold mb-2">🎬 More Content</p>
              <p className="text-sm">
                We can expand our catalog and add more movies and TV shows
              </p>
            </div>
            <div>
              <p className="font-semibold mb-2">🚀 Better Features</p>
              <p className="text-sm">
                Your support helps us build new features you'll love
              </p>
            </div>
            <div>
              <p className="font-semibold mb-2">💚 Ad-Free Experience</p>
              <p className="text-sm">
                Help us keep FlixVault clean and ad-free for everyone
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default SupportPage;
