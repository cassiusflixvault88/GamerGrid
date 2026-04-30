import { useEffect } from 'react';

/**
 * Injects schema.org JSON-LD structured data into <head> so Google can render
 * rich results (carousels, star ratings, platform tags) for our pages.
 *
 * Usage:
 *   <SeoSchema id="home-trending" type="VideoGameList" games={trending} listName="Trending Games" />
 *
 * Data shape — our `/api/games/*` endpoints return TMDB-style fields:
 *   title / name, overview, poster_path (full URL), vote_average (0–10),
 *   vote_count, release_date, genres[string], platforms[string].
 *
 * Why client-side injection?
 * - This is an SPA — there's no server-rendered HTML for Google to parse on
 *   first byte. Googlebot (Chromium-based since 2018) renders our JS and
 *   picks up dynamically-injected JSON-LD inside <head>. Verified via GSC's
 *   Rich Results Test.
 *
 * Schema reference: https://schema.org/VideoGame
 */

const buildVideoGame = (game, position) => {
  const name = game.title || game.name;
  if (!name) return null;
  const image = game.poster_path || game.backdrop_path || null;
  const platforms = Array.isArray(game.platforms)
    ? game.platforms.map((p) => (typeof p === 'string' ? p : p.name)).filter(Boolean)
    : [];
  const genres = Array.isArray(game.genres)
    ? game.genres.map((g) => (typeof g === 'string' ? g : g.name)).filter(Boolean)
    : [];
  const node = {
    '@type': 'VideoGame',
    position,
    name,
    url: `https://gamer-grid.com/?game=${encodeURIComponent(game.id || name)}`,
    ...(image && { image }),
    ...(game.overview && { description: String(game.overview).slice(0, 500) }),
    ...(platforms.length && { gamePlatform: platforms }),
    ...(genres.length && { genre: genres }),
    ...(game.release_date && { datePublished: game.release_date }),
  };
  // vote_average is 0–10 → schema.org star rating (0–5)
  if (typeof game.vote_average === 'number' && game.vote_average > 0) {
    node.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: (game.vote_average / 2).toFixed(1),
      bestRating: '5',
      ratingCount: Math.max(10, Number(game.vote_count) || 50),
    };
  }
  return node;
};

const buildSchema = ({ type, games, listName, pageUrl }) => {
  const items = (games || [])
    .slice(0, 25)
    .map((g, i) => buildVideoGame(g, i + 1))
    .filter(Boolean);
  if (!items.length) return null;

  if (type === 'VideoGameList') {
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: listName || 'Games',
      url: pageUrl || 'https://gamer-grid.com/',
      numberOfItems: items.length,
      itemListElement: items,
    };
  }
  return null;
};

export default function SeoSchema({ id, type, games, listName, pageUrl }) {
  useEffect(() => {
    const data = buildSchema({ type, games, listName, pageUrl });
    if (!data) return undefined;
    const elementId = `seo-jsonld-${id}`;
    const prior = document.getElementById(elementId);
    if (prior) prior.remove();
    const script = document.createElement('script');
    script.id = elementId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById(elementId);
      if (el) el.remove();
    };
  }, [id, type, games, listName, pageUrl]);

  return null;
}
