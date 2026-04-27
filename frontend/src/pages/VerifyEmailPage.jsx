import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VerifyEmailPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'ok' | 'fail'
  const [errorMsg, setErrorMsg] = useState('');
  const token = params.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('fail');
      setErrorMsg('No verification token found in the link.');
      return;
    }
    axios.get(`${API}/auth/verify-email?token=${token}`)
      .then(() => setStatus('ok'))
      .catch((err) => {
        setStatus('fail');
        setErrorMsg(err.response?.data?.detail || 'Verification failed');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-purple-900/10">
      <Navbar />
      <BackNavigation />
      <div className="flex items-center justify-center px-6 pt-4 pb-16 min-h-[80vh]">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm text-center" data-testid="verify-email-page">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-white mb-2">Verifying your email…</h1>
            <p className="text-white/60 text-sm">Just a moment.</p>
          </>
        )}
        {status === 'ok' && (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Email verified! 🎉</h1>
            <p className="text-white/60 text-sm mb-6">Your GamerGrid account is now active.</p>
            <Button
              onClick={() => navigate('/')}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              data-testid="verify-continue-btn"
            >
              Start gaming →
            </Button>
          </>
        )}
        {status === 'fail' && (
          <>
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Verification failed</h1>
            <p className="text-white/60 text-sm mb-6">{errorMsg}</p>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="bg-white/10 border-white/20 text-white"
            >
              Back to home
            </Button>
          </>
        )}
      </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
