/* eslint-disable no-restricted-globals */
/**
 * GamerGrid Service Worker — PASSTHROUGH MODE
 *
 * History: previous versions cached static assets and HTML, which caused
 * "users must clear cache after every redeploy" hell. New strategy: do
 * NOTHING for fetches. Browser handles all caching natively via the
 * standard HTTP cache-control headers Cloudflare/Emergent already serve.
 *
 * Why keep the SW at all?
 *   - It still enables PWA installability ("Add to Home Screen").
 *   - The install/activate handlers wipe ALL legacy caches from previous
 *     versions, healing every existing user automatically on next visit.
 */

const CACHE_NAME = 'gamergrid-passthrough-v1';

// Install: take over immediately so no old SW lingers serving stale assets.
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

// Activate: nuke EVERY cache (including any from previous SW versions),
// then claim all open tabs so they're controlled by THIS SW from now on.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((names) =>
        Promise.all(names.map((n) => caches.delete(n)))
      ),
    ])
  );
});

// Fetch: do nothing. Letting the browser handle the request natively means
// users always get fresh HTML/JS/CSS on every reload — no cache, no stale
// bundles, no "buddy can't sign up after redeploy" errors. The hashed CRA
// bundle filenames (main.[hash].js) are already cache-safe by design.
// We intentionally do NOT call event.respondWith() so the request bypasses
// the SW entirely.

// Allow page-side code to ask SW to skip waiting (legacy compat).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
