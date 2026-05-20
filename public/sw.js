const CACHE_NAME = 'focuspomo-v4';

// Keep this in sync with public/manifest.json and src/app/layout.tsx.
// Only cache install-critical static assets, NOT HTML pages.
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon-1779296934.ico',
  '/favicon-1779296934-32.png',
  '/favicon-1779296934-16.png',
  '/icon-1779296934-192.png',
  '/icon-1779296934-512.png',
  '/icon-1779296934-apple.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
];

// Install: cache static assets only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-only for HTML, network-first for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isHTML = event.request.headers.get('accept')?.includes('text/html');

  // HTML pages: always network, never cache
  if (isHTML) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response('<h1>Offline</h1><p>Please check your connection.</p>', {
          headers: { 'Content-Type': 'text/html' },
        })
      )
    );
    return;
  }

  // Static assets: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
