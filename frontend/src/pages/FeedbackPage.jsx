import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Bug, Lightbulb, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FeedbackPage = () => {
  const [title, setTitle] = useState('');
  const [feedbackType, setFeedbackType] = useState('bug');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [myFeedback, setMyFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadMyFeedback();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line
  }, [user]);

  const loadMyFeedback = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/feedback/my-feedback`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyFeedback(response.data.feedback);
    } catch (error) {
      console.error('Failed to load feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to submit feedback',
        variant: 'destructive',
      });
      return;
    }

    if (!title.trim() || !description.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/feedback/submit`,
        { title, feedback_type: feedbackType, description, priority },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({
        title: 'Feedback submitted!',
        description: 'Thank you for helping us improve GamerGrid.',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setFeedbackType('bug');
      setPriority('medium');
      
      // Reload feedback with a small delay to ensure DB write completes
      setTimeout(() => {
        loadMyFeedback();
      }, 500);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to submit feedback',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'bug':
        return <Bug className="w-5 h-5 text-red-400" />;
      case 'feature':
        return <Lightbulb className="w-5 h-5 text-yellow-400" />;
      case 'improvement':
        return <AlertCircle className="w-5 h-5 text-blue-400" />;
      default:
        return <MessageSquare className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
      case 'in_progress':
        return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
      case 'resolved':
        return 'bg-green-600/20 text-green-300 border-green-500/30';
      case 'wont_fix':
        return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
      default:
        return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
    }
  };

  const getPriorityColor = (pri) => {
    switch (pri) {
      case 'critical':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      <Navbar />
      <BackNavigation />

      <div className="container mx-auto px-4 pb-20 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Feedback & <span className="text-purple-500">Bug Reports</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Help us make GamerGrid better! Report bugs or suggest new features.
          </p>
        </div>

        {/* Feedback Form */}
        <Card className="bg-white/5 border-white/10 p-6 mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-400" />
            Submit Feedback
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Type</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFeedbackType('bug')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    feedbackType === 'bug'
                      ? 'border-red-500 bg-red-500/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Bug className={`w-6 h-6 ${feedbackType === 'bug' ? 'text-red-400' : 'text-white/70'}`} />
                  <span className={`text-sm ${feedbackType === 'bug' ? 'text-red-300 font-medium' : 'text-white/70'}`}>
                    Bug Report
                  </span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFeedbackType('feature')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    feedbackType === 'feature'
                      ? 'border-yellow-500 bg-yellow-500/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Lightbulb className={`w-6 h-6 ${feedbackType === 'feature' ? 'text-yellow-400' : 'text-white/70'}`} />
                  <span className={`text-sm ${feedbackType === 'feature' ? 'text-yellow-300 font-medium' : 'text-white/70'}`}>
                    Feature Request
                  </span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFeedbackType('improvement')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    feedbackType === 'improvement'
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <AlertCircle className={`w-6 h-6 ${feedbackType === 'improvement' ? 'text-blue-400' : 'text-white/70'}`} />
                  <span className={`text-sm ${feedbackType === 'improvement' ? 'text-blue-300 font-medium' : 'text-white/70'}`}>
                    Improvement
                  </span>
                </button>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-2">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-md px-3 py-2"
              >
                <option value="low">Low - Minor issue</option>
                <option value="medium">Medium - Moderate issue</option>
                <option value="high">High - Important issue</option>
                <option value="critical">Critical - App breaking</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                Title *
              </label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue or suggestion"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                Description *
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide as much detail as possible..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[120px]"
                rows={5}
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting || !title.trim() || !description.trim() || !user}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-6"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              {submitting ? 'Submitting...' : user ? 'Submit Feedback' : 'Sign in to Submit'}
            </Button>
          </form>
        </Card>

        {/* My Feedback */}
        {user && (
          <div>
            <h2 className="text-2xl font-bold mb-6">My Feedback</h2>
            
            {loading ? (
              <p className="text-center text-gray-400">Loading...</p>
            ) : myFeedback.length === 0 ? (
              <Card className="bg-white/5 border-white/10 p-8 text-center">
                <p className="text-gray-400">You haven't submitted any feedback yet.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {myFeedback.map((item) => (
                  <Card key={item.id} className="bg-white/5 border-white/10 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getTypeIcon(item.feedback_type)}
                          <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                            {item.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={`text-sm font-medium ${getPriorityColor(item.priority)}`}>
                            {item.priority.toUpperCase()} Priority
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          Submitted: {new Date(item.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-300 mb-4">{item.description}</p>

                    {item.admin_response && (
                      <div className="mt-4 p-4 bg-purple-900/20 border-l-4 border-purple-500 rounded">
                        <p className="text-purple-300 font-semibold text-sm mb-1">Admin Response:</p>
                        <p className="text-white">{item.admin_response}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default FeedbackPage;
