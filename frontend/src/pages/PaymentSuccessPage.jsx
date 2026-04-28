import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Crown, Loader } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackNavigation from '../components/BackNavigation';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MAX_ATTEMPTS = 8;

const formatAmount = (totalCents) => {
  if (totalCents == null || isNaN(Number(totalCents))) return '—';
  return `$${(Number(totalCents) / 100).toFixed(2)}`;
};

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking'); // checking | success | error
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const attemptsRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    if (!sessionId) {
      setStatus('error');
      setErrorMsg('Missing session ID — your payment may still have gone through. Check your email.');
      return () => {};
    }

    const poll = async () => {
      if (cancelledRef.current) return;
      attemptsRef.current += 1;
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API}/payments/checkout/status/${sessionId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = res?.data || {};
        if (data.payment_status === 'paid') {
          setPaymentInfo(data);
          setStatus('success');
          return;
        }
        if (data.status === 'expired') {
          setStatus('error');
          setErrorMsg('Checkout session expired. Please try again.');
          return;
        }
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setStatus('error');
          setErrorMsg("We couldn't confirm your payment in time. If you were charged, it'll show up shortly — check your email.");
          return;
        }
        setTimeout(poll, 2000);
      } catch (err) {
        console.error('Payment status check failed:', err);
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setStatus('error');
          setErrorMsg(err?.response?.data?.detail || err?.message || 'Network error while confirming payment.');
        } else {
          setTimeout(poll, 2000);
        }
      }
    };
    poll();
    return () => { cancelledRef.current = true; };
  }, [sessionId]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900">
        <Navbar />
        <BackNavigation />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <Card data-testid="payment-checking" className="p-12 bg-gray-800 border-gray-700 text-center max-w-md">
            <Loader className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-white mb-2">Processing your payment…</h2>
            <p className="text-gray-400">Hang tight — we're confirming with Stripe.</p>
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
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <Card data-testid="payment-error" className="p-12 bg-gray-800 border-gray-700 text-center max-w-md">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-4xl">!</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Status Unknown</h2>
            <p className="text-gray-400 mb-6">{errorMsg || "We couldn't confirm your payment. Please check your email."}</p>
            <div className="flex gap-3 justify-center">
              <Button data-testid="payment-error-home" onClick={() => navigate('/')} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                Go Home
              </Button>
              <Button data-testid="payment-error-retry" onClick={() => navigate('/support')} variant="outline" className="border-gray-600">
                Try Again
              </Button>
            </div>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // success
  const meta = paymentInfo?.metadata || {};
  const isPro = meta.payment_type === 'pro_subscription';
  const amount = formatAmount(paymentInfo?.amount_total);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900">
      <Navbar />
      <BackNavigation />
      <div className="flex items-center justify-center min-h-[80vh] px-4 py-8">
        <Card data-testid="payment-success" className="p-10 bg-gray-800 border-gray-700 text-center max-w-md w-full">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-2">
            {isPro ? '🎉 Welcome to Pro!' : '❤️ Thank You!'}
          </h1>

          {isPro ? (
            <>
              <p className="text-xl text-gray-300 mb-6">Your GamerGrid Pro subscription is now active.</p>
              <div className="bg-purple-900/30 rounded-lg p-6 mb-6 text-left">
                <div className="flex items-center gap-2 mb-3 justify-center">
                  <Crown className="w-6 h-6 text-yellow-400" />
                  <span className="text-white font-semibold">Pro benefits unlocked</span>
                </div>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>✅ Ad-free experience</li>
                  <li>✅ Unlimited library</li>
                  <li>✅ Early access to new games</li>
                  <li>✅ Custom lists & priority support</li>
                </ul>
              </div>
              <p className="text-gray-400 text-sm mb-6">Charged: <span className="text-white font-semibold">{amount}</span></p>
            </>
          ) : (
            <>
              <p className="text-xl text-gray-300 mb-3">Your support means the world to us!</p>
              <p className="text-gray-400 mb-6">
                Tip received: <span className="text-purple-300 font-bold">{amount}</span> 💜
              </p>
            </>
          )}

          <div className="flex gap-3">
            <Button
              data-testid="payment-success-home"
              onClick={() => navigate('/')}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Back to Home
            </Button>
            {isPro && (
              <Button
                data-testid="payment-success-settings"
                onClick={() => navigate('/settings')}
                className="flex-1 bg-gray-700 hover:bg-gray-600"
              >
                <Crown className="w-4 h-4 mr-2" /> Settings
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
