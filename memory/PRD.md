# GamerGrid - Product Requirements (PRD)

## Original Problem Statement
User asked to fix FlixVault's UI and Stripe LIVE integration, then executed a massive pivot:
transform the application entirely from a movie/TV streaming discovery app ("FlixVault") into
a video game discovery app ("GamerGrid") powered by the IGDB (Twitch) API.

## Product Vision
A modern, PS-Store-quality discovery experience for gamers across PlayStation, Xbox, PC/Steam
and Nintendo Switch — featuring trailers, screenshots, Metacritic & user scores, and Stripe
support payments.

## Tech Stack
- Frontend: React + Tailwind + Shadcn/UI + React Router
- Backend: FastAPI + Motor (Async MongoDB)
- Data: IGDB API (Twitch OAuth) using Apicalypse query syntax
- Payments: Stripe LIVE
- Hosting: Emergent (preview + deploy)

## Implemented (✅ as of 2026-02-25)
### Pivot to GamerGrid (this fork)
- Replaced TMDB integration with IGDB v4 (Twitch) API.
- Backend `/api/games/*` endpoints with response normalization to TMDB-shaped payloads:
  - `GET /api/games/trending`
  - `GET /api/games/top-rated`
  - `GET /api/games/upcoming`
  - `GET /api/games/new-releases`
  - `GET /api/games/platform/{playstation|xbox|pc|switch}` with `?sort=rating|popular|release`
  - `GET /api/games/search?q=`
  - `GET /api/games/details/{id}` (developers, publishers, similar games, screenshots, videos)
  - `GET /api/games/videos/{id}` (YouTube trailers in TMDB-compatible shape)
  - `GET /api/games/platforms` (preset list)
- 30-min in-memory cache for hot endpoints.
- Frontend rebuilt:
  - `services/tmdb.js` rewritten as IGDB wrapper with same exports.
  - `App.js` cleaned (no broken movie page imports), added `/games/all` and `/games/:platform` routes.
  - `Home.jsx` displays 8 game carousels (Trending Now, Coming Soon & Pre-Orders, Top Rated, New Releases, PlayStation, Xbox, PC/Steam, Switch).
  - `BrowseAllPage.jsx` with platform chips (All Games, PlayStation, Xbox, PC/Steam, Switch), sort buttons (Top Rated / Most Popular / Newest), and search.
  - `SearchPage.jsx` and `SearchAutocomplete.jsx` rewired to `/api/games/search`.
  - `Navbar.jsx` shows Home / PlayStation / Xbox / PC / Switch / Browse All.
  - `TopNavBar.jsx` updated (no more `/public-domain`).
  - `ContentModal.jsx` enhanced for games: platforms badges, developer/publisher, Metacritic + IGDB scores, screenshots carousel, gameplay trailer thumbnails, YouTube playback.
  - `Footer.jsx` says "Powered by IGDB".

### Pre-pivot (kept intact)
- Stripe LIVE checkout works (server.py routes + payments_routes.py).
- JWT auth (signup/login), CEO auto-promote on signup/login.
- Watchlist, ratings/reviews, admin dashboard, app reviews, feedback, content requests.

## Backend Architecture
```
/app/backend/
  server.py                  # FastAPI entry; mounts routers
  routes/
    auth_routes.py
    watchlist_routes.py
    payments_routes.py       # Stripe LIVE
    game_routes.py           # NEW - IGDB v4
  igdb_client.py             # legacy helper (game_routes is now self-contained)
  models.py, ratings.py, admin_models.py, auth.py
```

## DB Collections (MongoDB)
- `users` – {id, email, username, hashed_password, watchlist[]}
- `ratings`, `app_reviews`, `app_review_replies`, `review_replies`, `user_replies`
- `admins`, `feedback`, `content_requests`, `movie_submissions`, `watch_history`
- (No game caching collection yet – live IGDB w/ in-memory cache)

## Roadmap

### P1 (high value, next up)
- Persist & cache IGDB games into MongoDB (collection `games`) for instant load + offline-friendly.
- "Game of the Year" curated rail.
- Filter chips on `BrowseAllPage`: by genre + by year.
- Deeper "Similar Games" rail in `ContentModal` (already wired, polish needed).
- Wishlist / "Watchlist" relabeled to "Library" for games.

### P2
- AdSense integration (awaiting user approval).
- Amazon Affiliates buy links per game in `ContentModal`.
- Pre-order CTA → external store (Steam/PSN/Xbox).
- Refactor `server.py` (split out movie-era endpoints).
- Real-time price tracking (CheapShark/IsThereAnyDeal API).
- "Powered by AI" recommendation engine using user ratings.

## Critical Notes for Future Agents
- **Stripe is LIVE.** Don't enter real card numbers in tests.
- IGDB v4 quirks already handled: removed deprecated `category=0` & `version_parent=null` filters, replaced `popularity` with `total_rating_count`. Apicalypse queries must be sent as plain text (`httpx.post(url, content=string)`), not JSON.
- `REACT_APP_BACKEND_URL` was pointing to the production deploy URL; now points to preview URL so FE can talk to the new backend in dev. **Re-deploy from Emergent platform** to update the production deploy backend before flipping `.env` back to production.
- A11y: `ContentModal` and `Onboarding` Radix Dialogs emit a `DialogTitle` warning. Non-blocking but worth a `<VisuallyHidden>` title later.
- `/api/trending/whats-hot` still has a TMDB fallback in `server.py` — unused by the FE, can be removed in a future cleanup.

## Known Test Credentials
See `/app/memory/test_credentials.md`.
