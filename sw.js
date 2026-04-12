// Service Worker - NO CACHE, network only
// Falls back gracefully if network fails

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => {
      // If network fails, return a simple offline response
      if (e.request.mode === 'navigate') {
        return new Response('<h1>Offline</h1><p>Reconecte e recarregue.</p>', {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      return new Response('', { status: 408 });
    })
  );
});
