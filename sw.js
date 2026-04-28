const CACHE = 'meniere-v1';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css',
  '/js/app.js',
  '/js/i18n.js',
  '/js/store.js',
  '/js/stats.js',
  '/js/router.js',
  '/js/home.js',
  '/js/log.js',
  '/js/history.js',
  '/js/doctor.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Remove old caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Cache-first: serve from cache, fall back to network
  e.respondWith(
    caches.match(e.request).then(cached => cached ?? fetch(e.request))
  );
});
