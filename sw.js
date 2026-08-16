// ============================================================================
//  sw.js  —  service worker
//  Goal: install as an app icon + stay usable, but ALWAYS pick up the latest
//  version you push to your repo (silent auto-update).
//
//  Strategy: NETWORK-FIRST for app files (so updates arrive immediately),
//  falling back to cache only when offline. Bump CACHE_VERSION anytime you
//  want to force-clear old caches (optional — network-first already updates).
// ============================================================================
const CACHE_VERSION = 'maa-bhajan-v1';
const APP_SHELL = [
  './', './index.html', './app.js', './styles.css',
  './firebase-config.js', './config.json', './manifest.json', './icon.svg'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();               // activate new version right away
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(APP_SHELL).catch(()=>{})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Don't touch YouTube / Firebase / cross-origin — let them go straight to network.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
