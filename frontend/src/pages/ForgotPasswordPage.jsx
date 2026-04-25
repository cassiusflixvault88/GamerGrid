import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.includes('@')) {
      toast({ title: 'Enter a valid email', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSubmitted(true);
    } catch (err) {
      toast({
        title: 'Could not send email',
        description: err.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-purple-900/10 flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm" data-testid="forgot-password-page">
        <button
          onClick={() => navigate('/')}
          className="text-white/60 hover:text-white text-sm flex items-center gap-1 mb-6"
          data-testid="forgot-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
            <p className="text-white/60 text-sm">
              If an account exists with <span className="text-white">{email}</span>, we sent a password-reset link.
            </p>
            <p className="text-white/40 text-xs mt-4">
              The link expires in 1 hour. Don't see it? Check spam or{' '}
              <button
                onClick={() => setSubmitted(false)}
                className="text-yellow-400 underline"
              >
                try a different email
              </button>.
            </p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Mail className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Forgot password</h1>
                <p className="text-white/50 text-sm">We'll email you a reset link</p>
              </div>
            </div>

            <div className="mb-4">
              <Label htmlFor="forgot-email" className="text-white/80">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-white/5 border-white/20 text-white mt-1"
                data-testid="forgot-email"
                autoFocus
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              data-testid="forgot-submit"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Send reset link
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
