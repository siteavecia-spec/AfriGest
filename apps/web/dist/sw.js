const CACHE_VERSION = 'v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k !== CACHE_VERSION ? caches.delete(k) : Promise.resolve())))).then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api') || url.pathname.includes(':4000') || url.hostname === 'localhost' && url.port === '4000';
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Bypass non-GET
  if (req.method !== 'GET') return;

  if (isApiRequest(url)) {
    // Network-first for API
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || new Response('', { status: 504, statusText: 'Gateway Timeout (offline)' });
        })
    );
    return;
  }

  // Cache-first for static
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(async () => {
          // Fallback to app shell for navigations; otherwise explicit empty 504
          if (req.mode === 'navigate') {
            const shell = await caches.match('/index.html');
            return shell || new Response('', { status: 504, statusText: 'Offline' });
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        });
    })
  );
});
