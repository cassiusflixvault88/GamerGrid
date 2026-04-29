// This optional code is used to register a service worker.
// register() is not called by default.

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register(config) {
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('FlixVault PWA is ready for offline use.');
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      // Force an update check EVERY time the app is opened. This is what
      // rescues users whose browsers (especially desktops that stay open for
      // days) are still running a months-old service worker. Without this,
      // a stuck SW can intercept API calls with a stale JS bundle pointing at
      // a now-defunct backend URL → "Can't reach our server" errors.
      try { registration.update(); } catch (_) { /* noop */ }

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            // Tell the new SW to activate immediately. Because the SW is now
            // passthrough (no caching), there is nothing stale to evict and
            // no need to reload the page — the user keeps their session,
            // form state, scroll position, everything. Updates simply flow
            // in naturally on the next navigation/reload they trigger.
            try {
              installingWorker.postMessage({ type: 'SKIP_WAITING' });
            } catch (_) { /* noop */ }
            if (navigator.serviceWorker.controller) {
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else if (config && config.onSuccess) {
              config.onSuccess(registration);
            }
          }
        };
      };

      // Intentionally NO auto-reload on controllerchange. The previous version
      // hard-reloaded the page whenever a new SW took over, which kicked
      // users out of forms (signup/login/checkout) mid-action. Since the SW
      // no longer caches anything, there's no stale content to flush.
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
