import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DebugAdmin = () => {
  const { user, loading } = useAuth();
  const [adminStatus, setAdminStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/check`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdminStatus(response.data);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAdminStatus({ error: error.response?.data?.detail || 'Failed to check status' });
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkStatus();
    }
  }, [user]);

  if (loading) {
    return <div className="min-h-screen bg-black text-white p-8">Loading...</div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-black text-white p-8">Please log in first</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-purple-400">Admin Debug Info</h1>
        
        <div className="bg-gray-900 rounded-lg p-6 mb-4 space-y-3">
          <h2 className="text-xl font-semibold mb-4">User Info:</h2>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>User ID:</strong> {user.id}</p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 mb-4">
          <h2 className="text-xl font-semibold mb-4">Admin Status:</h2>
          {checkingStatus ? (
            <p>Checking...</p>
          ) : adminStatus?.error ? (
            <p className="text-red-400">{adminStatus.error}</p>
          ) : (
            <div className="space-y-2">
              <p>
                <strong>Is Admin:</strong>{' '}
                <span className={adminStatus?.is_admin ? 'text-green-400' : 'text-red-400'}>
                  {adminStatus?.is_admin ? 'YES ✅' : 'NO ❌'}
                </span>
              </p>
              {adminStatus?.permissions?.length > 0 && (
                <div>
                  <strong>Permissions:</strong>
                  <ul className="ml-4 mt-2">
                    {adminStatus.permissions.map((perm, i) => (
                      <li key={i}>• {perm}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <button
            onClick={checkStatus}
            className="mt-4 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
          >
            Refresh Status
          </button>
        </div>

        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Expected Email:</h2>
          <p className="text-sm">
            To be auto-promoted, you must log in with:<br />
            <code className="bg-black px-2 py-1 rounded text-green-400">cassius@gamergrid.com</code>
          </p>
          <p className="text-sm mt-2 text-gray-400">
            (Case doesn't matter - Cassius@GamerGrid.com works too)
          </p>
        </div>
      </div>
    </div>
  );
};

export default DebugAdmin;
