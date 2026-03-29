import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Star, Film, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/');
      return;
    }

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

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [statsRes, reviewsRes, usersRes, submissionsRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard`, { headers }),
        axios.get(`${API}/admin/reviews`, { headers }),
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/submissions`, { headers }),
      ]);

      setStats(statsRes.data);
      setReviews(reviewsRes.data.reviews);
      setUsers(usersRes.data.users);
      setSubmissions(submissionsRes.data.submissions);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReplyToReview = async (reviewId) => {
    if (!replyText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/admin/reply-to-review`,
        { review_id: reviewId, reply_text: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({
        title: 'Reply posted!',
        description: 'Your reply has been added to the review',
      });

      setReplyingTo(null);
      setReplyText('');
      loadDashboardData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post reply',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/delete-review/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({
        title: 'Review deleted',
        description: 'The review has been removed',
      });

      loadDashboardData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete review',
        variant: 'destructive',
      });
    }
  };

  const handleApproveMovie = async (submissionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/admin/approve-movie/${submissionId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({
        title: 'Movie approved!',
        description: 'The movie has been added to FlixVault',
      });

      loadDashboardData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve movie',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-24 px-6 lg:px-12 max-w-[1920px] mx-auto pb-20">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-8 h-8 text-yellow-400" />
            <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <p className="text-white/70 text-lg">
            Welcome back, {stats?.admin_name} - {stats?.role}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-white">{stats?.total_users || 0}</p>
              </div>
              <Users className="w-12 h-12 text-blue-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total Ratings</p>
                <p className="text-3xl font-bold text-white">{stats?.total_ratings || 0}</p>
              </div>
              <Star className="w-12 h-12 text-yellow-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total Reviews</p>
                <p className="text-3xl font-bold text-white">{stats?.total_reviews || 0}</p>
              </div>
              <MessageSquare className="w-12 h-12 text-green-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Pending Submissions</p>
                <p className="text-3xl font-bold text-white">{stats?.pending_submissions || 0}</p>
              </div>
              <Film className="w-12 h-12 text-purple-400" />
            </div>
          </Card>
        </div>

        {/* Reviews Management */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Manage Reviews</h2>
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="bg-white/5 border-white/10 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-white font-semibold">{review.username}</p>
                    <p className="text-white/70 text-sm">
                      Content ID: {review.content_id} | Rating: {review.rating}/5 ⭐
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setReplyingTo(review.id)}
                      size="sm"
                      className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    >
                      Reply
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

                {review.review && (
                  <p className="text-white/90 mb-4">{review.review}</p>
                )}

                {replyingTo === review.id && (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your reply as CEO..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleReplyToReview(review.id)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black"
                      >
                        Post Reply
                      </Button>
                      <Button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyText('');
                        }}
                        variant="outline"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Movie Submissions */}
        {submissions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Pending Movie Submissions</h2>
            <div className="space-y-4">
              {submissions.map((submission) => (
                <Card key={submission.id} className="bg-white/5 border-white/10 p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-bold text-xl">{submission.title}</h3>
                      <p className="text-white/70">{submission.overview}</p>
                      <p className="text-white/50 text-sm mt-2">
                        Submitted by: {submission.submitted_by_username}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleApproveMovie(submission.id)}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button variant="destructive">
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
