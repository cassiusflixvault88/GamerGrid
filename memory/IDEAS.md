# Cassius's Ideas / Backlog 📝

This file tracks ideas, requests, and "I forgot what I was going to say"-type things mentioned in chat. Updated by the agent each session.

---

## 🟢 ACTIVE / IN-PROGRESS

_(items being worked on right now)_

---

## 🔵 NEXT (planned, ready to build when you say go)

- **Welcome email on signup** ✅ DONE Feb 25 — fires automatically once `RESEND_API_KEY` is set
- **Pro Subscription tier ($4.99/month)**
  - Pro users = NO ads (AdSlot already checks `user.is_pro`, but ad gating still needs to be wired into Pro state)
  - Pro users = trailer downloads (DONE — admin/pro now see Download button after backend role fix)
  - Stripe subscription checkout already exists at `/api/payments/subscription/checkout`
  - **TODO**: Hide AdSlot for users where `user.is_pro === true`
  - **TODO**: Settings page should show "Manage Subscription" / "Cancel" if user is Pro
  - **TODO**: Add "Upgrade to Pro" CTA button somewhere prominent (Navbar dropdown? Settings page? Hero?)

- **GA4 Measurement ID** — paste into `index.html` (commented stub already there)
- **Google AdSense** — set `REACT_APP_ADSENSE_CLIENT` + `REACT_APP_ADSENSE_SLOT_*` in `frontend/.env`
- **Amazon Affiliate tag** — set `REACT_APP_AMAZON_AFFILIATE_TAG` in `frontend/.env` once approved

---

## 🟡 LATER (nice-to-haves you mentioned)

- **Mini-Player PiP for trailers** — floating player when user scrolls past hero trailer
- **Auto-schedule weekly digest cron** — APScheduler to fire every Monday automatically
- **Weekly digest opt-out link** in email footer (currently links to /settings)

---

## 🟣 BACKLOG / FUTURE

- Refactor `server.py` (~1700 lines) into more `/routes/*.py` modules
- Consider: push notifications for big game launches
- Consider: "Played" status badge on Library items

---

## 💡 IDEAS YOU'VE MENTIONED IN PASSING

_(I'll add to this list every time you mention something casually so we don't lose ideas)_

- [Feb 25] Want analytics for visitors who don't sign up — ✅ DONE
- [Feb 25] Want monetization explained: AdSense + Amazon Affiliates + $4.99 Pro tier (Pro = ad-free + saves trailers)
- [Feb 25] Bug found: admin/CEO not seeing Download Trailer button — ✅ FIXED Feb 25 (was missing `is_admin`/`is_pro` in user response)
- [Feb 25] Wants to see EVERY real visitor (not own refreshes) and a list of who visited — ✅ DONE: admin visits now auto-excluded + Recent Visitors live feed added
- [Feb 25] Eventually buying a domain to make this a website too (not just app) — keep in mind for future SEO/sitemap work
- [Feb 25] Bug: ssyoutube.com (download link) shut down in US in 2020 — ✅ initial server-side downloader built but YouTube blocks datacenter IPs site-wide
- [Feb 25] **PIVOT**: Replaced "Download Trailer" with "Save Trailer to Library" (pro feature). Pro users get a Saved Trailers section in Settings ✅ DONE
- [Feb 25] Admin can send direct messages to any user (info/warning/violation severity) — ✅ DONE, also auto-emails them
- [Feb 25] Inbox section in Settings page shows admin messages with unread badges — ✅ DONE
- [Feb 25] Only the original CEO email can demote/delete other admins — ✅ DONE, enforced server-side
- [Feb 25] Deleting a user now also deletes their saved trailers + admin messages — ✅ DONE
- [Feb 25] Suppress dev-mode "Script error" overlay on preview — ✅ DONE
- [Feb 25] Domain pick: leaning toward `gamergrid.com` + `gamergrid.gg` (buy both, .com primary, .gg redirects)

---

## ✅ COMPLETED THIS SESSION (Feb 25, 2026)

- Analytics dashboard at `/admin/analytics` (totals, daily chart, top pages, conversion)
- Anonymous PageTracker for visitor counts
- GA4 hook stub in `index.html`
- Top 10 Weekly Digest Email infrastructure (Resend, preview, test, broadcast, history)
- Welcome email on signup (auto-fires once `RESEND_API_KEY` set)
- Bug fix: `is_admin` + `is_pro` now return in `/auth/me`, `/auth/login`, `/auth/signup` so Download button shows for Admin/Pro users

---

## 📌 IMPORTANT REMINDERS

- **FRUGAL MODE** is on — minimize testing agent / screenshots
- **Stripe = LIVE** mode — never test with real cards
- App is already deployed and grade-A — only adding refinements
- CEO credentials: `cassiusflixvault@gmail.com` / `JGotti.8890`
