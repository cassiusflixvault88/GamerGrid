import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Monitor, Save, User as UserIcon, Home, ArrowLeft, Crown, Sparkles, CreditCard, Bookmark, Trash2, Play, Inbox, AlertCircle, MessageCircle } from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { Separator } from '../components/ui/separator';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SettingsPage = () => {
  const { user, loading, refreshUser } = useAuth();  // Get refreshUser function
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savedTrailers, setSavedTrailers] = useState([]);
  const [inboxMessages, setInboxMessages] = useState([]);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [profileData, setProfileData] = useState({
    username: '',
    display_name: '',
    phone: '',
    address: '',
    profile_picture_url: '',
    autoplay_trailers: true,
    email_notifications: true
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
      return;
    }

    if (user) {
      // Load user profile data
      fetchUserProfile();
      loadSavedTrailers();
      loadInbox();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, navigate]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setProfileData({
          username: user?.username || '',
          display_name: response.data.display_name || '',
          phone: response.data.phone || '',
          address: response.data.address || '',
          profile_picture_url: response.data.profile_picture_url || '',
          autoplay_trailers: response.data.autoplay_trailers ?? true,
          email_notifications: response.data.email_notifications ?? true
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleUpgradeToPro = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/payments/subscription/checkout`,
        { origin_url: window.location.origin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast({
        title: 'Could not start checkout',
        description: error.response?.data?.detail || 'Try again in a moment',
        variant: 'destructive',
      });
    }
  };

  const loadSavedTrailers = async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`${API}/saved-trailers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedTrailers(r.data.trailers || []);
    } catch { /* silent */ }
  };

  const loadInbox = async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`${API}/messages/inbox`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInboxMessages(r.data.messages || []);
    } catch { /* silent */ }
  };

  const removeSavedTrailer = async (trailerId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/saved-trailers/${trailerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedTrailers(prev => prev.filter(t => t.id !== trailerId));
      toast({ title: 'Removed from your library' });
    } catch (e) {
      toast({
        title: 'Could not remove',
        description: e.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    }
  };

  const markMessageRead = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/messages/${messageId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInboxMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));
    } catch { /* silent */ }
  };

  const sendReply = async (messageId) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/messages/${messageId}/reply`, { text: replyText.trim() }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: 'Reply sent ✅', description: 'The admin will see it in their inbox.' });
      setReplyingToId(null);
      setReplyText('');
    } catch (e) {
      toast({
        title: 'Reply failed',
        description: e.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image must be less than 5MB',
        variant: 'destructive'
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please upload an image file',
        variant: 'destructive'
      });
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: 'Session Expired',
          description: 'Please log in again to upload photos.',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }
      
      console.log('📤 Uploading image to:', `${API}/user/upload-profile-picture`);
      
      const response = await axios.post(`${API}/user/upload-profile-picture`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('✅ Upload response:', response.data);
      const imageUrl = response.data.url;
      console.log('📸 Image URL:', imageUrl);

      // Update profile data with new image URL
      const updatedProfile = { ...profileData, profile_picture_url: imageUrl };
      setProfileData(updatedProfile);
      
      // AUTO-SAVE after upload so user doesn't have to click Save Settings
      console.log('💾 Auto-saving profile with new image...');
      await saveProfileWithNewPicture(updatedProfile);
      
      toast({
        title: 'Success',
        description: 'Profile picture uploaded and saved!'
      });
    } catch (error) {
      console.error('Upload error:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive'
        });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => navigate('/'), 2000);
      } else {
        toast({
          title: 'Upload Failed',
          description: error.response?.data?.detail || 'Failed to upload image',
          variant: 'destructive'
        });
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const PRESET_AVATARS = [
    { url: '/gamergrid-icon.svg', label: 'GamerGrid' },
    { url: '/playstation-icon.svg', label: 'PlayStation' },
    { url: '/xbox-icon.svg', label: 'Xbox' },
    { url: '/switch-icon.svg', label: 'Nintendo Switch' },
    { url: '/pc-steam-icon.svg', label: 'PC / Steam' },
  ];

  const setPresetAvatar = async (logoUrl) => {
    const updatedData = { ...profileData, profile_picture_url: logoUrl };
    setProfileData(updatedData);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ title: 'Error', description: 'Please log in to change your profile picture', variant: 'destructive' });
        return;
      }
      await axios.put(`${API}/user/profile`, updatedData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshUser();
      toast({ title: 'Profile picture set', description: 'Your new avatar has been saved!' });
    } catch (error) {
      console.error('Failed to set preset avatar:', error);
      toast({ title: 'Error', description: 'Failed to update profile picture', variant: 'destructive' });
    }
  };

  const useGamerGridLogo = () => setPresetAvatar('/gamergrid-icon.svg');

  // Helper function to save profile and refresh navbar
  const saveProfileWithNewPicture = async (updatedData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      console.log('💾 Saving profile with new picture:', updatedData.profile_picture_url);
      
      await axios.put(`${API}/user/profile`, updatedData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Profile saved successfully');
      
      // Refresh user context to update navbar immediately
      console.log('🔄 Refreshing user data...');
      await refreshUser();
      
      // Force a small delay to ensure state updates propagate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ User data refreshed, navbar should update now');
    } catch (error) {
      console.error('❌ Failed to auto-save:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: 'Session Expired',
          description: 'Please log in again to save your settings.',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }
      
      const response = await axios.put(`${API}/user/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Profile saved:', response.data);
      
      toast({
        title: 'Settings Saved',
        description: 'Your profile has been updated successfully.'
      });
      
      // Refresh user data in AuthContext to update Navbar immediately
      await refreshUser();
      
      // Force reload profile after save to confirm changes
      await new Promise(resolve => setTimeout(resolve, 800));
      await fetchUserProfile();
      
    } catch (error) {
      console.error('Failed to save profile:', error);
      
      // Handle authentication errors specifically
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive'
        });
        // Clear invalid token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => navigate('/'), 2000);
      } else {
        toast({
          title: 'Error',
          description: error.response?.data?.detail || 'Failed to save settings. Please try again.',
          variant: 'destructive'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const themeOptions = [
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-20 flex items-center justify-center">
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <BackNavigation />
      
      <main className="px-6 lg:px-12 max-w-4xl mx-auto pb-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
            <p className="text-white/60">Manage your account and preferences</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/20"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        </div>

        {/* Theme Section - Dark Only */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Moon className="w-5 h-5" />
            Appearance
          </h2>
          <p className="text-white/60 text-sm mb-4">GamerGrid is optimized for dark mode</p>
          
          <div className="flex items-center space-x-3 p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="p-3 bg-purple-600 rounded-lg">
              <Moon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">Dark Mode</p>
              <p className="text-white/60 text-sm">Perfect for gaming</p>
            </div>
            <div className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm font-medium">
              Active
            </div>
          </div>
        </div>

        {/* GamerGrid Pro Subscription */}
        {(user?.is_pro || user?.is_admin) ? (
          <div className="bg-gradient-to-br from-yellow-500/15 via-yellow-400/5 to-transparent border border-yellow-500/40 rounded-lg p-6 mb-6" data-testid="pro-active-card">
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
                  <p className="text-white/60 text-sm">{user?.is_admin ? 'CEO / Admin · all Pro perks unlocked' : 'Thanks for supporting GamerGrid!'}</p>
                </div>
              </div>
              {!user?.is_admin && (
                <Button
                  variant="outline"
                  className="bg-white/5 border-white/20 text-white/80 hover:bg-white/10"
                  data-testid="manage-subscription-btn"
                  onClick={() => toast({
                    title: 'Manage subscription',
                    description: 'Email cassiusflixvault@gmail.com to cancel or update your subscription.',
                  })}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage
                </Button>
              )}
            </div>
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-white/80">
              <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> 100% ad-free</li>
              <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> Save trailers to your library</li>
              <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> Early access to new features</li>
              <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /> Priority support</li>
            </ul>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-yellow-500/10 via-purple-500/5 to-transparent border border-yellow-500/30 rounded-lg p-6 mb-6" data-testid="pro-upgrade-card">
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
              className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
              data-testid="upgrade-pro-btn"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro — $4.99/mo
            </Button>
          </div>
        )}

        {/* Inbox / Admin Messages */}
        {inboxMessages.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/10" data-testid="inbox-section">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Inbox className="w-5 h-5 text-blue-400" />
              Inbox
              {inboxMessages.some(m => !m.read) && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {inboxMessages.filter(m => !m.read).length}
                </span>
              )}
            </h2>
            <div className="space-y-3">
              {inboxMessages.map(m => {
                const sevColor = m.severity === 'violation' ? 'border-red-500/50 bg-red-500/5'
                  : m.severity === 'warning' ? 'border-yellow-500/50 bg-yellow-500/5'
                  : 'border-blue-500/50 bg-blue-500/5';
                const sevIcon = m.severity === 'violation' ? <AlertCircle className="w-4 h-4 text-red-400" />
                  : m.severity === 'warning' ? <AlertCircle className="w-4 h-4 text-yellow-400" />
                  : <Inbox className="w-4 h-4 text-blue-400" />;
                const replying = replyingToId === m.id;
                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded-lg border ${sevColor} ${!m.read ? 'ring-1 ring-white/20' : 'opacity-90'} cursor-pointer transition-all hover:bg-white/5`}
                    onClick={() => !m.read && markMessageRead(m.id)}
                    data-testid={`inbox-message-${m.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {sevIcon}
                      <span className="text-white font-semibold text-sm">{m.subject}</span>
                      {!m.read && <span className="ml-auto text-xs px-2 py-0.5 bg-red-500 text-white rounded">NEW</span>}
                    </div>
                    <p className="text-white/80 text-sm whitespace-pre-wrap">{m.body}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-white/40 text-xs">
                        From {m.from_admin_username} · {new Date(m.sent_at).toLocaleString()}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyingToId(replying ? null : m.id);
                          setReplyText('');
                        }}
                        className="text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center gap-1"
                        data-testid={`reply-msg-${m.id}`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {replying ? 'Cancel' : 'Reply'}
                      </button>
                    </div>
                    {replying && (
                      <div className="mt-3 pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write your reply…"
                          rows={3}
                          className="w-full bg-black/40 border border-white/20 rounded-lg p-2 text-white text-sm resize-none focus:outline-none focus:border-blue-500"
                          data-testid={`reply-text-${m.id}`}
                          maxLength={2000}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => { setReplyingToId(null); setReplyText(''); }}
                            className="px-3 py-1.5 text-white/60 hover:text-white text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => sendReply(m.id)}
                            disabled={!replyText.trim() || sendingReply}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded"
                            data-testid={`reply-send-${m.id}`}
                          >
                            {sendingReply ? 'Sending…' : 'Send Reply'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Saved Trailers Library */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/10" data-testid="saved-trailers-section">
          <h2 className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-purple-400" />
            Saved Trailers
            <span className="text-white/50 text-sm font-normal ml-2">{savedTrailers.length}</span>
          </h2>
          <p className="text-white/60 text-sm mb-4">Trailers you've saved from any game.</p>
          {savedTrailers.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
              <Bookmark className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-sm">No saved trailers yet</p>
              <p className="text-white/30 text-xs mt-1">
                Open any game trailer and tap the purple <span className="text-purple-400 font-semibold">Save Trailer</span> button.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedTrailers.map(t => (
                <div
                  key={t.id}
                  className="group relative bg-black/40 rounded-lg overflow-hidden border border-white/10 hover:border-purple-500/50 transition-colors"
                  data-testid={`saved-trailer-${t.id}`}
                >
                  <a
                    href={`https://www.youtube.com/watch?v=${t.youtube_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-video bg-gradient-to-br from-purple-900/30 to-black relative"
                  >
                    {t.thumbnail && (
                      <img
                        src={t.thumbnail}
                        alt={t.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                  </a>
                  <div className="p-3">
                    <p className="text-white text-sm font-medium line-clamp-2" title={t.title}>{t.title}</p>
                    {t.game_title && (
                      <p className="text-white/50 text-xs mt-1 truncate">{t.game_title}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-white/30 text-xs">
                        {new Date(t.saved_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => removeSavedTrailer(t.id)}
                        className="text-white/40 hover:text-red-400 transition-colors p-1"
                        title="Remove"
                        data-testid={`remove-trailer-${t.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile Information */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Profile Information
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white/80">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-white/5 border-white/20 text-white/50 cursor-not-allowed"
              />
              <p className="text-xs text-white/40 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <Label htmlFor="username" className="text-white/80">Username (Display Name)</Label>
              <Input
                id="username"
                type="text"
                value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                placeholder="Your display name"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
              <p className="text-xs text-white/50 mt-1">This is how others will see you</p>
            </div>

            <div>
              <Label htmlFor="display_name" className="text-white/80">Full Name (Optional)</Label>
              <Input
                id="display_name"
                type="text"
                value={profileData.display_name}
                onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                placeholder="Your full name"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-white/80">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-white/80">Address</Label>
              <Input
                id="address"
                type="text"
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                placeholder="Your location (optional)"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>

            <div>
              <Label htmlFor="profile_picture" className="text-white/80 mb-2 block">Profile Picture</Label>

              {/* Preset avatars grid */}
              <div className="mb-3">
                <p className="text-xs text-white/50 mb-2">Quick pick a gaming avatar:</p>
                <div className="grid grid-cols-5 gap-2" data-testid="preset-avatars-grid">
                  {PRESET_AVATARS.map((p) => {
                    const selected = profileData.profile_picture_url === p.url;
                    return (
                      <button
                        type="button"
                        key={p.url}
                        onClick={() => setPresetAvatar(p.url)}
                        data-testid={`preset-avatar-${p.url.replace(/[^a-z0-9]/gi, '-')}`}
                        title={p.label}
                        className={`relative aspect-square rounded-lg p-2 transition-all border-2 ${
                          selected
                            ? 'border-purple-500 bg-purple-500/20 scale-105'
                            : 'border-white/15 bg-white/5 hover:border-white/40 hover:bg-white/10'
                        }`}
                      >
                        <img src={p.url} alt={p.label} className="w-full h-full object-contain" />
                        <span className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-white/60 truncate">
                          {p.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 items-end flex-wrap mt-8">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="profile_picture" className="text-white/60 text-xs mb-1 block">Or paste a custom image URL</Label>
                  <Input
                    id="profile_picture"
                    type="url"
                    value={profileData.profile_picture_url || ''}
                    onChange={(e) => setProfileData({ ...profileData, profile_picture_url: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                      data-testid="upload-avatar-input"
                    />
                    <span className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md text-sm font-medium border border-white/20 transition-colors">
                      <UserIcon className="w-4 h-4 mr-2" />
                      {uploadingImage ? 'Uploading…' : 'Upload Image'}
                    </span>
                  </label>
                </div>
              </div>

              {profileData.profile_picture_url && (
                <div className="mt-4">
                  <p className="text-xs text-white/50 mb-2">Preview:</p>
                  <img
                    src={profileData.profile_picture_url}
                    alt="Profile preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-purple-500 bg-white/10"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSaveProfile}
          disabled={saving}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-6"
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </main>

      <Footer />
    </div>
  );
};

export default SettingsPage;
