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

## Implemented (✅ as of 2026-02-26)
### Iteration 21 (this turn — CEO hub + theme + bookmarks + funnel)
- 👑 **Founder verified badge** on Cassius's public profile (auto-detected from CEO email allowlist) + "Creator of GamerGrid · Official Profile" tagline.
- 💬 **"Message Creator" button** on the founder's profile → opens a modal that lets ANY visitor (signed-in or guest) send Cassius a private message. Stored in `ceo_messages` collection. Admin-only endpoints to list, reply, and delete.
- ⭐ **Profile reviews system**: visitors can leave 1–5 star reviews directly ON a user's profile (`/api/profile-reviews/:username`). The profile owner can reply to each review. Reviewers can edit/delete their own. Backend collection: `profile_reviews`.
- 🔗 **"Meet the Creator"** link in the Profile dropdown — auto-discovers the founder's username via `GET /api/users/founder` so visitors can find Cassius in one click.
- 🔖 **Bookmark articles**: every News article card now has a `Save` button. Saved articles appear in **My Library → Saved Articles** (with image, source badge, summary, open & remove). Backend: `saved_articles` collection.
- 💬 **Reply + Like on content requests**: every "Request a game" admin response now has thumbs-up Like and Reply buttons. Replies thread under the admin response. Endpoints: `POST /api/content-requests/:id/reply` and `POST /api/content-requests/:id/like`.
- 🎨 **Working Theme system**: Light / Dark / **System** modes with proper `prefers-color-scheme` listening. Plus 7 dark-mode accent palettes (Royal Purple, Cyber Pink, Neon Green, Sunset Orange, Ocean Blue, Gold Rush, Crimson Red) with live preview. Persists via localStorage.
- 📊 **Conversion Funnel** card on Admin Analytics: Visitors → Sign-up Intent → Created Account → Upgraded to Pro, with percent-of-top, drop-off counts, and four conversion ratio cards (Visitor → Sign-up, Sign-up → Pro, Visitor → Pro, Intent → Sign-up).

### Iteration 20 (sign-up bug + geolocation + BackNav fix)
- 🚨 **CRITICAL: Sign-up bug fixed.** The signup endpoint was awaiting `_send_welcome_email` and `send_verification` synchronously — when Resend was slow/rate-limited, the entire HTTP request hung and users saw a generic "Something went wrong" toast. Both email calls are now `asyncio.create_task` background fires, so signup returns sub-200ms even if email is broken. Also added: email/username trim + lowercase normalization, case-insensitive username uniqueness check, friendly validation messages ("Password must be at least 6 characters", "That username is already taken"), and proper Pydantic 422 error rendering in the AuthModal toast (was rendering `[object Object]`). Login now finds users regardless of email casing.
- 🌍 **Visitor analytics — geolocation**: every new page_view is now enriched with `country`, `country_code`, `region`, `city` via free `ip-api.com` lookup. IP→geo mapping cached in Mongo `ip_geo_cache` (indefinite — IPs rarely change country). Real client IP extracted from `cf-connecting-ip`/`x-real-ip`/`x-forwarded-for` headers (Emergent ingress + Cloudflare). Geo enrichment runs in a background task so it never blocks tracking.
  - Admin Analytics page: new **Top Countries** + **Top Cities** cards (sorted by unique visitors).
  - Recent Visitors table: new **Location** column showing `US Council Bluffs, United States`-style entries.
- 🛠️ **BackNavigation rebuilt**: replaced `<button onClick={navigate(...)}>` with `<Link to=...>` components. The previous button-based version was reportedly not navigating on the deployed app. Link components work even before JS hydration completes and are immune to overlapping pointer-event bugs. Also added `relative z-30` so nothing accidentally overlaps the buttons.

