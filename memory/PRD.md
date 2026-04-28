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

## Implemented (✅ as of 2026-02-28)
### Iteration 29 (this turn — tips-feed OR-query fix + homepage tip ping + admin diagnostic + tested 23/23)
- 🩹 **Critical fix: legacy "completed" tips were silently missing from the admin dashboard.** User's real $1 payment showed up in the public homepage ticker but NOT the admin tips-feed table. Root cause: tips-feed only queried `{payment_status: "paid"}`, but legacy txns from before reconciliation existed only had `{status: "completed"}`. Changed query to `{$or: [{payment_status: "paid"}, {status: "completed"}], payment_type: {$in: [tip, custom_tip, pro_subscription]}}` — now catches every successful payment regardless of which field got set first. Verified with 3-variant seed test: paid-only, completed-only, and pending → returns 2 (paid+completed), excludes pending. ✅
- 🛠 **`GET /api/payments/admin/all-transactions`** — admin-only diagnostic endpoint that returns ALL payment_transactions regardless of status (with `payment_status`, `status`, `client_ip`, `reconciled` fields exposed). For future debugging "why isn't my payment showing?" mysteries.
- 🔥 **`HomepageTipPing.jsx`** — slide-in toast at bottom-right of EVERY homepage visit when a NEW tip arrives. Polls `/api/payments/recent-public` every 30s, first-load suppression (only fires on truly fresh tips after the visitor opened the page), shows for 8s with name + amount + location, dismissible X button. Pure CSS slide-up animation. Used `sessionStorage` (not localStorage) so it can re-show across new visits.
- 🔒 **Security tighten:** removed `logger.warning("Using LIVE Stripe key: sk_live_xxxxxxxxx...")` log line that exposed first 20 chars of the key. Replaced with sanitized "Stripe LIVE key in use" log only.
- 🧪 **Backend testing-agent run: 23/23 PASS** (signup, login, tips-feed OR-query, all-transactions, recent-public, tip checkout, subscription checkout, checkout status, admin notifications, all game catalog endpoints). Two minor recommendations applied (payment_type filter + log redaction). Two architectural notes deferred (admin source-of-truth dual storage, Stripe reconcile short-circuit on bad key).

### Iteration 28 (payer celebration toast + confetti + chime)
- 🎉 **Payer celebration on `/payment-success`.** The moment payment confirms (status→`paid`), the page now fires:
  - Three-note ascending chime (C6→E6→G6 major triad via Web Audio API — no asset file)
  - Sticky Radix toast: "💜 Thanks for tipping!" or "🎉 Welcome to GamerGrid Pro!" with personalized amount
  - Browser notification (if the user has granted permission previously) so the celebration reaches their OS even if the tab isn't focused
  - Emoji confetti burst: 36 🎉💜✨🎊⭐🎮 particles falling with random horizontal drift, rotation, delay, and size (pure CSS keyframes — zero new dependencies). Cleans up after 2.5s.
- 🛡️ **Celebration fires exactly once** via `celebratedRef` — no duplicate chimes if the polling cycle re-enters.

### Iteration 27 (payment reconciliation + recovered alerts)
- 🚑 **Missed-payment reconciliation.** User's real $1 Stripe payment succeeded but never showed in the dashboard because the OLD deployed `PaymentSuccessPage` crashed (blank page) before the status-check endpoint could mark it paid, AND Stripe webhooks weren't configured. Added `_reconcile_pending_payments()` in `payments_routes.py` that runs every time admin opens the tips feed: finds `pending` transactions from the last 14 days, queries Stripe's `get_checkout_status` for each, and auto-updates to `paid` if Stripe says succeeded (grants Pro + fires referral credit if subscription). Returns `recovered` count in the feed response.
- 🔔 **Recovered-payment alert.** When the admin opens the Tips Feed and reconciliation found missed payments, the UI now fires the ding AND a browser notification titled "Recovered N missed payment(s)!" even on first load. This solves the exact scenario the user hit.
- 📝 **test_credentials.md rewritten** with a table of ALL required production env vars (STRIPE_API_KEY, RESEND_API_KEY, **SENDER_EMAIL=noreply@gamer-grid.com** for the newly verified domain, IGDB, affiliate tags) plus step-by-step instructions for configuring the Stripe Webhook endpoint in the Stripe Dashboard (prevents this missed-payment problem recurring).

