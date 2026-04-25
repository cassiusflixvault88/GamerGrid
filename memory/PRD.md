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
### Iteration 10 (this turn)
- **Public profile page `/u/:username`** — shareable per-user landing page with avatar, display name, "Gamer since" date, library count, reviews count, average rating, full library grid, and reviews list. **Sensitive fields (email/phone/address) are NEVER exposed**.
- **CheapShark price tracker** — new `GET /api/games/deals?title=` endpoint (free, no API key). Returns top live PC deals (Steam, GOG, Epic, Humble, GreenManGaming, etc.) with sale/normal price + savings %. Cached 2h. Surfaced in `ContentModal` as a "💰 Live PC deals" grid with deep links via `cheapshark.com/redirect`.
- **AdSense scaffolding** — env-gated `<AdSlot />` component. Placeholder shown in dev/preview; real `<ins class="adsbygoogle">` rendered when `REACT_APP_ADSENSE_CLIENT` and `REACT_APP_ADSENSE_SLOT_<NAME>` env vars are set. Slots placed on Home (between New Releases and platform rails) and Public Profile (between Library and Reviews).
- **Amazon Affiliate tag** — already wired in backend; set `AMAZON_AFFILIATE_TAG=your-tag-20` in `/app/backend/.env` to start earning.
- **Developers/publishers on cards** — `normalize_game()` now exposes `developer`, `publisher`, `developers[]`, `publishers[]`. Card hover overlay shows "by Rockstar North" under the title.
- **AuthModal a11y** — added `sr-only` `DialogTitle` + `DialogDescription`. Zero Radix warnings now.
- **Backend cleanup** — removed the **3 duplicate** `/api/user/profile` handlers from `server.py`. Only `routes/auth_routes.profile_router` serves the canonical path now.
- **Navbar** — added **My Profile** link to user menu (`data-testid='nav-my-profile'`, links to `/u/<username>`).

### Iteration 8–9
- **Critical bug fix — Service Worker was caching `/api/*`** indefinitely, causing stale `profile_picture_url` (and likely other API data) on reload. `service-worker.js` rewritten:
  - Bypasses any `/api/*` request and any non-GET method.
  - Cache-first for static assets only.
  - Network-first for HTML navigations (so deploys take effect quickly).
  - `activate` deletes old caches (`streamflix-v1`, `gamergrid-v*`) + `self.clients.claim()`.
  - Cache name bumped to `gamergrid-v3`.
- **Settings preset avatars grid** — pick one of GamerGrid, PlayStation, Xbox, Nintendo Switch, PC/Steam Deck. Click → instant save. Selection is highlighted with a purple ring; persists across reload (verified).
- **Custom avatar URL** still supported (paste any image URL or upload via the existing upload-profile-picture endpoint).
- **Pydantic User model**: `profile_picture_url` default changed from `"/flixvault-icon.svg"` to `None`. Migrated 7 existing users to clear the bad default.
- **Support page** — removed all movie/TV-show copy. First feature card now says "🎮 More Games / IGDB-powered catalog". "Unlimited Watchlist" → "Unlimited Library", "Early Access to Content" → "Early Access to New Games".
- **MongoDB TTL index** on `games_cache.expires_at` (`expireAfterSeconds=0`) — auto-evicts expired entries. `expires_at` stored as native BSON Date (was ISO string). Auto-init on first `cached_query()` call.
- **Game of the Year rail** — `GET /api/games/goty` (defaults to last completed year, accepts `?year=`). New `👑 Game of the Year — 2025` rail on Home page between Trending and Coming Soon.
- **Platform abbreviation badges** — every `ContentCard` now shows up to 3 compact badges (PS5 / PS4 / XSX / XB1 / SWITCH / PC) in the bottom-left.
- **Watchlist → Library rename** — Navbar menu, page heading, breadcrumb, top nav tooltip, ContentModal toasts and tooltip.

### Iteration 7
- **MongoDB-backed cache** for IGDB list responses (`games_cache` collection).
  TTLs: trending=1h, top-rated=6h, upcoming=30m, new-releases=30m, platform=2h, details=24h.
  Sub-100ms after first hit (vs ~700ms cold call).
- **Genre filter** + **Year filter** added to `/api/games/trending`, `/top-rated`, `/upcoming`, `/new-releases`, `/platform/{name}`. New `/api/games/genres` lists all 24 IGDB genres.
- **Buy / store links** in `GET /api/games/details/{id}` via `details.buy_links[]`. Uses IGDB `websites.type` (1/13/15/16/17/22/23/24) for direct deep links to Steam, GOG, Epic, itch.io, Official Site, Xbox Store, PSN, Nintendo eShop. Falls back to per-platform search URLs when IGDB doesn't have a direct deep link, and always appends an Amazon link (with optional `AMAZON_AFFILIATE_TAG` env var).
- **A11y polish**: added `<DialogTitle className="sr-only">` and `<DialogDescription className="sr-only">` to `ContentModal.jsx` and `Onboarding.jsx` to silence Radix warnings.
- **Frontend BrowseAllPage** now shows: 24 genre chips, year dropdown (Any + last 30 years), Sort buttons, search, and a "Clear filters" link when any filter is non-default.
- **Frontend ContentModal** now shows a colored "Where to play / buy" link bar with per-store branding (Steam blue, GOG purple, Epic gray, PSN blue, Xbox green, Nintendo red, Amazon orange).

### Pivot to GamerGrid (iteration 6)
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
- "Game of the Year" curated rail.
- Wishlist / "Watchlist" relabeled to "Library" for games.
- Pre-order CTA → external store (Steam/PSN/Xbox) wired into hero + cards.
- Mongo TTL index on `games_cache.expires_at` (currently stored as ISO string — convert to native `datetime` and add TTL index for auto-eviction).
- Surface `developers`, `publishers` and platform store deep-links on cards (currently only in modal).

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
