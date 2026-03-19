// Service Worker Registration for Studio Roast PWA
// Enables offline caching and "Add to Home Screen" on iOS/Android.

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3}$/)
);

export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

      if (isLocalhost) {
        // On localhost, verify the SW still exists to avoid caching issues during dev.
        checkValidServiceWorker(swUrl);
        navigator.serviceWorker.ready.then(() => {
          console.log('[PWA] Service worker active on localhost.');
        });
      } else {
        registerValidSW(swUrl);
      }
    });
  }
}

function registerValidSW(swUrl) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      registration.onupdatefound = () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.onstatechange = () => {
          if (installing.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content available — will be used on next load.
              console.log('[PWA] New content available. Refresh to update.');
            } else {
              // Content cached for offline use.
              console.log('[PWA] Content cached for offline use.');
            }
          }
        };
      };
    })
    .catch(err => {
      console.error('[PWA] Service worker registration failed:', err);
    });
}

function checkValidServiceWorker(swUrl) {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    .then(response => {
      const contentType = response.headers.get('content-type');
      if (response.status === 404 || (contentType && !contentType.includes('javascript'))) {
        // SW not found — unregister so the page reloads fresh.
        navigator.serviceWorker.ready.then(reg => reg.unregister()).then(() => window.location.reload());
      } else {
        registerValidSW(swUrl);
      }
    })
    .catch(() => {
      console.log('[PWA] No internet. Running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => registration.unregister())
      .catch(err => console.error(err.message));
  }
}
