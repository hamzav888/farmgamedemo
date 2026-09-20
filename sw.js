/* Offline support.
   The game has no network dependencies at all, so caching the shell is enough
   to make it work on a plane, in a car, or on a tablet with the wifi off.
   Bump CACHE when you ship a change, or the old files keep being served. */
const CACHE = 'sunny-barn-farm-v3';

const SHELL = [
  './',
  'index.html',
  'css/style.css',
  'js/util.js',
  'js/audio.js',
  'js/voice.js',
  'js/animals.js',
  'js/scenery.js',
  'js/farm.js',
  'js/barn.js',
  'js/main.js',
  'manifest.webmanifest',
  'icons/favicon-16.png',
  'icons/favicon-32.png',
  'icons/favicon-48.png',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // one bad URL must not sink the whole install
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Network-first for the page itself so a new version is picked up promptly;
  // cache-first for everything else because none of it changes at runtime.
  const isPage = req.mode === 'navigate';
  if (isPage) {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return r;
      }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    }))
  );
});
