import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Crown, Heart, Loader } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackNavigation from '../components/BackNavigation';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking'); // checking, success, error
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const navigate = useNavigate();

  const sessionId = searchParams.get('session_id');
  const maxAttempts = 5;

  useEffect(() => {
    if (sessionId) {
      checkPaymentStatus();
    } else {
      setStatus('error');
    }
  }, [sessionId, checkPaymentStatus]);

  const checkPaymentStatus = useCallback(async () => {
    if (attempts >= maxAttempts) {
      setStatus('error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/payments/checkout/status/${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.payment_status === 'paid') {
        setStatus('success');
        setPaymentInfo(response.data);
      } else if (response.data.status === 'expired') {
        setStatus('error');
      } else {
        // Still pending, poll again
        setAttempts(prev => prev + 1);
        setTimeout(() => checkPaymentStatus(), 2000);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
      setStatus('error');
    }
  }, [attempts, maxAttempts, sessionId]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900">
        <Navbar />
        <BackNavigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="p-12 bg-gray-800 border-gray-700 text-center max-w-md">
            <Loader className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Processing Your Payment...
            </h2>
            <p className="text-gray-400">
              Please wait while we confirm your payment
            </p>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900">
        <Navbar />
        <BackNavigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="p-12 bg-gray-800 border-gray-700 text-center max-w-md">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-4xl">✕</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Payment Issue
            </h2>
            <p className="text-gray-400 mb-6">
              We couldn't confirm your payment. Please check your email or try again.
            </p>
            <Button
              onClick={() => navigate('/support')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Try Again
            </Button>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Success
  const isPro = paymentInfo?.metadata?.payment_type === 'pro_subscription';
  const isTip = paymentInfo?.metadata?.payment_type?.includes('tip');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900">
      <Navbar />
      <BackNavigation />
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <Card className="p-12 bg-gray-800 border-gray-700 text-center max-w-md">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />

          <h1 className="text-3xl font-bold text-white mb-2">
            {isPro ? '🎉 Welcome to Pro!' : '❤️ Thank You!'}
          </h1>

          {isPro ? (
            <div>
              <p className="text-xl text-gray-300 mb-6">
                Your GamerGrid Pro subscription is now active!
              </p>

              <div className="bg-purple-900/30 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Crown className="w-6 h-6 text-yellow-400" />
                  <span className="text-white font-semibold">Pro Benefits Unlocked</span>
                </div>
                <ul className="text-left text-gray-300 space-y-2 text-sm">
                  <li>✅ Ad-free experience</li>
                  <li>✅ Unlimited watchlist</li>
                  <li>✅ Early access to new content</li>
                  <li>✅ Custom lists</li>
                  <li>✅ Download trailers</li>
                  <li>✅ Priority support</li>
                </ul>
              </div>

              <p className="text-gray-400 text-sm mb-6">
                Amount: ${(paymentInfo.amount_total / 100).toFixed(2)}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xl text-gray-300 mb-4">
                Your support means the world to us!
              </p>
              <p className="text-gray-400 mb-6">
                Your generous tip of{' '}
                <span className="text-purple-400 font-bold">
                  ${(paymentInfo.amount_total / 100).toFixed(2)}
                </span>{' '}
                helps us keep GamerGrid free and amazing for everyone. 💜
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={() => navigate('/')}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Back to Home
            </Button>
            {isPro && (
              <Button
                onClick={() => navigate('/settings')}
                className="flex-1 bg-gray-700 hover:bg-gray-600"
              >
                <Crown className="w-4 h-4 mr-2" />
                View Settings
              </Button>
            )}
          </div>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentSuccessPage;
