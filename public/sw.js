const CACHE_NAME = 'focuspomo-v1779372627-pwa5';
const APP_SHELL_URL = '/';

const STATIC_ASSETS = [
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

const OFFLINE_HTML = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FocusPomo Offline</title><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#FFF8F0;color:#1D1D1F;padding:24px"><h1>FocusPomo 离线</h1><p>已离线。第一次安装后请在线打开一次完成缓存；之后会尽量像本地 App 一样打开已缓存的计时器和本地数据。</p><button onclick="location.reload()" style="border:0;border-radius:18px;background:#2D2625;color:#fff;padding:12px 18px;font-weight:700">重试</button></body>';

async function cacheAppShell(cache) {
  try {
    const response = await fetch(APP_SHELL_URL, { cache: 'reload' });
    if (!response || !response.ok) return;
    await cache.put(APP_SHELL_URL, response.clone());
    const html = await response.text();
    const assetUrls = Array.from(html.matchAll(/(?:src|href)="([^\"]*\/_next\/static\/[^\"]+)"/g))
      .map((m) => new URL(m[1], self.location.origin).pathname)
      .filter((v, i, a) => a.indexOf(v) === i);
    await Promise.allSettled(assetUrls.map((asset) => cache.add(asset)));
  } catch (_) {}
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)));
      await cacheAppShell(cache);
    })
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_APP_SHELL') {
    event.waitUntil(caches.open(CACHE_NAME).then(cacheAppShell));
  }
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
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(APP_SHELL_URL, clone));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(APP_SHELL_URL)) || new Response(OFFLINE_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
      )
    );
    return;
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
