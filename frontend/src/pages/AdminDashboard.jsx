import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Star, MessageSquare, Home, TrendingUp } from 'lucide-react';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [appReviews, setAppReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [statsRes, reviewsRes, usersRes, appReviewsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/reviews`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/app-reviews`)
      ]);

      setStats(statsRes.data);
      setReviews(reviewsRes.data);
      setUsers(usersRes.data);
      setAppReviews(appReviewsRes.data.reviews || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    if (!user) {
      navigate('/');
      return;
    }

    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/admin/check`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.is_admin) {
          setIsAdmin(true);
          loadDashboardData();
        } else {
          toast({
            title: 'Access Denied',
            description: 'You do not have admin privileges',
            variant: 'destructive',
          });
          navigate('/');
        }
      } catch (error) {
        console.error('Admin check failed:', error);
        navigate('/');
      }
    };

    checkAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const handleDeleteReview = async (reviewId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/delete-review/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setReviews(reviews.filter(r => r.id !== reviewId));
      toast({
        title: 'Success',
        description: 'Review deleted successfully'
      });
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete review',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/delete-user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUsers(users.filter(u => u.id !== userId));
      toast({
        title: 'Success',
        description: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleReplyToReview = async (reviewId) => {
    if (!replyText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/admin/reply-to-review`, 
        { review_id: reviewId, reply_text: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: 'Success',
        description: 'Reply posted successfully'
      });
      
      setReplyingTo(null);
      setReplyText('');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to post reply',
        variant: 'destructive',
      });
    }
  };

  const handleReplyToAppReview = async (reviewId) => {
    if (!replyText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/admin/reply-to-app-review`, 
        { review_id: reviewId, reply_text: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: 'Success',
        description: 'Reply posted successfully'
      });
      
      setReplyingTo(null);
      setReplyText('');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to post reply',
        variant: 'destructive',
      });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-20 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <BackNavigation />
      
      <div className="pb-12 px-6 lg:px-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Shield className="w-8 h-8 text-yellow-400" />
              <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <p className="text-white/70 text-lg">
              Welcome back, {user?.username} - CEO & Founder
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/20"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-8 border-b border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Users ({stats?.total_users || 0})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Content Reviews ({stats?.total_reviews || 0})
          </button>
          <button
            onClick={() => setActiveTab('app-reviews')}
            className={`px-6 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'app-reviews'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4 inline mr-2" />
            App Reviews ({appReviews.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-500/30 p-6">
                  <div className="flex items-center space-x-4">
                    <Users className="w-10 h-10 text-purple-400" />
                    <div>
                      <p className="text-white/60 text-sm">Total Users</p>
                      <p className="text-3xl font-bold text-white">{stats?.total_users || 0}</p>
                    </div>
                  </div>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border-yellow-500/30 p-6">
                  <div className="flex items-center space-x-4">
                    <Star className="w-10 h-10 text-yellow-400" />
                    <div>
                      <p className="text-white/60 text-sm">Total Reviews</p>
                      <p className="text-3xl font-bold text-white">{stats?.total_reviews || 0}</p>
                    </div>
                  </div>
                </Card>

                <Card className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/30 p-6">
                  <div className="flex items-center space-x-4">
                    <MessageSquare className="w-10 h-10 text-green-400" />
                    <div>
                      <p className="text-white/60 text-sm">Avg Rating</p>
                      <p className="text-3xl font-bold text-white">
                        {stats?.average_rating ? stats.average_rating.toFixed(1) : '0.0'}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30 p-6">
                  <div className="flex items-center space-x-4">
                    <TrendingUp className="w-10 h-10 text-blue-400" />
                    <div>
                      <p className="text-white/60 text-sm">Platform Status</p>
                      <p className="text-xl font-bold text-green-400">Active</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Quick Info */}
              <Card className="bg-white/5 border-white/10 p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Platform Overview</h2>
                <div className="space-y-3 text-white/80">
                  <p>✅ All systems operational</p>
                  <p>📊 {stats?.total_users || 0} registered users</p>
                  <p>⭐ {stats?.total_reviews || 0} reviews from community</p>
                  <p>🎬 Content powered by TMDB API</p>
                </div>
              </Card>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">All Users</h2>
                <p className="text-white/60">{users.length} total users</p>
              </div>
              
              <Card className="bg-white/5 border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="px-6 py-4 text-left text-white font-semibold">Username</th>
                        <th className="px-6 py-4 text-left text-white font-semibold">Email</th>
                        <th className="px-6 py-4 text-left text-white font-semibold">Joined</th>
                        <th className="px-6 py-4 text-left text-white font-semibold">Watchlist</th>
                        <th className="px-6 py-4 text-left text-white font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-white/50">
                            No users found. Share FlixVault to get your first users!
                          </td>
                        </tr>
                      ) : (
                        users.map((u, idx) => (
                          <tr key={u.id || idx} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4">
                              <button
                                onClick={() => navigate(`/admin/user/${u.id}`)}
                                className="text-white font-medium hover:text-purple-400 transition-colors text-left"
                              >
                                {u.username}
                              </button>
                              {u.is_admin && (
                                <span className="text-xs text-yellow-400 ml-2">• Admin</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-white/80 text-sm">{u.email}</td>
                            <td className="px-6 py-4 text-white/60 text-sm">
                              {new Date(u.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm">
                                {u.watchlist?.length || 0} items
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(`${u.is_admin ? 'Remove admin from' : 'Promote to admin'} ${u.username}?`)) return;
                                    try {
                                      const token = localStorage.getItem('token');
                                      await axios.post(`${API}/admin/manage-admin`, {
                                        user_id: u.id,
                                        action: u.is_admin ? 'demote' : 'promote'
                                      }, {
                                        headers: { Authorization: `Bearer ${token}` }
                                      });
                                      toast({
                                        title: 'Success',
                                        description: `${u.username} ${u.is_admin ? 'removed from' : 'promoted to'} admin`
                                      });
                                      loadDashboardData();
                                    } catch (error) {
                                      toast({
                                        title: 'Error',
                                        description: error.response?.data?.detail || 'Failed',
                                        variant: 'destructive'
                                      });
                                    }
                                  }}
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    u.is_admin 
                                      ? 'bg-red-600/20 text-red-300 hover:bg-red-600/30'
                                      : 'bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/30'
                                  }`}
                                  disabled={user?.user_id === u.id}
                                >
                                  {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                                </button>
                                
                                <Button
                                  onClick={() => handleDeleteUser(u.id)}
                                  variant="destructive"
                                  size="sm"
                                  disabled={u.is_admin}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {u.is_admin ? 'Protected' : 'Delete'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* REVIEWS TAB */}
          {activeTab === 'reviews' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Manage Reviews (Updated)</h2>
                <p className="text-white/60">{reviews.length} total reviews</p>
              </div>

              {reviews.length === 0 ? (
                <Card className="bg-white/5 border-white/10 p-12 text-center">
                  <MessageSquare className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <p className="text-white/50">No reviews yet. Encourage users to rate content!</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id} className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="text-white font-semibold text-lg">{review.username}</p>
                            <span className="px-2 py-1 bg-yellow-600/20 text-yellow-300 rounded text-sm">
                              ⭐ {review.rating}/5
                            </span>
                          </div>
                          <p className="text-purple-400 text-sm mb-1 font-medium">
                            🎬 {review.content_title || `Content ID: ${review.content_id}`}
                          </p>
                          <p className="text-white/90 mt-3">{review.comment}</p>
                          <p className="text-white/40 text-xs mt-2">
                            {new Date(review.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button
                            onClick={() => setReplyingTo(review.id === replyingTo ? null : review.id)}
                            size="sm"
                            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                          >
                            {replyingTo === review.id ? 'Cancel' : 'Reply'}
                          </Button>
                          <Button
                            onClick={() => handleDeleteReview(review.id)}
                            size="sm"
                            variant="destructive"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      {replyingTo === review.id && (
                        <div className="mt-4 p-4 bg-black/50 rounded-lg border border-yellow-500/20">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write your reply as admin..."
                            className="bg-white/5 border-white/20 text-white mb-3"
                            rows={3}
                            style={{ 
                              touchAction: 'auto',
                              WebkitUserSelect: 'text',
                              userSelect: 'text'
                            }}
                            onFocus={(e) => {
                              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText('');
                              }}
                              size="sm"
                              variant="outline"
                              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleReplyToReview(review.id)}
                              size="sm"
                              className="bg-yellow-500 hover:bg-yellow-600 text-black"
                              disabled={!replyText.trim()}
                            >
                              Post Reply
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* APP REVIEWS TAB */}
          {activeTab === 'app-reviews' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Manage App Reviews</h2>
                <p className="text-white/60">{appReviews.length} total app reviews</p>
              </div>

              {appReviews.length === 0 ? (
                <Card className="bg-white/5 border-white/10 p-12 text-center">
                  <Star className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <p className="text-white/50">No app reviews yet</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {appReviews.map((review) => (
                    <Card key={review.id} className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="text-white font-semibold text-lg">{review.username}</p>
                            <span className="px-2 py-1 bg-yellow-600/20 text-yellow-300 rounded text-sm">
                              ⭐ {review.rating}/5
                            </span>
                          </div>
                          <p className="text-white/90 mt-3">{review.review}</p>
                          <p className="text-white/40 text-xs mt-2">
                            {new Date(review.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button
                            onClick={() => setReplyingTo(review.id === replyingTo ? null : review.id)}
                            size="sm"
                            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                          >
                            {replyingTo === review.id ? 'Cancel' : 'Reply'}
                          </Button>
                        </div>
                      </div>

                      {replyingTo === review.id && (
                        <div className="mt-4 p-4 bg-black/50 rounded-lg border border-yellow-500/20">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write your reply as admin..."
                            className="bg-white/5 border-white/20 text-white mb-3"
                            rows={3}
                            style={{ 
                              touchAction: 'auto',
                              WebkitUserSelect: 'text',
                              userSelect: 'text'
                            }}
                            onFocus={(e) => {
                              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText('');
                              }}
                              size="sm"
                              variant="outline"
                              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleReplyToAppReview(review.id)}
                              size="sm"
                              className="bg-yellow-500 hover:bg-yellow-600 text-black"
                              disabled={!replyText.trim()}
                            >
                              Post Reply
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Display existing admin replies */}
                      {review.admin_replies && review.admin_replies.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {review.admin_replies.map((reply) => (
                            <div key={reply.id} className="p-4 bg-yellow-900/20 border-l-4 border-yellow-500 rounded">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded">
                                  👑 ADMIN
                                </span>
                                <span className="text-yellow-400 font-semibold text-sm">{reply.admin_username}</span>
                              </div>
                              <p className="text-white/90">{reply.reply_text}</p>
                              <p className="text-white/40 text-xs mt-2">
                                {new Date(reply.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
