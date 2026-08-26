const CACHE_NAME = 'soqueromed-shell-v328';
const APP_SHELL = [
  './',
  './manifest.webmanifest',
  './assets/planner.css?v=20260826-7',
  './assets/anatomia.css?v=20260802-8',
  './assets/planner-refresh.css?v=20260818-22',
  './assets/mascote-ia.css?v=20260802-7',
  './assets/app-icons.js?v=20260802-1',
  './assets/icons/phosphor-sprite.svg',
  './assets/gamification.js?v=20260715-4',
  './assets/planner-ux.js?v=20260825-1',
  './assets/skill-highlighter.js?v=20260802-3',
  './assets/anatomia.js?v=20260802-6',
  './assets/anatomia/catalog.json',
  './assets/anatomia/search-index.json',
  './assets/ecg-simulator.js?v=20260802-10',
  './assets/radiografia-aulas.js?v=20260802-3',
  './assets/radiografia.js?v=20260802-11',
  './assets/semiologia-aulas.js?v=20260802-3',
  './assets/semiologia.js?v=20260802-9',
  './assets/caso-do-dia.js?v=20260826-1',
  './assets/planner.js?v=20260826-10',
  './assets/mascote-ia.js?v=20260802-10',
  './health-news/data/latest.json',
  './assets/dr-sotero.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-32.png',
  './question_bank/index.js?v=20260812172501',
  './assets/rpg/element-fire.svg',
  './assets/rpg/element-water.svg',
  './assets/rpg/element-earth.svg',
  './assets/rpg/element-air.svg',
  './assets/rpg/medal-block.svg',
  './assets/rpg/class-crown.svg',
  './assets/rpg/rarity-gem.svg'
  ,'./assets/rpg/classes/aldeao.png'
  ,'./assets/rpg/classes/aprendiz.png'
  ,'./assets/rpg/classes/escudeiro.png'
  ,'./assets/rpg/classes/soldado.png'
  ,'./assets/rpg/classes/cavaleiro.png'
  ,'./assets/rpg/classes/capitao.png'
  ,'./assets/rpg/classes/barao.png'
  ,'./assets/rpg/classes/duque.png'
  ,'./assets/rpg/classes/rei.png'
  ,'./assets/rpg/classes/imperador.png'
  ,'./data/prescription_catalog.json'
  ,'./assets/ecg-real/eletrodos-1.jpg'
  ,'./assets/ecg-real/eletrodos-2.jpg'
  ,'./assets/ecg-real/eixo-1.jpg'
  ,'./assets/ecg-real/eixo-2.jpg'
  ,'./assets/ecg-real/eixo-3.jpg'
  ,'./assets/ecg-real/calibracao-1.jpg'
  ,'./assets/ecg-real/calibracao-2.jpg'
  ,'./assets/ecg-real/calibracao-3.jpg'
  ,'./assets/ecg-real/ritmo-1.jpg'
  ,'./assets/ecg-real/ritmo-2.jpg'
  ,'./assets/ecg-real/ritmo-3.jpg'
  ,'./assets/ecg-real/ritmo-4.jpg'
  ,'./assets/ecg-real/frequencia-1.jpg'
  ,'./assets/ecg-real/frequencia-2.jpg'
  ,'./assets/ecg-real/frequencia-2-zoom.jpg'
  ,'./assets/ecg-real/normal-1.jpg'
  ,'./assets/ecg-real/normal-2.jpg'
  ,'./assets/ecg-real/normal-3.jpg'
  ,'./assets/ecg-real/bradi-1.jpg'
  ,'./assets/ecg-real/taqui-1.jpg'
  ,'./assets/ecg-real/afib-mod1-1.jpg'
  ,'./assets/ecg-real/afib-mod1-2.jpg'
  ,'./assets/ecg-real/flutter-1.jpg'
  ,'./assets/ecg-real/flutter-2.jpg'
  ,'./assets/ecg-real/svt-1.jpg'
  ,'./assets/ecg-real/svt-2.jpg'
  ,'./assets/ecg-real/pvc-1.jpg'
  ,'./assets/ecg-real/pvc-2.jpg'
  ,'./assets/ecg-real/pvc-3.jpg'
  ,'./assets/ecg-real/vt-1.jpg'
  ,'./assets/ecg-real/vt-2.jpg'
  ,'./assets/ecg-real/vt-3.jpg'
  ,'./assets/ecg-real/vf-1.jpg'
  ,'./assets/ecg-real/vf-2.jpg'
  ,'./assets/ecg-real/vf-3.jpg'
  ,'./assets/ecg-real/avb1-1.jpg'
  ,'./assets/ecg-real/avb1-2.jpg'
  ,'./assets/ecg-real/mobitz2-real-1.jpg'
  ,'./assets/ecg-real/mobitz2-real-2.jpg'
  ,'./assets/ecg-real/mobitz2-real-3.jpg'
  ,'./assets/ecg-real/bav21-1.jpg'
  ,'./assets/ecg-real/bav21-2.jpg'
  ,'./assets/ecg-real/bav21-3.jpg'
  ,'./assets/ecg-real/bavt-1.jpg'
  ,'./assets/ecg-real/bavt-2.jpg'
  ,'./assets/ecg-real/bavt-3.jpg'
  ,'./assets/ecg-real/bavt-4.jpg'
  ,'./assets/ecg-real/bavt-5.jpg'
  ,'./assets/ecg-real/rbbb-1.jpg'
  ,'./assets/ecg-real/rbbb-2.jpg'
  ,'./assets/ecg-real/rbbb-3.jpg'
  ,'./assets/ecg-real/rbbb-4.jpg'
  ,'./assets/ecg-real/rbbb-5.jpg'
  ,'./assets/ecg-real/lbbb-1.jpg'
  ,'./assets/ecg-real/lbbb-2.jpg'
  ,'./assets/ecg-real/lbbb-3.jpg'
  ,'./assets/ecg-real/lbbb-4.jpg'
  ,'./assets/ecg-real/lbbb-5.jpg'
  ,'./assets/ecg-real/lbbb-sgarbossa-1.jpg'
  ,'./assets/ecg-real/lbbb-sgarbossa-2.jpg'
  ,'./assets/ecg-real/lvh-1.jpg'
  ,'./assets/ecg-real/lvh-2.jpg'
  ,'./assets/ecg-real/lvh-3.jpg'
  ,'./assets/ecg-real/lvh-4.jpg'
  ,'./assets/ecg-real/lvh-5.jpg'
  ,'./assets/ecg-real/lvh-6.jpg'
  ,'./assets/ecg-real/lvh-7.jpg'
  ,'./assets/ecg-real/wpw-1.jpg'
  ,'./assets/ecg-real/wpw-2.jpg'
  ,'./assets/ecg-real/stemi-inf-1.jpg'
  ,'./assets/ecg-real/stemi-inf-2.jpg'
  ,'./assets/ecg-real/stemi-inf-3.jpg'
  ,'./assets/ecg-real/stemi-inf-4.jpg'
  ,'./assets/ecg-real/stemi-inf-5.jpg'
  ,'./assets/ecg-real/stemi-inf-6.jpg'
  ,'./assets/ecg-real/stemi-inf-7.jpg'
  ,'./assets/ecg-real/stemi-ant-1.jpg'
  ,'./assets/ecg-real/stemi-ant-2.jpg'
  ,'./assets/ecg-real/stemi-ant-3.jpg'
  ,'./assets/ecg-real/stemi-ant-4.jpg'
  ,'./assets/ecg-real/stemi-ant-5.jpg'
  ,'./assets/ecg-real/stemi-ant-6.jpg'
  ,'./assets/ecg-real/pericarditis-1.jpg'
  ,'./assets/ecg-real/hyperk-1.jpg'
  ,'./assets/ecg-real/hyperk-2.jpg'
  ,'./assets/ecg-real/hyperk-3.jpg'
  ,'./assets/ecg-real/torsades-1.jpg'
  ,'./assets/ecg-real/torsades-2.jpg'
  ,'./assets/ecg-real/torsades-3.jpg'
  ,'./assets/ecg-real/mobitz1-1.jpg'
  ,'./assets/ecg-real/mobitz1-2.jpg'
  ,'./assets/ecg-real/mobitz1-3.jpg'
  ,'./assets/ecg-real/tep-1.jpg'
  ,'./assets/ecg-real/low-voltage-calib-1.jpg'
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
    || url.pathname.endsWith('/assets/anatomia.js')
    || url.pathname.endsWith('/assets/anatomia.css')
    || url.pathname.endsWith('/assets/planner-refresh.css')
    || url.pathname.endsWith('/assets/mascote-ia.css')
    || url.pathname.endsWith('/assets/anatomia/catalog.json')
    || url.pathname.endsWith('/assets/anatomia/search-index.json')
    || url.pathname.endsWith('/assets/caso-do-dia.js')
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






