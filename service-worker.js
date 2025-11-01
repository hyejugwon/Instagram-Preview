const CACHE_NAME = 'insta-preview-v1';
const APP_SHELL = [
  './',
  './index.html',
  './css/index.css',
  './script.js',
  './manifest.json'
  // 아이콘 있으면 추가: './icons/icon-192.png', './icons/icon-512.png'
];

// 설치: 앱셸 캐시
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

// 활성화: 오래된 캐시 정리
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// 요청 가로채기: 캐시 우선, 없으면 네트워크
self.addEventListener('fetch', (e) => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // 이미지/정적 리소스는 런타임 캐시
        if (req.method === 'GET' && res.status === 200 && res.type === 'basic') {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, resClone));
        }
        return res;
      }).catch(() => cached || Response.error());
    })
  );
});
