import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Persistent visible error so users can SEE what went wrong and screenshot it.
  // We keep both the toast AND this banner — toasts vanish too fast on mobile.
  const [errorBanner, setErrorBanner] = useState(null);

  const { login, signup } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorBanner(null);

    try {
      if (isLogin) {
        await login(email, password);
        toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
      } else {
        await signup(email, username, password);
        toast({
          title: 'Account created! Check your email 📬',
          description: 'We sent a verification link. Verify your email to fully activate your account.',
        });
      }
      onClose();
      resetForm();
    } catch (error) {
      // Build the most useful error message we can. We surface BOTH a friendly
      // message AND the raw HTTP status so it's debuggable from a screenshot.
      const status = error.response?.status;
      const detail = error.response?.data?.detail;

      let description = 'Something went wrong. Please try again.';
      let isNetwork = false;

      if (typeof detail === 'string') {
        description = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        description = detail
          .map((d) => {
            const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : '';
            return field ? `${field}: ${d.msg}` : d.msg;
          })
          .join(' · ');
      } else if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) {
        isNetwork = true;
        description = "Can't reach our server right now. Check your internet, or try refreshing this page.";
      } else if (error.message) {
        description = error.message;
      }

      // Log to console so we can ask the user to screenshot the dev console too.
      console.error('[AuthModal] error', { status, detail, message: error.message, error });

      const title = isLogin ? 'Sign-in failed' : 'Sign-up failed';
      setErrorBanner({ title, description, status, isNetwork });
      toast({ title, description, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    onClose();
    window.location.href = '/forgot-password';
  };

  const resetForm = () => {
    setEmail('');
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setErrorBanner(null);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-black/95 border border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">{isLogin ? 'Sign In' : 'Sign Up'}</DialogTitle>
        <DialogDescription className="sr-only">
          {isLogin ? 'Sign in to your GamerGrid account' : 'Create a GamerGrid account to save your library and rate games'}
        </DialogDescription>
        <div className="p-8 max-h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </h2>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorBanner && (
              <div
                role="alert"
                data-testid="auth-error-banner"
                className="rounded-lg border border-red-500/40 bg-red-900/30 p-3 text-sm"
              >
                <p className="text-red-200 font-bold">
                  ⚠️ {errorBanner.title}
                  {errorBanner.status ? <span className="ml-2 text-red-300/80 font-mono text-xs">HTTP {errorBanner.status}</span> : null}
                </p>
                <p className="text-white/90 mt-1">{errorBanner.description}</p>
                {errorBanner.isNetwork && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-200 underline"
                    data-testid="auth-error-reload-btn"
                  >
                    🔄 Refresh & try again
                  </button>
                )}
                <p className="text-white/40 text-[10px] mt-2">
                  Stuck? Take a screenshot of this and message Cassius from his profile page.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-white/90">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="your@email.com"
              />
            </div>

            {!isLogin && (
              <div>
                <Label htmlFor="username" className="text-white/90">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="Your display name"
                />
              </div>
            )}

            <div>
              <Label htmlFor="password" className="text-white/90">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10"
                  placeholder="Enter your password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-6 rounded-md"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </Button>

            {isLogin && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-white/50 hover:text-yellow-400 text-sm transition-colors"
                  data-testid="forgot-password-link"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/70">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={toggleMode}
                className="text-purple-400 hover:text-purple-300 font-semibold"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
