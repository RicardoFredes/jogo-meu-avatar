// Service Worker - NO CACHE (always fetch from network)
// Exists only to enable PWA install on tablets

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  // Clear any old caches if they exist
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Always go to network - no caching
  e.respondWith(fetch(e.request));
});
