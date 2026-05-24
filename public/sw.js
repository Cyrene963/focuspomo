const CACHE_NAME = 'focuspomo-v1779372627-pwa2';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon-1779372627.ico',
  '/favicon-1779372627-32.png',
  '/favicon-1779372627-16.png',
  '/icon-1779372627-192.png',
  '/icon-1779372627-512.png',
  '/icon-1779372627-apple.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const isHTML = event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
          return response;
        })
        .catch(async () =>
          (await caches.match('/')) ||
          new Response('<!doctype html><meta charset="utf-8"><title>FocusPomo Offline</title><body style="font-family:-apple-system,sans-serif;background:#FFF8F0;color:#1D1D1F;padding:24px"><h1>FocusPomo 离线</h1><p>已离线，稍后重新打开即可继续使用本地数据。</p></body>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        if (response.ok && (url.pathname.startsWith('/_next/static/') || STATIC_ASSETS.includes(url.pathname))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
    )
  );
});
