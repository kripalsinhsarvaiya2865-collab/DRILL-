// BMW - Service Worker
// Version badlo (v1 -> v2) jab bhi index.html update karo, taki navi file load thay.
const VERSION = 'bmw-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const LIB_HOSTS = ['cdnjs.cloudflare.com', 'www.gstatic.com']; // jsPDF, Chart.js, Firebase SDK

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firestore / Firebase data calls: kyarey cache nahi karvu (live data)
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('firebaseio.com')) return;

  // App page: pehla network, offline hoy to cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Libraries (CDN) ane potani files: cache-first
  if (url.origin === location.origin || LIB_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});
