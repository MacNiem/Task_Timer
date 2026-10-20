// Service worker: pliki aplikacji z pamięci podręcznej, więc działa bez internetu.
// Przy każdej zmianie plików aplikacji podnieś wersję w CACHE.
const CACHE = 'stoper-v1';
const FILES = [
  './',
  'index.html',
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
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request))
  );
});
