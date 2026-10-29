// Kursor web remote service worker
//
// Strategy (v3):
//  - Navigated documents (index.html): NETWORK-FIRST so a new server bundle is
//    always picked up (the old cache-first rule made installed PWAs show a
//    stale UI forever).
//  - Hashed build assets (/assets/index-*.js|css): CACHE-FIRST - their names
//    change on every build, so they are immutable and safe to cache forever.
//  - Icons/manifest/favicon: stale-while-revalidate.
const CACHE_NAME = 'kursor-v3';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // WebSocket and API requests pass directly to the server
  if (url.pathname === '/ws' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Hashed, immutable build assets: cache-first (names change per build)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Navigations & app shell: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Update the cache in the background with the fresh copy
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(
          (cached) => cached || (url.pathname === '/' || url.pathname.startsWith('/index')
            ? caches.match('/index.html')
            : undefined)
        )
      )
  );
});