### Iteration 19 (UX expansion + monetization)
- 🛒 **GameStop affiliate link** added to every game's `buy_links` (alongside Amazon, Steam, PSN, Xbox, eShop, Epic, GOG, Itch). Set `GAMESTOP_AFFILIATE_ID` env var to enable CJ Affiliate deep-link wrapping.
- 🔗 **New dedicated Share Hub page** (`/share` and `/share-links`): 12 one-click platforms (Facebook, Messenger, X/Twitter, Reddit, WhatsApp, Telegram, Discord, LinkedIn, Pinterest, Tumblr, Email, SMS) + Copy Link + Native Share + QR code generator.
- 🔍 **Search bar empty-state**: focus the search box and immediately see Popular & Trending games (18 pre-loaded) before typing — courtesy of `SearchAutocomplete` upgrade.
- 🎮 **Bigger homepage carousels**: every rail now serves up to 50 unique games (was 25–30). Backend `getTrending/TopRated/Upcoming/NewReleases/byPlatform` bumped to limit 60.
- 📦 **BrowseAll page**: 5 sort options (Top Rated, Most Popular, Newest, Oldest, Trending), client-side sorting works on every platform incl. "All", lazy-load "Load 100 More" button. Catalog grew from ~783 to **1,137 games** by bumping platform limits (PS=500, Xbox/PC=400, Switch=350).
- 🔔 **Admin notifications widget** (`/api/admin/notifications` + `/seen`): live counts of new tips, Pro subs, app reviews, game reviews, and signups since last seen — pulses pink badge on AdminDashboard.
- 📊 **Clickable analytics**: AdminDashboard stat cards now route to their relevant tab (Users, Reviews, App Reviews, Visitor Analytics).
- ⚡ **Auto-fetch 15-min badge** (`AutoFetchBadge`): pulsing green pill on Home banner and Profile dropdown advertising the auto-refresh.
- 📰 **News page**: prominent "Buy games" CTA banner up top + per-article "Discover & buy games on GamerGrid →" link beneath every article.
- 🏷️ **OpenGraph fix**: `index.html` favicon, apple-touch-icon, and og:image now point to `/gamergrid-icon.svg` (was legacy FlixVault).
- 💬 **ShareButton message**: rewritten with gaming-focused copy + buy-games promo (Steam/PSN/Xbox/GameStop/Amazon).

### Iteration 18 (full code cleanup pass)
- 🧹 **`server.py`: 1745 → 392 lines** (-77%, target was 400). Extracted into:
  - `routes/ratings_routes.py` (267 lines) — ratings, reviews/all, user replies, edit/delete
  - `routes/admin_routes.py` (451 lines) — dashboard, user mgmt, moderation, feedback, content requests, CEO promotion
  - Deleted dead code: `/trending/whats-hot` (200 lines), `/trending/flixvault`, `/watch-history`, `/continue-watching`, `/api/status`, FlixVault `/submit-movie` + `/admin/approve-movie`, legacy `/user/profile_legacy_disabled`, the dangerous `/admin/reset-ceo-accounts` endpoint, plus a 96-line block of commented-out feedback code.
- 🧩 **`SettingsPage.jsx`: 936 → 146 lines** (-84%). Split into 5 tab components:
  - `components/settings/ProfileTab.jsx` — profile fields, preset avatars, image upload
  - `components/settings/SecurityTab.jsx` — change email, change password
  - `components/settings/SubscriptionTab.jsx` — Pro upgrade card / Pro-active card
  - `components/settings/MessagesTab.jsx` — admin inbox + saved trailers link
  - `components/settings/NotificationsTab.jsx` — appearance/dark mode
  - Tabs sync with `?tab=` URL param so deep-linking still works.
- 🗑️ **Dead-code sweep**:
  - Deleted `pages/AdminDashboard_OLD.jsx` and `pages/PublicDomainPage.jsx`
  - Deleted backend orphans: `public_domain_videos.py`, `public_domain_videos_clean.py`, `tmdb_catalog_backup.py`, `fetch_games_catalog.py`
- 🛁 **`.gitignore` deduplicated** — 12 duplicate env blocks merged into one clean canonical block
- 🐍 **server.py lint errors fixed** — `$ne` → `$nin`, removed redefined `get_all_reviews`, removed unused `deleted_count`. `ruff` now clean across entire backend.
- 🔇 **Stripped console.log noise** from `Navbar.jsx` and rewrote `AuthContext.jsx` (250 → 165 lines, removed 14 debug logs while keeping behavior)
- 📁 **Renamed `services/tmdb.js` → `services/games.js`** (file is IGDB now, not TMDB) — all 8 importing files updated

### Iteration 17
- 🐛 CEO traffic exclusion bug fixed (`/api/analytics/track`)
- 📊 AdminVisitorWidget on Public Profile (Owner-only, 24h/7d/30d cards)
- 🆕 `GET /api/analytics/new-visitors-summary`

