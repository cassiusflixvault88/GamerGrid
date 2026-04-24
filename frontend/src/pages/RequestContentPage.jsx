import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Film, Tv, FileText, Send, Clock, CheckCircle, XCircle } from 'lucide-react';
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

const RequestContentPage = () => {
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('movie');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to request content',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }
    loadMyRequests();
    // eslint-disable-next-line
  }, [user]);

  const loadMyRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/content-requests/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyRequests(response.data.requests);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter the title of the content',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/content-requests/submit`,
        { title, content_type: contentType, description, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({
        title: 'Request submitted!',
        description: 'We\'ll review your request and get back to you soon.',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setReason('');
      
      // Reload requests
      loadMyRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
      case 'approved':
        return 'bg-green-600/20 text-green-300 border-green-500/30';
      case 'rejected':
        return 'bg-red-600/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
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
            Request <span className="text-purple-500">Content</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Can't find what you're looking for? Let us know what you'd like to watch!
          </p>
        </div>

        {/* Request Form */}
        <Card className="bg-white/5 border-white/10 p-6 mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Send className="w-6 h-6 text-purple-400" />
            Submit a Request
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Content Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Content Type</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setContentType('movie')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    contentType === 'movie'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Film className={`w-6 h-6 ${contentType === 'movie' ? 'text-purple-400' : 'text-white/70'}`} />
                  <span className={`text-sm ${contentType === 'movie' ? 'text-purple-300 font-medium' : 'text-white/70'}`}>
                    Movie
                  </span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setContentType('series')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    contentType === 'series'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Tv className={`w-6 h-6 ${contentType === 'series' ? 'text-purple-400' : 'text-white/70'}`} />
                  <span className={`text-sm ${contentType === 'series' ? 'text-purple-300 font-medium' : 'text-white/70'}`}>
                    TV Series
                  </span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setContentType('documentary')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    contentType === 'documentary'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <FileText className={`w-6 h-6 ${contentType === 'documentary' ? 'text-purple-400' : 'text-white/70'}`} />
                  <span className={`text-sm ${contentType === 'documentary' ? 'text-purple-300 font-medium' : 'text-white/70'}`}>
                    Documentary
                  </span>
                </button>
              </div>
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
                placeholder="e.g., Making a Murderer, The Last Dance"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                Description (Optional)
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the content..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[80px]"
                rows={3}
              />
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-2">
                Why do you want this? (Optional)
              </label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tell us why you'd like to see this on GamerGrid..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[80px]"
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting || !title.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-6"
            >
              <Send className="w-5 h-5 mr-2" />
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </Card>

        {/* My Requests */}
        <div>
          <h2 className="text-2xl font-bold mb-6">My Requests</h2>
          
          {loading ? (
            <p className="text-center text-gray-400">Loading your requests...</p>
          ) : myRequests.length === 0 ? (
            <Card className="bg-white/5 border-white/10 p-8 text-center">
              <p className="text-gray-400">You haven't submitted any requests yet.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {myRequests.map((request) => (
                <Card key={request.id} className="bg-white/5 border-white/10 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{request.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">
                        Type: {request.content_type.charAt(0).toUpperCase() + request.content_type.slice(1)}
                      </p>
                      <p className="text-sm text-gray-400">
                        Submitted: {new Date(request.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    {getStatusIcon(request.status)}
                  </div>

                  {request.description && (
                    <p className="text-gray-300 mb-2">
                      <span className="font-medium">Description:</span> {request.description}
                    </p>
                  )}

                  {request.reason && (
                    <p className="text-gray-300 mb-2">
                      <span className="font-medium">Reason:</span> {request.reason}
                    </p>
                  )}

                  {request.admin_response && (
                    <div className="mt-4 p-4 bg-purple-900/20 border-l-4 border-purple-500 rounded">
                      <p className="text-purple-300 font-semibold text-sm mb-1">Admin Response:</p>
                      <p className="text-white">{request.admin_response}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RequestContentPage;
