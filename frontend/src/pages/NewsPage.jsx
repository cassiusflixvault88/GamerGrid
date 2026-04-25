import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import AdSlot from '../components/AdSlot';
import NewsArticleSocial from '../components/NewsArticleSocial';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const NewsPage = () => {
  const [articles, setArticles] = useState([]);
  const [sources, setSources] = useState([]);
  const [activeSource, setActiveSource] = useState('all');
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState(null);

  const load = async (src = 'all') => {
    setLoading(true);
    try {
      const url = src === 'all' ? `${API}/news?limit=80` : `${API}/news?source=${encodeURIComponent(src)}&limit=80`;
      const res = await axios.get(url);
      setArticles(res.data?.articles || []);
      setSources(res.data?.sources || []);
      setFetchedAt(res.data?.fetched_at);
    } catch (e) {
      console.error('news load failed', e);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(activeSource); }, [activeSource]);

  // Auto-refresh every 5 minutes while page is open
  useEffect(() => {
    const t = setInterval(() => load(activeSource), 5 * 60 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [activeSource]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white" data-testid="news-page">
      <Navbar />
      <BackNavigation />

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="mb-8">
          <p className="text-purple-300 text-sm font-bold tracking-widest uppercase">📰 Auto-updates every 15 min</p>
          <h1 className="text-5xl md:text-6xl font-extrabold mt-2 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            Gaming News
          </h1>
          <p className="text-white/60 mt-3 text-lg">
            Latest patches, DLC drops, announcements and reviews — straight from IGN, GameSpot, PCGamer, Eurogamer, Polygon and more.
          </p>
          {fetchedAt && (
            <p className="text-white/40 text-xs mt-2">
              Last updated: {new Date(fetchedAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Source filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveSource('all')}
            data-testid="news-source-all"
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
              activeSource === 'all'
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
            }`}
          >
            🌐 All Sources
          </button>
          {sources.map((s) => (
            <button
              key={s.name}
              onClick={() => setActiveSource(s.name)}
              data-testid={`news-source-${s.name.replace(/\s+/g, '-')}`}
              style={activeSource === s.name ? { backgroundColor: s.color, borderColor: s.color, color: '#000' } : {}}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                activeSource === s.name
                  ? ''
                  : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <AdSlot name="news_top" className="mb-8" />

        {loading && articles.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <p className="text-white/60 text-center py-20">No articles found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((a, i) => (
              <div
                key={a.id || a.link || i}
                data-testid={`news-card-${i}`}
                className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-xl overflow-hidden transition-all flex flex-col"
              >
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="aspect-video bg-white/5 overflow-hidden relative">
                    {a.image ? (
                      <img
                        src={a.image}
                        alt={a.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-4xl">
                        🎮
                      </div>
                    )}
                    <span
                      className="absolute top-3 left-3 px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase"
                      style={{ backgroundColor: a.source_color, color: '#000' }}
                    >
                      {a.source}
                    </span>
                  </div>
                </a>
                <div className="p-4 flex-1 flex flex-col">
                  <a href={a.link} target="_blank" rel="noopener noreferrer" className="block">
                    <h3 className="font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2 mb-2">
                      {a.title}
                    </h3>
                    {a.summary && (
                      <p className="text-white/60 text-sm line-clamp-3 flex-1">{a.summary}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 text-xs text-white/40">
                      <span>{a.author || ''}</span>
                      <span>{timeAgo(a.published)}</span>
                    </div>
                  </a>
                  <NewsArticleSocial article={a} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default NewsPage;