### Iteration 26 (payment success page fix + real-time tip alerts + tips feed + public ticker)
- 🐛 **`/payment-success` blank-page bug fixed.** Previous version had a `useEffect → useCallback → setAttempts` infinite-loop dependency cycle PLUS `(amount_total/100).toFixed(2)` would crash if `amount_total` was null/undefined → React error → blank black page. Rewrote with `useRef`-based attempt counter, defensive `formatAmount()` helper that handles nulls, separate `cancelled` flag for unmount safety, retry up to 8 polls @ 2s each, and a friendly "Payment Status Unknown" fallback card with **Go Home** + **Try Again** buttons. Added `data-testid` selectors throughout.
- 🔔 **Live Admin Tips Feed (`AdminTipsFeed.jsx`)** mounted on Admin Dashboard right above the tabs. Polls `/api/payments/admin/tips-feed` every 15s, shows: total earned / tips / subs / count summary cards + a 5-column table (**Amount · Type · From · Where · When**). When a NEW payment lands (session_id not seen before):
  - 🎵 Plays a synthesized two-note bell (Web Audio API — no asset file needed) — toggle Sound on/off button persists in localStorage
  - 📱 Fires a browser/desktop notification (Notification API) with title, amount, name, and city — "Enable phone alerts" button requests permission on click
  - First-load suppression: alerts only fire on truly NEW tips, not when the dashboard first opens
  - Seen-IDs cap at 500 in localStorage to prevent unbounded growth
- 📡 **New backend endpoints in `payments_routes.py`:**
  - `GET /api/payments/admin/tips-feed?limit=50` — admin only. Returns last 50 paid transactions with bulk-fetched user info (username, display_name, avatar) + IP→geo enrichment (city, country, country_code) using the existing `_geo_lookup` helper from `analytics_routes.py`. Plus aggregate totals.
  - `GET /api/payments/recent-public?limit=5` — public, anonymized (first-name token only). Powers the homepage social-proof ticker.
- 🌐 **Live "Recent Tippers" ticker (`RecentTippersTicker.jsx`)** on the Home page, between Meet the Creator and the Pro banner. Marquee-style horizontal scroll loop ("Mike tipped $5 · Ashburn, US · 2m ago"), 60s polling, gradient edge fades, animated heart pulse, hidden gracefully when no tips exist yet.
- 📍 **Client IP captured on every checkout creation.** Added `http_request: Request` parameter and `client_ip = _real_ip(http_request)` line to `/payments/tip/checkout`, `/tip/custom`, and `/subscription/checkout`. Stored on the `payment_transactions` doc so the tips-feed can geolocate every payment without a separate tracking call.
- ✅ **Verified end-to-end** with curl: inserted a fake $1 tip from IP `8.8.8.8` → admin endpoint returned `Ashburn, US` enrichment with display name + amount + relative time. Public endpoint correctly anonymized. Cleaned up test data after verification. Both endpoints return correct shape, 403 properly enforced for non-admins, lint clean.

