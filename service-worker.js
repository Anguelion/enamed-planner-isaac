const CACHE_NAME = 'soqueromed-shell-v105';
const APP_SHELL = [
  './',
  './manifest.webmanifest',
  './assets/planner.css?v=20260715-56',
  './assets/app-icons.js?v=20260715-1',
  './assets/icons/phosphor-sprite.svg',
  './assets/gamification.js?v=20260715-3',
  './assets/planner.js?v=20260715-82',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/apple-touch-icon.png',
  './question_bank/index.js?v=20260714-5',
  './assets/rpg/element-fire.svg',
  './assets/rpg/element-water.svg',
  './assets/rpg/element-earth.svg',
  './assets/rpg/element-air.svg',
  './assets/rpg/medal-block.svg',
  './assets/rpg/class-crown.svg',
  './assets/rpg/rarity-gem.svg'
  ,'./data/prescription_catalog.json'
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
    || url.pathname.endsWith('/assets/planner.js')
    || url.pathname.endsWith('/assets/gamification.js')
    || url.pathname.endsWith('/assets/planner.css')
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






