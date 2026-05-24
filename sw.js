const CACHE = 'meniere-v24';
const SHELL = [
  '/',
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
  '/js/weather.js',
  '/js/pressure-strip.js',
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
  // Network-first for navigation so HTML updates land immediately
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')));
    return;
  }
  // Cache-first for static assets (JS, CSS, icons)
  e.respondWith(
    caches.match(e.request).then(cached => cached ?? fetch(e.request))
  );
});
