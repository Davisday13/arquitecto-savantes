// Savantix — Service Worker MÍNIMO
// Solo existe para que la app sea instalable como PWA.
// NO cacheamos NADA. Todo va al network siempre.

self.addEventListener('install', (event) => {
  // Activar inmediatamente sin esperar
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Tomar control de todas las pestañas inmediatamente
  event.waitUntil(self.clients.claim());

  // Limpiar TODOS los caches viejos
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
});

// NO interceptar fetches — dejar que todo vaya directo a la red
// Esto evita cualquier problema de cache stale
