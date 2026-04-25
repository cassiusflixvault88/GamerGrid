import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import ShareButton from '../components/ShareButton';
import AdSlot from '../components/AdSlot';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Star = ({ filled }) => (
  <svg className={`w-4 h-4 inline ${filled ? 'text-yellow-400' : 'text-white/20'}`} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.368-2.447a1 1 0 00-1.175 0l-3.368 2.447c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.363-1.118L2.06 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
  </svg>
);

const renderStars = (rating) => {
  const rounded = Math.round(rating || 0);
  return [1, 2, 3, 4, 5].map((n) => <Star key={n} filled={n <= rounded} />);
};

const PublicProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API}/users/${encodeURIComponent(username)}`);
        if (active) setProfile(res.data);
      } catch (e) {
        if (active) setError(e.response?.status === 404 ? 'User not found' : 'Failed to load profile');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [username]);

  const copyShareUrl = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url);
    toast.success('Profile link copied!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center flex-col gap-4 p-8 text-center">
          <h1 className="text-3xl font-bold">{error || 'User not found'}</h1>
          <p className="text-white/60">@{username} doesn't exist or is private.</p>
          <button onClick={() => navigate('/')} className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-md font-semibold">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.username;
  const avatarSrc = profile.profile_picture_url || '/gamergrid-icon.svg';
  const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white" data-testid="public-profile-page">
      <Navbar />
      <BackNavigation />

      {/* Hero banner */}
      <div className="relative pt-24 pb-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-blue-900/30 to-cyan-900/30 blur-3xl opacity-70" />
        <div className="relative max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center md:items-end gap-6">
          <img
            src={avatarSrc}
            alt={displayName}
            className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white/5 object-cover border-4 border-purple-500 shadow-2xl"
            onError={(e) => { e.target.src = '/gamergrid-icon.svg'; }}
          />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{displayName}</h1>
            <p className="text-purple-300 text-sm mt-1">@{profile.username}</p>
            {memberSince && <p className="text-white/50 text-xs mt-1">Gamer since {memberSince}</p>}

            <div className="flex items-center justify-center md:justify-start gap-6 mt-4 text-sm">
              <div>
                <span className="text-2xl font-bold text-white">{profile.library_count}</span>
                <span className="text-white/60 ml-1">in library</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-white">{profile.ratings_count}</span>
                <span className="text-white/60 ml-1">reviews</span>
              </div>
              {profile.avg_rating !== null && profile.avg_rating !== undefined && (
                <div>
                  <span className="text-2xl font-bold text-yellow-400">{profile.avg_rating.toFixed?.(2) ?? profile.avg_rating}</span>
                  <span className="text-white/60 ml-1">avg ⭐</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={copyShareUrl}
              data-testid="copy-profile-link"
              className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm border border-white/20"
            >
              📋 Copy Link
            </button>
            <ShareButton size="sm" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-24">
        {/* Library */}
        <section className="mt-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            🎮 Library
            <span className="text-white/50 text-sm font-normal">({profile.library_count})</span>
          </h2>

          {profile.library.length === 0 ? (
            <p className="text-white/50 py-10 text-center bg-white/5 rounded-xl">@{profile.username} hasn't added any games yet.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {profile.library.map((item) => (
                <Link
                  to={`/search?q=${encodeURIComponent(item.title || '')}&direct=true&id=${item.content_id}`}
                  key={`${item.content_id}-${item.title}`}
                  className="group relative aspect-[2/3] rounded-md overflow-hidden bg-white/5 hover:ring-2 hover:ring-purple-500 transition-all"
                  data-testid={`library-item-${item.content_id}`}
                >
                  <img
                    src={item.poster_path || '/gamergrid-icon.svg'}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { e.target.src = '/gamergrid-icon.svg'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <p className="text-white text-xs font-medium line-clamp-2">{item.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <AdSlot name="profile_mid" className="my-10" />

        {/* Ratings / Reviews */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            ⭐ Reviews & Ratings
            <span className="text-white/50 text-sm font-normal">({profile.ratings_count})</span>
          </h2>

          {profile.ratings.length === 0 ? (
            <p className="text-white/50 py-10 text-center bg-white/5 rounded-xl">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {profile.ratings.map((r) => (
                <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-5" data-testid={`rating-${r.id}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-semibold text-lg">{r.content_title || `Game #${r.content_id}`}</p>
                      <div className="mt-1">{renderStars(r.rating)}</div>
                    </div>
                    <span className="text-white/40 text-xs">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  {r.review && <p className="text-white/80 mt-3 whitespace-pre-wrap">{r.review}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default PublicProfilePage;
