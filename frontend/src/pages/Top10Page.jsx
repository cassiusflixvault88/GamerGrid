import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import ContentModal from '../components/ContentModal';
import { getImageUrl, getTop10 } from '../services/tmdb';

const Top10Page = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  useNavigate(); // hook for future use

  useEffect(() => {
    (async () => {
      try {
        const data = await getTop10();
        setItems(data);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white" data-testid="top10-page">
      <Navbar />
      <BackNavigation />

      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <div className="mb-10">
          <p className="text-purple-300 text-sm font-bold tracking-widest uppercase">📊 Powered by IGDB · Steam 24hr peak players</p>
          <h1 className="text-5xl md:text-6xl font-extrabold mt-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Top 10 Games Right Now
          </h1>
          <p className="text-white/60 mt-3 text-lg">
            Live ranking of the most-played games in the world today. Updated every 15 minutes.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-white/60 text-center py-20">No data available right now. Try again in a few minutes.</p>
        ) : (
          <div className="space-y-4">
            {items.map((g, idx) => {
              const rank = idx + 1;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelected(g)}
                  data-testid={`top10-row-${rank}`}
                  className="w-full group flex items-center gap-4 md:gap-6 p-3 md:p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 transition-all text-left hover:scale-[1.01]"
                >
                  <span
                    className="flex-shrink-0 select-none font-black leading-none text-transparent bg-clip-text bg-gradient-to-br from-purple-300 via-purple-500 to-blue-600"
                    style={{
                      fontSize: 'clamp(3rem, 8vw, 6rem)',
                      WebkitTextStroke: '1.5px rgba(255,255,255,0.15)',
                      lineHeight: 0.85,
                      width: 'clamp(3rem, 8vw, 7rem)',
                      textAlign: 'center',
                    }}
                  >
                    {rank}
                  </span>
                  <img
                    src={getImageUrl(g.poster_path, 'w300')}
                    alt={g.title}
                    className="w-20 h-28 md:w-28 md:h-40 rounded-md object-cover bg-white/5 flex-shrink-0 border border-white/10 shadow-lg"
                    onError={(e) => { e.target.style.opacity = 0.3; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-xl md:text-2xl font-bold truncate">{g.title}</h3>
                      {rank <= 3 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-600/30 border border-red-500/50 text-red-200 text-[10px] font-bold tracking-wider uppercase animate-pulse">
                          🔥 Hot
                        </span>
                      )}
                    </div>
                    {g.developer && (
                      <p className="text-white/60 text-sm mb-1">by <span className="text-white">{g.developer}</span></p>
                    )}
                    {g.overview && (
                      <p className="text-white/70 text-sm line-clamp-2 mt-1">{g.overview}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {g.vote_average > 0 && (
                        <span className="px-2 py-0.5 rounded bg-yellow-600/20 border border-yellow-500/40 text-yellow-300 text-xs font-bold">
                          ⭐ {g.vote_average.toFixed(1)}
                        </span>
                      )}
                      {(g.platforms || []).slice(0, 3).map((p) => (
                        <span key={p} className="text-white/50 text-xs">{p}</span>
                      ))}
                    </div>
                  </div>
                  <span className="hidden md:block text-purple-400 group-hover:translate-x-1 transition-transform text-2xl pr-2">→</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Footer />

      {selected && (
        <ContentModal
          content={selected}
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          onPlayTrailer={() => {}}
          onSelectContent={(c) => setSelected(c)}
        />
      )}
    </div>
  );
};

export default Top10Page;
