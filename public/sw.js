// Halal Scroll PWA Service Worker
const CACHE_NAME = 'halalscroll-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass-through: allows the browser to handle all live requests natively,
  // preventing stale JS cache corruption or undefined fetch interception errors.
});
