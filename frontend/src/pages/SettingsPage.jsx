import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Monitor, Save, User as UserIcon } from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';
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
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    display_name: '',
    phone: '',
    address: '',
    profile_picture_url: '',
    autoplay_trailers: true,
    email_notifications: true,
    maturity_rating: 'PG-13'
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
      return;
    }

    if (user) {
      // Load user profile data
      fetchUserProfile();
    }
  }, [user, loading, navigate]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setProfileData({
          display_name: response.data.display_name || '',
          phone: response.data.phone || '',
          address: response.data.address || '',
          profile_picture_url: response.data.profile_picture_url || '',
          autoplay_trailers: response.data.autoplay_trailers ?? true,
          email_notifications: response.data.email_notifications ?? true,
          maturity_rating: response.data.maturity_rating || 'PG-13'
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/user/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refetch to confirm the save
      await fetchUserProfile();
      
      toast({
        title: 'Settings Saved',
        description: 'Your profile has been updated successfully.'
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const themeOptions = [
    { value: 'light', icon: Sun, label: 'Light' },
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
    <div className="min-h-screen bg-black dark:bg-gray-950">
      <Navbar />
      
      <main className="pt-24 pb-12 px-6 lg:px-12 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-white/60">Manage your account and preferences</p>
        </div>

        {/* Theme Selection */}
        <div className="bg-white/5 dark:bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Appearance
          </h2>
          <p className="text-white/60 text-sm mb-4">Choose how FlixVault looks to you</p>
          
          <div className="grid grid-cols-3 gap-4">
            {themeOptions.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  theme === value
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <Icon className={`w-6 h-6 ${theme === value ? 'text-purple-400' : 'text-white/70'}`} />
                <span className={`text-sm ${theme === value ? 'text-purple-300 font-medium' : 'text-white/70'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-white/5 dark:bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/10">
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
              <Label htmlFor="username" className="text-white/80">Username</Label>
              <Input
                id="username"
                type="text"
                value={user?.username || ''}
                disabled
                className="bg-white/5 border-white/20 text-white/50 cursor-not-allowed"
              />
            </div>

            <div>
              <Label htmlFor="display_name" className="text-white/80">Display Name</Label>
              <Input
                id="display_name"
                type="text"
                value={profileData.display_name}
                onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                placeholder="How should we call you?"
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
              <Label htmlFor="profile_picture" className="text-white/80">Profile Picture URL</Label>
              <Input
                id="profile_picture"
                type="url"
                value={profileData.profile_picture_url}
                onChange={(e) => setProfileData({ ...profileData, profile_picture_url: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
          </div>
        </div>

        {/* App Preferences */}
        <div className="bg-white/5 dark:bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Preferences</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white/80">Autoplay Trailers</Label>
                <p className="text-xs text-white/50">Automatically play trailers when browsing</p>
              </div>
              <button
                onClick={() => setProfileData({ ...profileData, autoplay_trailers: !profileData.autoplay_trailers })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  profileData.autoplay_trailers ? 'bg-purple-600' : 'bg-white/20'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  profileData.autoplay_trailers ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <Separator className="bg-white/10" />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white/80">Email Notifications</Label>
                <p className="text-xs text-white/50">Receive updates about new content</p>
              </div>
              <button
                onClick={() => setProfileData({ ...profileData, email_notifications: !profileData.email_notifications })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  profileData.email_notifications ? 'bg-purple-600' : 'bg-white/20'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  profileData.email_notifications ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <Separator className="bg-white/10" />

            <div>
              <Label htmlFor="maturity" className="text-white/80">Content Maturity Rating</Label>
              <select
                id="maturity"
                value={profileData.maturity_rating}
                onChange={(e) => setProfileData({ ...profileData, maturity_rating: e.target.value })}
                className="w-full mt-2 bg-white/10 border border-white/20 text-white rounded-md px-3 py-2"
              >
                <option value="G">G - All Ages</option>
                <option value="PG">PG - Parental Guidance</option>
                <option value="PG-13">PG-13 - Ages 13+</option>
                <option value="R">R - Restricted</option>
                <option value="NC-17">NC-17 - Adults Only</option>
              </select>
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