### Iteration 16
- ✨ "What's New" pulsing badge with "NEW FEATURES" label
- 🚀 Guest marketing hero (full above-the-fold pitch)
- ⚡ N+1 fixes in `get_app_reviews`, `get_ratings`, `get_all_reviews`

### Iteration 15
- 🔁 Top10 carousel randomized + 5min TTL
- 📚 1050 unique games (350 PS / 250 Xbox / 250 PC / 200 Switch)
- 📖 Saved Trailers in My Library
- 🔐 Hardcoded Stripe key removed + scrubbed from history
- 🛒 Amazon affiliate tag wired

## Implemented (✅ as of 2026-02-25)
### Iteration 12 (this turn)
- 🏆 **Top 10 hero carousel** — `Top10HeroCarousel.jsx` replaces the single hero on Home. Giant rank number (1–10) glows behind each game with a "#N IN TOP 10 GAMES TODAY" badge, "by <developer>" attribution, prev/next arrows, dot indicators. Auto-rotates every 6s. Backed by new `GET /api/games/top10` endpoint (rating ≥ 80 AND vote_count > 100, sort by total_rating_count, 2h TTL).
- 🌟 **Most Popular Right Now** rail — separate from Trending. Backed by `GET /api/games/most-popular` which sorts by IGDB `follows` (with `hypes` fallback). 30m TTL.
- 🗓️ **Coming Soon highlighted section** — moved up to **right after Trending** and wrapped in a vivid orange→pink→purple gradient panel with its own border, sub-heading and "View All →" link.
- 🎮 **Request page rebrand** — `RequestContentPage` is now "**Request a Game**" with three new types: **Game / Upcoming / DLC · Expansion** (Gamepad / Calendar / Sparkles icons). Title placeholder shows actual game examples. All movie/TV/documentary copy gone. Also fixed an eager redirect-to-home bug (now waits for `AuthContext` `loading` to settle).
- 🦴 **Footer** — "🎬 Request Content" → "🎮 Request a Game".
- ❎ **Xbox preset avatar** — replaced helix-style SVG with **classic green circle + white X**.

### Iteration 11
- 🔄 **Auto-rotate to fullscreen** in `VideoPlayer.jsx`: when the user opens a trailer and rotates their phone to landscape, the YouTube iframe automatically goes fullscreen. Returns to portrait → exits fullscreen. Uses both `screen.orientation.change` and the legacy `orientationchange` events. Cross-browser fullscreen helpers (webkit/moz prefixes) for iOS Safari support. Added a manual fullscreen toggle button (Maximize2/Minimize2 icons) in the top-right of the player as a fallback for desktop and devices that block auto-rotate. Added a "📱 Rotate your phone for fullscreen" hint.
- 🔓 **PWA orientation unlock** — `manifest.json` `orientation` changed from `"portrait-primary"` (which prevented rotation entirely on installed PWAs) to `"any"`. Updated manifest icon path from `/flixvault-icon.svg` → `/gamergrid-icon.svg`.
- 🪟 **Viewport** — added `viewport-fit=cover` so notched devices use the full screen during landscape playback.

### Iteration 10
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

### P0 — Live blockers
- _(none — BackNavigation verified working in screenshots; was a false alarm.)_

### P1 (high value, next up)
- **Google AdSense**: waiting on user's `ca-pub-XXXXXXXXXX` ID before wiring up.
- **RESEND_API_KEY**: not configured — admin "Send Test to Me"/Weekly Digest broadcasts fail. Set in `backend/.env` (free at https://resend.com).
- **GameStop affiliate**: free CJ Affiliate sign-up needed at https://www.cj.com → join GameStop's program → set `GAMESTOP_AFFILIATE_ID` env var.
- **Visitor analytics — geolocation**: add country/city from IP (e.g. via `ip-api.com` or `ipapi.co`) for the "source/location" data on Admin Analytics.
- **Game catalog +1,000–2,000**: bump `platformLimit` & loadable rails further once IGDB caches handle the load.

### P2
- High-risk refactor: `get_top10`, `get_game_details`, `_build_buy_links` (deferred until Amazon/GameStop tags stabilize).
- Refactor oversized components: `AdminDashboard.jsx` (~770L), `ContentModal.jsx` (585L), `RatingsReviews.jsx` (585L).
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
