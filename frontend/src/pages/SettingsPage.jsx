import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Home, User as UserIcon, Shield, Crown, Inbox, Bell } from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import ProfileTab from '../components/settings/ProfileTab';
import SecurityTab from '../components/settings/SecurityTab';
import SubscriptionTab from '../components/settings/SubscriptionTab';
import MessagesTab from '../components/settings/MessagesTab';
import NotificationsTab from '../components/settings/NotificationsTab';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'subscription', label: 'Pro', icon: Crown },
  { id: 'messages', label: 'Inbox', icon: Inbox },
  { id: 'notifications', label: 'Theme', icon: Bell },
];

const SettingsPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Profile data is owned by the shell so refreshes survive tab switching
  const [profileData, setProfileData] = useState({
    username: '',
    display_name: '',
    phone: '',
    address: '',
    profile_picture_url: '',
    autoplay_trailers: true,
    email_notifications: true,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
      return;
    }
    if (user) {
      (async () => {
        try {
          const token = localStorage.getItem('token');
          const r = await axios.get(`${API}/user/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (r.data) {
            setProfileData({
              username: user?.username || '',
              display_name: r.data.display_name || '',
              phone: r.data.phone || '',
              address: r.data.address || '',
              profile_picture_url: r.data.profile_picture_url || '',
              autoplay_trailers: r.data.autoplay_trailers ?? true,
              email_notifications: r.data.email_notifications ?? true,
            });
          }
        } catch { /* silent */ }
      })();
    }
  }, [user, loading, navigate]);

  const switchTab = (id) => {
    setActiveTab(id);
    setSearchParams({ tab: id }, { replace: true });
  };

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
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
            <p className="text-white/60">Manage your account and preferences</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/20"
            data-testid="settings-home-btn"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 mb-6 sticky top-16 z-10 bg-black/60 backdrop-blur-md py-2 -mx-2 px-2 rounded-lg" data-testid="settings-tabs">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  active
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
                data-testid={`settings-tab-${t.id}`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'profile' && (
          <ProfileTab profileData={profileData} setProfileData={setProfileData} />
        )}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'subscription' && <SubscriptionTab />}
        {activeTab === 'messages' && <MessagesTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
      </main>

      <Footer />
    </div>
  );
};

export default SettingsPage;
