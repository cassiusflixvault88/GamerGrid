import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Crown, Loader } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackNavigation from '../components/BackNavigation';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MAX_ATTEMPTS = 8;

const formatAmount = (totalCents) => {
  if (totalCents == null || isNaN(Number(totalCents))) return '—';
  return `$${(Number(totalCents) / 100).toFixed(2)}`;
};

// Celebratory chime (two-note bell) using Web Audio API — no asset file.
const playCelebrationChime = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    // C6 → E6 → G6 (major triad arpeggio)
    [
      { freq: 1046.5, start: 0.0, dur: 0.35 },
      { freq: 1318.5, start: 0.16, dur: 0.35 },
      { freq: 1568.0, start: 0.32, dur: 0.55 },
    ].forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.3, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });
    setTimeout(() => ctx.close && ctx.close(), 1500);
  } catch {
    // Autoplay may block until first gesture — silently ignore.
  }
};

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking'); // checking | success | error
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const sessionId = searchParams.get('session_id');
  const attemptsRef = useRef(0);
  const cancelledRef = useRef(false);
  const celebratedRef = useRef(false);

  // Fire the celebration exactly once, when payment confirms.
  useEffect(() => {
    if (status !== 'success' || !paymentInfo || celebratedRef.current) return;
    celebratedRef.current = true;
    const meta = paymentInfo?.metadata || {};
    const isPro = meta.payment_type === 'pro_subscription';
    const amt = formatAmount(paymentInfo?.amount_total);

    // 1) Chime
    playCelebrationChime();

    // 2) Toast
    toast({
      title: isPro ? '🎉 Welcome to GamerGrid Pro!' : '💜 Thanks for tipping!',
      description: isPro
        ? `You're now Pro — ad-free, unlimited library, early access. Enjoy!`
        : `Your ${amt} tip just made Cassius smile. You're awesome.`,
      duration: 6000,
    });

    // 3) Browser notification (if user previously granted permission for the app)
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(isPro ? '🎉 Pro activated!' : '💜 Tip received!', {
          body: isPro ? 'Enjoy your ad-free GamerGrid experience.' : `Thanks for your ${amt} tip!`,
          icon: '/gamergrid-icon.svg',
        });
      }
    } catch { /* ignore */ }

    // 4) Emoji confetti burst (2.5s)
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 2500);
    return () => clearTimeout(t);
  }, [status, paymentInfo, toast]);

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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 relative overflow-hidden">
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 z-50" data-testid="payment-confetti">
          {Array.from({ length: 36 }).map((_, i) => {
            const emoji = ['🎉', '💜', '✨', '🎊', '⭐', '🎮'][i % 6];
            const left = Math.random() * 100;
            const delay = Math.random() * 0.6;
            const dur = 1.8 + Math.random() * 1.2;
            const drift = (Math.random() - 0.5) * 200;
            const size = 18 + Math.floor(Math.random() * 18);
            return (
              <span
                key={i}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  top: '-40px',
                  fontSize: `${size}px`,
                  animation: `gg-confetti-fall ${dur}s ease-in ${delay}s forwards`,
                  ['--drift']: `${drift}px`,
                }}
              >
                {emoji}
              </span>
            );
          })}
          <style>{`
            @keyframes gg-confetti-fall {
              0%   { transform: translate(0, 0) rotate(0deg); opacity: 0; }
              10%  { opacity: 1; }
              100% { transform: translate(var(--drift), 100vh) rotate(720deg); opacity: 0.2; }
            }
          `}</style>
        </div>
      )}
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
