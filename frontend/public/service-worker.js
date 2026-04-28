/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'gamergrid-v5';

// Install + immediately skip waiting so a new SW takes control ASAP
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME));
});

// Activate — clean up ALL old caches (any version name) + claim all clients
// so the new SW starts handling requests from existing tabs immediately.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((names) =>
        Promise.all(
          names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
        )
      ),
    ])
  );
});
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
];

// Fetch event - NEVER intercept API requests; cache static assets only
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 🔴 Bypass SW entirely for API + auth routes — these MUST be live every request.
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return; // let the browser handle it
  }

  // 🔴 Bypass SW for the JS/CSS bundles too — CRA already hashes them by content,
  // so we WANT the browser to fetch the new ones on every deploy. Caching them
  // was the root cause of "buddy can't sign up after redeploy" bugs because
  // his browser kept running the old bundle.
  if (url.pathname.startsWith('/static/')) {
    return; // let the browser handle it (browser cache headers will still apply)
  }

  // Network-first for HTML navigations (so deploy updates take effect)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }

  // Cache-first for static assets only
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});

// Allow page to ask SW to skip waiting (used by InstallPWA + force-update)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
