/* Offline support.
   The game has no network dependencies at all, so caching the shell is enough
   to make it work on a plane, in a car, or on a tablet with the wifi off.
   Bump CACHE when you ship a change, or the old files keep being served. */
const CACHE = 'sunny-barn-farm-v7';

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
  'js/mini.js',
  'minigames/',
  'minigames/index.html',
  'minigames/mg.css',
  'minigames/mg-art.js',
  'minigames/mg-hub.js',
  'minigames/mg-core.js',
  'minigames/games/veggie-patch.js',
  'minigames/games/tractor-ride.js',
  'minigames/games/runaway-piglets.js',
  'minigames/games/hide-seek.js',
  'minigames/games/star-animals.js',
  'minigames/games/farm-band.js',
  'minigames/games/pig-bath.js',
  'manifest.webmanifest',
  'voice/manifest.json',
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
  // Network-first for EVERYTHING, cache only as the offline fallback.
  // Cache-first assets once combined a fresh index.html with stale scripts on
  // the first load after a deploy; the game is tiny and sits on a CDN, so
  // fetching fresh costs nothing and every load is a consistent version.
  e.respondWith(
    fetch(req).then(r => {
      if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
