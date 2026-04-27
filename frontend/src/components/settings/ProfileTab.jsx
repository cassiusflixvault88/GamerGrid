import React, { useState } from 'react';
import axios from 'axios';
import { User as UserIcon, Save } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRESET_AVATARS = [
  { url: '/gamergrid-icon.svg', label: 'GamerGrid' },
  { url: '/playstation-icon.svg', label: 'PlayStation' },
  { url: '/xbox-icon.svg', label: 'Xbox' },
  { url: '/switch-icon.svg', label: 'Nintendo Switch' },
  { url: '/pc-steam-icon.svg', label: 'PC / Steam' },
];

const ProfileTab = ({ profileData, setProfileData }) => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const saveProfile = async (overrideData = null) => {
    const data = overrideData || profileData;
    const token = localStorage.getItem('token');
    if (!token) return;
    await axios.put(`${API}/user/profile`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await refreshUser();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfile();
      toast({ title: 'Settings Saved', description: 'Your profile has been updated.' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err.response?.data?.detail || 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/user/upload-profile-picture`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      const updated = { ...profileData, profile_picture_url: response.data.url };
      setProfileData(updated);
      await saveProfile(updated);
      toast({ title: 'Success', description: 'Profile picture uploaded and saved!' });
    } catch (err) {
      toast({
        title: 'Upload Failed',
        description: err.response?.data?.detail || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const setPresetAvatar = async (logoUrl) => {
    const updated = { ...profileData, profile_picture_url: logoUrl };
    setProfileData(updated);
    try {
      await saveProfile(updated);
      toast({ title: 'Profile picture set' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/10">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <UserIcon className="w-5 h-5" />
        Profile Information
      </h2>

      <div className="space-y-4">
        <div>
          <Label className="text-white/80">Email</Label>
          <Input
            type="email"
            value={user?.email || ''}
            disabled
            className="bg-white/5 border-white/20 text-white/50 cursor-not-allowed"
          />
          <p className="text-xs text-white/40 mt-1">Use the Security tab to change your email</p>
        </div>

        <div>
          <Label className="text-white/80">Username (Display Name)</Label>
          <Input
            type="text"
            value={profileData.username}
            onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
            placeholder="Your display name"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
          />
        </div>

        <div>
          <Label className="text-white/80">Full Name (Optional)</Label>
          <Input
            type="text"
            value={profileData.display_name}
            onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
            placeholder="Your full name"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
          />
        </div>

        <div>
          <Label className="text-white/80">Phone Number</Label>
          <Input
            type="tel"
            value={profileData.phone}
            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
          />
        </div>

        <div>
          <Label className="text-white/80">Address</Label>
          <Input
            type="text"
            value={profileData.address}
            onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
            placeholder="Your location (optional)"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
          />
        </div>

        <div>
          <Label className="text-white/80 mb-2 block">Profile Picture</Label>
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
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 items-end flex-wrap mt-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-white/60 text-xs mb-1 block">Or paste a custom image URL</Label>
              <Input
                type="url"
                value={profileData.profile_picture_url || ''}
                onChange={(e) =>
                  setProfileData({ ...profileData, profile_picture_url: e.target.value })
                }
                placeholder="https://example.com/avatar.jpg"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
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

          {profileData.profile_picture_url && (
            <div className="mt-4">
              <p className="text-xs text-white/50 mb-2">Preview:</p>
              <img
                src={profileData.profile_picture_url}
                alt="Profile preview"
                className="w-20 h-20 rounded-full object-cover border-2 border-purple-500 bg-white/10"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-6"
        data-testid="save-profile-btn"
      >
        <Save className="w-5 h-5 mr-2" />
        {saving ? 'Saving...' : 'Save Profile'}
      </Button>
    </div>
  );
};

export default ProfileTab;
