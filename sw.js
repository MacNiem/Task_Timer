// Service worker: serves the app files from the cache, so the app works offline.
// The cache is named after the app version (js/version.js) — bump the version whenever the app files change.
// New import URL also recovers installations registered with the old default
// updateViaCache policy. Future checks bypass HTTP caching via registration.
importScripts('js/version.js?worker=network-v2');
// Separate cache revision for the reissued 2.4.3 release: do not write into
// the cache used by an already installed copy of the original 2.4.3.
const CACHE = `task-timer-${self.APP_VERSION}-matte-refresh`;
const FILES = [
  './',
  'index.html',
  'js/version.js',
  'css/app.css',
  'js/store.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'fonts/barlow-latin-400.woff2',
  'fonts/barlow-latin-500.woff2',
  'fonts/barlow-latin-600.woff2',
  'fonts/barlow-latin-ext-400.woff2',
  'fonts/barlow-latin-ext-500.woff2',
  'fonts/barlow-latin-ext-600.woff2',
  'fonts/barlow-condensed-latin-500.woff2',
  'fonts/barlow-condensed-latin-600.woff2',
  'fonts/barlow-condensed-latin-ext-500.woff2',
  'fonts/barlow-condensed-latin-ext-600.woff2'
];

self.addEventListener('install', e => {
  // cache: 'reload' — fetch straight from the network, not from the browser's stale HTTP cache.
  const requests = FILES.map(f => new Request(f, { cache: 'reload' }));
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(requests)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('task-timer-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request))
  );
});
