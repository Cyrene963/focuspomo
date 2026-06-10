const CACHE_NAME = 'focuspomo-v1779372627-pwa8';
const APP_SHELL_URL = '/';

// Build-time injected from `.next/static` by scripts/inject-sw-precache.js.
// iPadOS standalone PWAs white-screen offline if even one current Next chunk is missing.
// Do not rely only on runtime HTML regex extraction for the offline shell.
// __PRECACHE_NEXT_STATIC_START__
const PRECACHE_NEXT_STATIC = [
  "/_next/static/7iPEjPVvFairo-YAwMqov/_buildManifest.js",
  "/_next/static/7iPEjPVvFairo-YAwMqov/_ssgManifest.js",
  "/_next/static/chunks/201-e77d613e94d7c36d.js",
  "/_next/static/chunks/4b5b508e-5f5d17962b9f626e.js",
  "/_next/static/chunks/4bd1b696-215e5051988c3dde.js",
  "/_next/static/chunks/794-5fb6eff04a716ab6.js",
  "/_next/static/chunks/app/_global-error/page-3fe98b7f233343d9.js",
  "/_next/static/chunks/app/_not-found/page-523e3a0f6e6b3bfd.js",
  "/_next/static/chunks/app/api/agent/key/route-3fe98b7f233343d9.js",
  "/_next/static/chunks/app/api/agent/tasks/route-3fe98b7f233343d9.js",
  "/_next/static/chunks/app/api/auth/callback/google/route-3fe98b7f233343d9.js",
  "/_next/static/chunks/app/api/auth/google/calendar/route-3fe98b7f233343d9.js",
  "/_next/static/chunks/app/api/auth/google/callback/route-3fe98b7f233343d9.js",
  "/_next/static/chunks/app/api/auth/google/route-3fe98b7f233343d9.js",
  "/_next/static/chunks/app/api/auth/logout/route-3fe98b7f233343d9.js",
  "/_next/static/chunks/app/api/calendar/sync/route-3fe98b7f233343d9.js",
  "/_next/static/chunks/app/api/me/route-3fe98b7f233343d9.js",
  "/_next/static/chunks/app/api/sync/route-3fe98b7f233343d9.js",
  "/_next/static/chunks/app/layout-99a452415193d94d.js",
  "/_next/static/chunks/app/page-5b310ef2a8a6f742.js",
  "/_next/static/chunks/framework-93cda6578f6c76ec.js",
  "/_next/static/chunks/main-app-83e8951bc4008115.js",
  "/_next/static/chunks/main-d792e4133be0f50b.js",
  "/_next/static/chunks/next/dist/client/components/builtin/app-error-3fe98b7f233343d9.js",
  "/_next/static/chunks/next/dist/client/components/builtin/forbidden-3fe98b7f233343d9.js",
  "/_next/static/chunks/next/dist/client/components/builtin/global-error-cd6fa91b3d188aed.js",
  "/_next/static/chunks/next/dist/client/components/builtin/not-found-3fe98b7f233343d9.js",
  "/_next/static/chunks/next/dist/client/components/builtin/unauthorized-3fe98b7f233343d9.js",
  "/_next/static/chunks/polyfills-42372ed130431b0a.js",
  "/_next/static/chunks/webpack-589ea4b0a5f0dd2f.js",
  "/_next/static/css/925f0844dc69e749.css"
];
// __PRECACHE_NEXT_STATIC_END__

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

const OFFLINE_HTML = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#FFF8F0"><title>FocusPomo Offline</title><body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Nunito',sans-serif;background:#FFF8F0;color:#2D2625;min-height:100vh;display:flex;align-items:center;justify-content:center"><main style="width:min(420px,calc(100vw - 40px));padding:28px;border-radius:32px;background:rgba(255,255,255,.72);box-shadow:0 24px 80px rgba(45,38,37,.14);text-align:center"><img src="/icon-1779372627-192.png" width="72" height="72" style="border-radius:24px;box-shadow:0 12px 36px rgba(232,100,78,.2)" alt="FocusPomo"><h1 style="font-size:28px;margin:18px 0 8px">FocusPomo 离线模式</h1><p style="font-size:15px;line-height:1.7;margin:0 0 18px;color:#6B5B57">当前没有网络。如果你已经在线打开过最新版，计时器会直接从本地缓存启动；如果这里只显示离线卡片，说明旧版 iPad PWA 还没完成新版缓存，请联网打开一次后再断网测试。</p><button onclick="location.reload()" style="border:0;border-radius:18px;background:#2D2625;color:#fff;padding:13px 20px;font-weight:800;font-size:15px">重新尝试打开</button></main></body></html>`;

function extractNextStaticAssets(html) {
  const urls = [];
  const attrPattern = /(?:src|href)=\"([^\"]*\/_next\/static\/[^\"]+)\"/g;
  const escapedPattern = /\/_next\/static\/[^\"'\s<>),]+/g;
  for (const match of html.matchAll(attrPattern)) urls.push(match[1]);
  for (const match of html.matchAll(escapedPattern)) urls.push(match[0].replace(/\\+$/, ''));
  return Array.from(new Set(urls.map((url) => new URL(url, self.location.origin).pathname)));
}

async function cacheAppShell(cache) {
  try {
    const response = await fetch(APP_SHELL_URL, { cache: 'reload' });
    if (!response || !response.ok) return false;
    const html = await response.clone().text();
    await cache.put(APP_SHELL_URL, response.clone());
    await cache.put('/?source=pwa', response.clone());
    await cache.put('/?shortcut=start', response.clone());
    await cache.put('/offline.html', new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
    const assetUrls = Array.from(new Set([...PRECACHE_NEXT_STATIC, ...extractNextStaticAssets(html)]));
    await Promise.allSettled(assetUrls.map(async (asset) => {
      const assetResponse = await fetch(asset, { cache: 'reload' });
      if (assetResponse && assetResponse.ok) await cache.put(asset, assetResponse);
    }));
    return true;
  } catch (_) {
    return false;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(STATIC_ASSETS.map(async (asset) => {
        const response = await fetch(asset, { cache: 'reload' });
        if (response && response.ok) await cache.put(asset, response);
      }));
      await cache.put('/offline.html', new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
      await Promise.allSettled(PRECACHE_NEXT_STATIC.map(async (asset) => {
        const response = await fetch(asset, { cache: 'reload' });
        if (response && response.ok) await cache.put(asset, response);
      }));
      await cacheAppShell(cache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
  })());
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
        .then((response) => response)
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(event.request)) || (await cache.match(url.pathname)) || (await cache.match(APP_SHELL_URL)) || (await cache.match('/offline.html')) || new Response(OFFLINE_HTML, {
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

  event.respondWith(fetch(event.request).catch(async () => (await caches.match(event.request)) || (await caches.match(url.pathname)) || Response.error()));
});
