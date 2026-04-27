import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PromoteCEO = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [promoting, setPromoting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handlePromote = async () => {
    setPromoting(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/admin/promote-ceo`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to promote. Make sure you\'re using Cassius@GamerGrid.com');
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black">
      <Navbar />
      <BackNavigation />
      <div className="flex items-center justify-center p-6 min-h-[80vh]">
      <div className="max-w-md w-full bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-2xl border border-purple-500/30 p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mb-4">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            CEO Promotion
          </h1>
          <p className="text-white/70 text-sm">
            Click below to activate your admin privileges
          </p>
        </div>

        {!result && !error && (
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-white/80 text-sm mb-2">
                <strong>Logged in as:</strong> {user?.username}
              </p>
              <p className="text-white/80 text-sm">
                <strong>Email:</strong> {user?.email}
              </p>
            </div>

            <Button
              onClick={handlePromote}
              disabled={promoting}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-6 text-lg"
            >
              {promoting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Promoting...
                </>
              ) : (
                <>
                  <Crown className="w-5 h-5 mr-2" />
                  Promote Me to CEO
                </>
              )}
            </Button>

            <p className="text-white/50 text-xs text-center">
              This only works if you're signed in with Cassius@GamerGrid.com
            </p>
          </div>
        )}

        {result && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle className="w-8 h-8" />
              <div>
                <h3 className="font-bold text-lg">Success!</h3>
                <p className="text-sm">{result.message}</p>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <p className="text-white/90 text-sm">
                <strong>Role:</strong> {result.role}
              </p>
              <p className="text-white/90 text-sm">
                <strong>Permissions:</strong>
              </p>
              <ul className="text-white/70 text-xs space-y-1 ml-4">
                {result.permissions?.map((perm, i) => (
                  <li key={i}>• {perm}</li>
                ))}
              </ul>
            </div>

            <Button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
            >
              Go to Homepage & See Admin Panel
            </Button>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <XCircle className="w-8 h-8" />
              <div>
                <h3 className="font-bold text-lg">Error</h3>
                <p className="text-sm">{error}</p>
              </div>
            </div>

            <Button
              onClick={() => setError(null)}
              variant="outline"
              className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default PromoteCEO;
