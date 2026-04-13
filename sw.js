// Service Worker
//
// Caching strategy:
//   • HTML (navigations) → network-first, so a fresh deploy is picked up
//     on the very next page load. Falls back to cache when offline.
//   • Everything else same-origin (CSS, JS, JSON data, /assets/*) →
//     cache-first, because those files never change inside a single
//     deploy. Cross-origin requests (CDN scripts, Google Fonts) are
//     left untouched so the browser's HTTP cache handles them.
//
// Cache invalidation:
//   CACHE_VERSION is a placeholder replaced at deploy time by the GitHub
//   Actions workflow (see .github/workflows/static.yml) with the short
//   commit SHA. Every deploy gets a new cache name, and `activate` wipes
//   any cache whose name doesn't match the current version — so old
//   assets are reclaimed instead of growing forever.
//
//   During local development the literal placeholder is kept. Service
//   worker registration is skipped on localhost (see js/main.js), so
//   the unresolved placeholder never reaches a running SW in dev.
const CACHE_VERSION = '__CACHE_VERSION__';
const CACHE_NAME = `lauren-fashion-${CACHE_VERSION}`;

self.addEventListener('install', (e) => {
  // Take over as soon as install finishes instead of waiting for every
  // other tab to close. Paired with clients.claim() in activate this
  // guarantees a deploy becomes active on the next navigation.
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Only GET is cacheable. Anything else (rare here) goes straight to network.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Let the browser handle cross-origin requests (CDN, fonts) on its
  // own — caching them here would trigger CORS headaches and we gain
  // nothing since the HTTP cache already covers them.
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML: we WANT new deploys to surface immediately.
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(networkFirst(req));
    return;
  }

  // Cache-first for all other same-origin GETs (CSS, JS, data, assets).
  e.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const resp = await fetch(req);
    // Only cache successful, same-origin, basic responses. Avoids
    // caching opaque/error responses that would serve broken assets later.
    if (resp && resp.ok && resp.type === 'basic') {
      cache.put(req, resp.clone());
    }
    return resp;
  } catch {
    return new Response('', { status: 408 });
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const resp = await fetch(req);
    if (resp && resp.ok && resp.type === 'basic') {
      cache.put(req, resp.clone());
    }
    return resp;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response(
      '<h1>Offline</h1><p>Reconecte e recarregue.</p>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
