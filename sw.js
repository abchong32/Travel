// TripLedger Service Worker - 支援離線使用
const CACHE_NAME = 'tripledger-v1.2';
const urlsToCache = [
  './',
  './旅遊記帳本_TripLedger.html',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

// 安裝時快取核心資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// 啟動時清理舊快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 攔截請求 - 快取優先，離線可用
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Tesseract worker 檔案特殊處理（讓它正常下載）
  if (url.pathname.includes('tesseract') || url.hostname.includes('tesseract')) {
    return; // 不快取，讓 Tesseract 自己管理
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then((response) => {
          // 只快取 GET 請求
          if (!response || response.status !== 200 || event.request.method !== 'GET') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        }).catch(() => {
          // 離線時返回快取的 HTML
          if (event.request.destination === 'document') {
            return caches.match('./旅遊記帳本_TripLedger.html');
          }
        });
      })
  );
});

// 支援即時更新提示
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});