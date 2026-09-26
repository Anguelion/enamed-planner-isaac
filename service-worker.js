const CACHE_NAME = 'soqueromed-shell-v345';
const APP_SHELL = [
  './',
  './manifest.webmanifest',
  './assets/auth-shell.css?v=20260926-6',
  './assets/app-loader.js?v=20260926-6',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-32.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./')))
    );
    return;
  }

  const networkFirst = url.pathname.includes('/question_bank/')
    || url.pathname.endsWith('/assets/app-loader.js')
    || url.pathname.endsWith('/assets/auth-shell.css')
    || url.pathname.endsWith('/assets/planner.js')
    || url.pathname.endsWith('/assets/anatomia.js')
    || url.pathname.endsWith('/assets/anatomia.css')
    || url.pathname.endsWith('/assets/planner-refresh.css')
    || url.pathname.endsWith('/assets/mascote-ia.css')
    || url.pathname.endsWith('/assets/anatomia/catalog.json')
    || url.pathname.endsWith('/assets/anatomia/search-index.json')
    || url.pathname.endsWith('/assets/caso-do-dia.js')
    || url.pathname.endsWith('/assets/consulta-doencas.js')
    || url.pathname.endsWith('/assets/consulta-clinica.js')
    || url.pathname.endsWith('/assets/ecg-simulator.js')
    || url.pathname.endsWith('/assets/radiografia.js')
    || url.pathname.endsWith('/assets/semiologia.js')
    || url.pathname.endsWith('/assets/semiologia-aulas.js')
    || url.pathname.endsWith('/assets/gamification.js')
    || url.pathname.endsWith('/assets/planner.css')
    || url.pathname.endsWith('/assets/mascote-ia.js')
    || url.pathname.endsWith('/assets/dr-sotero.png')
    || url.pathname.includes('/video_library/')
    || url.pathname.includes('/data/');
  if (networkFirst) {
    event.respondWith(
      fetch(request, { cache:'no-store' })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match(request, { ignoreSearch:true })))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const refresh = fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || refresh;
    })
  );
});






