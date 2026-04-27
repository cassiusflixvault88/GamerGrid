import React, { useState } from 'react';
import axios from 'axios';
import { Mail, Lock, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SecurityTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.includes('@') || !emailPassword) {
      toast({ title: 'Email and password required', variant: 'destructive' });
      return;
    }
    setSavingEmail(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/account/change-email`,
        { new_email: newEmail.trim().toLowerCase(), current_password: emailPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Email updated ✅', description: `Log in with ${newEmail} from now on.` });
      setNewEmail('');
      setEmailPassword('');
    } catch (err) {
      toast({
        title: 'Could not change email',
        description: err.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw.length < 6) {
      toast({ title: 'New password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (newPw !== newPw2) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSavingPw(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/account/change-password`,
        { current_password: currentPw, new_password: newPw },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Password updated ✅' });
      setCurrentPw('');
      setNewPw('');
      setNewPw2('');
    } catch (err) {
      toast({
        title: 'Could not change password',
        description: err.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/10" data-testid="account-security-section">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-yellow-400" />
        Account & Security
      </h2>

      <div className="bg-black/30 border border-white/10 rounded-lg p-4 mb-4">
        <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Current email</p>
        <p className="text-white font-mono text-sm">{user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form onSubmit={handleChangeEmail} className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-400" />
            Change Email
          </h3>
          <div className="space-y-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@email.com"
              className="w-full bg-black/40 border border-white/20 rounded p-2 text-white text-sm"
              data-testid="new-email-input"
            />
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              placeholder="Confirm with current password"
              className="w-full bg-black/40 border border-white/20 rounded p-2 text-white text-sm"
              data-testid="email-password-input"
            />
            <Button
              type="submit"
              disabled={savingEmail || !newEmail || !emailPassword}
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
              data-testid="save-email-btn"
            >
              {savingEmail ? 'Saving…' : 'Update Email'}
            </Button>
          </div>
        </form>

        <form onSubmit={handleChangePassword} className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            Change Password
          </h3>
          <div className="space-y-2">
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Current password"
              className="w-full bg-black/40 border border-white/20 rounded p-2 text-white text-sm"
              data-testid="current-pw-input"
            />
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full bg-black/40 border border-white/20 rounded p-2 text-white text-sm"
              data-testid="new-pw-input"
            />
            <input
              type="password"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-black/40 border border-white/20 rounded p-2 text-white text-sm"
              data-testid="confirm-pw-input"
            />
            <Button
              type="submit"
              disabled={savingPw || !currentPw || !newPw || !newPw2}
              size="sm"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm"
              data-testid="save-pw-btn"
            >
              {savingPw ? 'Saving…' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SecurityTab;