### Iteration 25 (Stripe live key root-cause fix + full health sweep)
- 🚨 **CRITICAL: Stripe "Invalid API Key" root cause found and fixed.** A previous agent had hardcoded the line `os.environ['STRIPE_API_KEY'] = '***REMOVED***'` at the top of `/app/backend/routes/payments_routes.py` (line 28). On every backend boot it was overwriting the user's real Stripe key with the literal string `***REMOVED***` — which is exactly why production checkout was returning `"Invalid API Key provided: ***REMOV*D***"`. Removed the line entirely. Backend now reads `STRIPE_API_KEY` from env at request time via `os.getenv`, so the key the user pastes into Emergent's deployment custom env vars is what Stripe receives. Verified with curl: error changed from "Invalid API Key (***REMOV*D***)" → "Expired API Key (sk_live_...)" proving the integration plumbing is now correct (preview pod has an old expired live key; production will use the user's pasted fresh key).
- 🩺 **Comprehensive health sweep — all green:**
  - Public endpoints: `/api/`, all `/api/games/*` (trending, top-rated, upcoming, new-releases, top10, most-popular, genres, platforms, search, all 4 platform routes), `/api/users/founder`, `/api/referrals/leaderboard`, `/api/app-reviews` → all 200 ✅
  - Authenticated endpoints: `/api/news`, `/api/auth/me`, `/api/user/profile`, `/api/watchlist`, `/api/saved-articles`, `/api/referrals/me` → all 200 ✅
  - Admin gating verified (non-admin → 403 on `/api/admin/notifications`)
  - Frontend smoke test: Home page renders Top 10 hero ("Grand Theft Auto V #1"), Meet the Creator card, FOUNDER badge, Message/Rate/Review buttons, auto-update badge, Pro banner — all good
  - Lint clean on `payments_routes.py`
- ⚠️ **Discovered (NOT a code bug — user action needed): Resend in TESTING MODE.** Backend logs show: `"You can only send testing emails to your own email address (cassiusgamergrid@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains"`. Welcome emails to NEW signups are silently failing in BOTH preview and prod. **User must verify a domain at https://resend.com/domains** (or upgrade Resend plan) before welcome emails / digests will work for non-Cassius recipients.
- 🔇 **Noted but harmless:** `passlib bcrypt __about__` warning in logs — passlib + bcrypt 4.x version detection quirk, does NOT break password hashing/verification (signup + login both work end-to-end). Leaving alone per scope.

### Iteration 24 (bulletproof signup, kill stale-cache loop)
- 🚨 **Stale frontend bundle root cause exposed.** Buddy's "still getting an error" was caused by his browser's PWA service worker serving the OLD JS bundle from cache, even after Cassius redeployed. Old bundle = old `EmailStr` validator = 422 errors on common mobile-keyboard inputs.
- 🛠️ **Fixed for good:**
  - Bumped service worker `CACHE_NAME` v3 → v5 (forces full cache invalidation on next visit)
  - Service worker now BYPASSES `/static/` entirely (CRA already content-hashes filenames; caching them was the root cause). Every deploy is now picked up immediately.
- 👁️ **Persistent visible error banner in AuthModal.** Toasts on mobile vanish in 3s — easy to miss. Now ANY signup/signin error shows a sticky red banner with: title, exact HTTP status code (e.g. `HTTP 400`), full error message, "🔄 Refresh & try again" button for network errors, and a "Stuck? Screenshot this and message Cassius" hint. Result: every future error is now diagnosable from a single screenshot.
- 🛡️ **20-second client timeout** on login/signup so a slow network gives a clear "Can't reach our server" error instead of hanging the spinner forever.
- 🧹 **Client-side trim+lowercase** of email/username before submit, so even if backend defenses regress, the UI sends clean data.
- 🧪 **Verified with 8 mobile-keyboard edge cases** on backend: trailing whitespace, smart quotes in passwords, emoji usernames, plus-addressing emails, dotted usernames, 45-char passwords, 6-char min boundary, 5-char rejected → all return correct HTTP status.

### Iteration 23 (Make Message + Rate Creator discoverable)
- 🌟 **Big "Meet the Creator" card** on the Home page (above the Pro banner) — visible to ALL visitors including guests. Shows Cassius's avatar, name, FOUNDER badge, plus three explicit action buttons: 💬 Message · ⭐ Rate · ✨ Review. One click takes anyone straight to the public profile where the Message modal + Rate-and-Review form already live.
- 🔗 **Footer "Created by Cassius Fox"** is now a clickable link to his profile, plus a dedicated "⭐ Meet · Message · Rate the Creator" line right below it. Reachable from every page in the app.
- 📝 **Rate-and-Review section heading** rewritten from "Reviews for Cassius Fox" → "Rate {Cassius Fox} & GamerGrid" with a friendly CTA: "What do you think of him and the work he's done? Drop a star rating and a quick review — he reads every single one." Anchor `#rate-creator` added so external links can scroll straight to it.

### Iteration 22 (sign-up bulletproofing + theme + badge removal + referrals)
- 🚨 **CRITICAL: Sign-up failure root cause fixed (round 2).** `UserCreate.email` was `EmailStr` from Pydantic — it ran validation BEFORE my custom normalization. If a friend's mobile keyboard added a trailing space or any unusual char, Pydantic returned a confusing 422 error array and the AuthModal showed "Sign-up failed." Switched to plain `str` with my own regex validation, AND wrapped the entire signup endpoint in a top-level try/except so any unexpected failure now returns a friendly 500 with a useful message instead of an unhandled exception. Also made every post-creation step (CEO promotion, role enrichment, bg-task scheduling) wrapped in its own try/except so signup ALWAYS succeeds once the user doc is in Mongo.
- 🚫 **"Made with Emergent" badge removed.** The `<a id="emergent-badge">` element is now `display:none` permanently, plus a global CSS safety net AND a MutationObserver that nukes the badge if any external script tries to re-inject it. Verified via DOM check: `found: false`.
- 🎨 **Theme system actually paints the page now.** Previously CSS variables were set but no component actually used them. Added an `index.css` accent-repaint layer that overrides Tailwind's `bg-purple-600`, `from-purple-600 to-blue-600`, `text-purple-300`, and 30+ other utility classes to use `var(--gg-accent)`. Light mode flips the entire `bg-black`/`bg-gray-900` page wrappers to a clean light surface with proper text colors. All 7 accents (Royal Purple, Cyber Pink, Neon Green, Sunset Orange, Ocean Blue, Gold Rush, Crimson Red) now visibly change buttons, gradients, borders, and badges across the entire app on click.
- 🎁 **Refer-a-Friend system live.** Every user gets a unique 8-char code (`/api/referrals/me`). When invitee signs up via `?ref=CODE` (auto-captured by `ReferralCapture` component → localStorage → claimed post-signup), referral is recorded in `referral_signups`. When invitee upgrades to Pro, `award_referral_pro_credit()` fires from the payments handler and grants 1 month of free Pro to BOTH parties. New `/refer` page shows: stats, share link, copy button, social shortcuts (FB, X, WhatsApp, Telegram), how-it-works steps, and public top-10 leaderboard. Redeem button converts earned credits to Pro time.

### Iteration 21 (CEO hub + theme + bookmarks + funnel)
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
