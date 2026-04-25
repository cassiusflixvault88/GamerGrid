import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Lock, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const token = params.get('token');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast({ title: 'Invalid reset link', variant: 'destructive' });
      navigate('/');
    }
  }, [token, navigate, toast]);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (pw !== pw2) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: pw });
      setDone(true);
    } catch (err) {
      toast({
        title: 'Reset failed',
        description: err.response?.data?.detail || 'Link may have expired',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-purple-900/10 flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm" data-testid="reset-password-page">
        {done ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Password updated ✅</h1>
            <p className="text-white/60 text-sm mb-6">You can now log in with your new password.</p>
            <Button
              onClick={() => navigate('/')}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              data-testid="reset-back-home"
            >
              Back to home
            </Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-white/60 hover:text-white text-sm flex items-center gap-1 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Lock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Choose a new password</h1>
                <p className="text-white/50 text-sm">Min 6 characters</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <Label htmlFor="new-pw" className="text-white/80">New password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="bg-white/5 border-white/20 text-white mt-1"
                  data-testid="reset-pw-1"
                  autoFocus
                  required
                />
              </div>
              <div>
                <Label htmlFor="new-pw2" className="text-white/80">Confirm new password</Label>
                <Input
                  id="new-pw2"
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className="bg-white/5 border-white/20 text-white mt-1"
                  data-testid="reset-pw-2"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !pw || !pw2}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              data-testid="reset-submit"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
