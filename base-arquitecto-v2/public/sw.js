self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
  e.waitUntil(caches.keys().then((k) => Promise.all(k.map((c) => caches.delete(c)))));
});
