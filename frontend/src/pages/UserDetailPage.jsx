import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, User, Mail, Calendar, Star, Heart, Film, MessageSquare, Shield, ShieldOff, Send, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UserDetailPage = () => {
  const { userId } = useParams();
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgSeverity, setMsgSeverity] = useState('info');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }
    loadUserDetails();
    // eslint-disable-next-line
  }, [userId, currentUser]);

  const loadUserDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/user-details/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserDetails(response.data);
    } catch (error) {
      console.error('Failed to load user details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user details',
        variant: 'destructive',
      });
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAction = async (action) => {
    if (!window.confirm(`Are you sure you want to ${action} this user ${action === 'promote' ? 'to' : 'from'} admin?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/admin/manage-admin`,
        { user_id: userId, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({
        title: 'Success',
        description: `User ${action === 'promote' ? 'promoted to' : 'removed from'} admin successfully`,
      });

      // Reload user details
      loadUserDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update admin status',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!msgSubject.trim() || !msgBody.trim()) {
      toast({ title: 'Subject and body are required', variant: 'destructive' });
      return;
    }
    setSendingMsg(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/admin/send-message`,
        { user_id: userId, subject: msgSubject.trim(), body: msgBody.trim(), severity: msgSeverity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: 'Message sent ✅',
        description: `Delivered to ${userDetails?.user?.username}. They'll see it in their Settings inbox.`,
      });
      setMessageOpen(false);
      setMsgSubject('');
      setMsgBody('');
      setMsgSeverity('info');
    } catch (e) {
      toast({
        title: 'Send failed',
        description: e.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSendingMsg(false);
    }
  };

  const handleDeleteUser = async () => {
    const confirmText = `Permanently delete ${userDetails?.user?.username}? This removes their account, reviews, library, and all data. This cannot be undone.`;
    if (!window.confirm(confirmText)) return;
    setDeletingUser(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/delete-user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: 'User deleted', description: 'Account and all related data removed.' });
      navigate('/admin');
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: e.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    } finally {
      setDeletingUser(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-20 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userDetails) {
    return null;
  }

  const { user, stats, recent_reviews, recent_content_requests, recent_feedback } = userDetails;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <BackNavigation />

      <div className="container mx-auto px-4 pb-20 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">{user.username}</h1>
                  {user.is_admin && (
                    <span className="px-3 py-1 bg-yellow-600/20 text-yellow-300 border border-yellow-500/30 rounded-full text-sm font-semibold">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-gray-400 flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </p>
                <p className="text-gray-400 flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4" />
                  Joined {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Admin Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setMessageOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="message-user-btn"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
              {user.is_admin ? (
                <Button
                  onClick={() => handleAdminAction('demote')}
                  disabled={actionLoading || user.id === currentUser.id}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="demote-admin-btn"
                >
                  <ShieldOff className="w-4 h-4 mr-2" />
                  {user.id === currentUser.id ? 'Cannot Demote Self' : 'Remove Admin'}
                </Button>
              ) : (
                <Button
                  onClick={() => handleAdminAction('promote')}
                  disabled={actionLoading}
                  className="bg-yellow-600 hover:bg-yellow-700"
                  data-testid="promote-admin-btn"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Promote to Admin
                </Button>
              )}
              {user.id !== currentUser.id && (
                <Button
                  onClick={handleDeleteUser}
                  disabled={deletingUser}
                  variant="outline"
                  className="bg-red-900/30 border-red-500/40 text-red-300 hover:bg-red-900/50"
                  data-testid="delete-user-btn"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deletingUser ? 'Deleting…' : 'Delete User'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <Heart className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-white/60 text-xs">Watchlist</p>
                <p className="text-2xl font-bold text-white">{stats.watchlist_items}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-white/60 text-xs">Reviews</p>
                <p className="text-2xl font-bold text-white">{stats.reviews_count}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-white/60 text-xs">App Reviews</p>
                <p className="text-2xl font-bold text-white">{stats.app_reviews_count}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <Film className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-white/60 text-xs">Requests</p>
                <p className="text-2xl font-bold text-white">{stats.content_requests_count}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-white/60 text-xs">Feedback</p>
                <p className="text-2xl font-bold text-white">{stats.feedback_count}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Content Requests */}
          <Card className="bg-white/5 border-white/10 p-6">
            <h2 className="text-xl font-bold mb-4">Recent Content Requests</h2>
            {recent_content_requests.length === 0 ? (
              <p className="text-gray-400">No requests submitted</p>
            ) : (
              <div className="space-y-3">
                {recent_content_requests.map((req) => (
                  <div key={req.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="font-semibold text-white">{req.title}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {req.content_type} • {req.status}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Feedback */}
          <Card className="bg-white/5 border-white/10 p-6">
            <h2 className="text-xl font-bold mb-4">Recent Feedback</h2>
            {recent_feedback.length === 0 ? (
              <p className="text-gray-400">No feedback submitted</p>
            ) : (
              <div className="space-y-3">
                {recent_feedback.map((fb) => (
                  <div key={fb.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="font-semibold text-white">{fb.title}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {fb.feedback_type} • {fb.status} • {fb.priority} priority
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* User Profile Data */}
        {(user.display_name || user.phone || user.address) && (
          <Card className="bg-white/5 border-white/10 p-6 mt-6">
            <h2 className="text-xl font-bold mb-4">Profile Information</h2>
            <div className="space-y-2 text-gray-300">
              {user.display_name && <p><span className="text-white/60">Full Name:</span> {user.display_name}</p>}
              {user.phone && <p><span className="text-white/60">Phone:</span> {user.phone}</p>}
              {user.address && <p><span className="text-white/60">Address:</span> {user.address}</p>}
            </div>
          </Card>
        )}
      </div>

      {/* Send Message Dialog */}
      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto p-4 sm:p-6" data-testid="send-message-dialog">
          <DialogHeader>
            <DialogTitle className="text-white pr-8 break-words">
              Send message to {userDetails?.user?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-white/80 text-sm">Severity</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {[
                  { v: 'info', label: 'Info', cls: 'bg-blue-600' },
                  { v: 'warning', label: 'Warning', cls: 'bg-yellow-600' },
                  { v: 'violation', label: 'Violation', cls: 'bg-red-600' },
                ].map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setMsgSeverity(opt.v)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      msgSeverity === opt.v ? `${opt.cls} text-white` : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                    data-testid={`severity-${opt.v}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="msg-subject" className="text-white/80 text-sm">Subject</Label>
              <Input
                id="msg-subject"
                value={msgSubject}
                onChange={(e) => setMsgSubject(e.target.value)}
                placeholder="e.g. Reminder about review guidelines"
                className="bg-white/5 border-white/20 text-white"
                data-testid="msg-subject"
              />
            </div>
            <div>
              <Label htmlFor="msg-body" className="text-white/80 text-sm">Message</Label>
              <Textarea
                id="msg-body"
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                placeholder="Write your message…"
                rows={6}
                className="bg-white/5 border-white/20 text-white resize-none"
                data-testid="msg-body"
              />
              <p className="text-white/40 text-xs mt-1">
                {userDetails?.user?.email
                  ? `Will also email ${userDetails.user.email} (if Resend is configured).`
                  : 'In-app delivery only.'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setMessageOpen(false)}
              className="text-white/70 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={sendingMsg || !msgSubject.trim() || !msgBody.trim()}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="msg-send-btn"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendingMsg ? 'Sending…' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default UserDetailPage;
