// Service Worker for loczb PWA
// 版本号规则：修改内容后更新此版本号（格式：loczb-YYYYMMDD-N）
// 每次部署有实质性变更时递增 N，重大改版更新日期
// 查看更新日志：https://github.com/zzdbilly/loczb/commits
const SW_VERSION = '20260821-1705';
const CACHE_NAME = 'loczb-' + SW_VERSION;

// Core pages to cache on install
const CORE_URLS = [
  '/',
  '/blog/',
  '/projects/',
  '/about/',
  '/assets/css/style.css',
  '/assets/js/main.js',
  '/assets/js/search.js',
  '/assets/js/particles.js',
  '/assets/js/time-progress.js',
  '/assets/vendor/highlight/highlight.min.js',
  '/assets/vendor/fuse/fuse.min.js',
  '/assets/vendor/marked/marked.min.js',
  '/assets/vendor/dompurify/purify.min.js'
];

// Install: cache core pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external requests (fonts, analytics, etc.)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache when offline (ignore search params like ?v=...)
        return caches.match(event.request, { ignoreSearch: true }).then((cached) => {
          return cached || new Response('离线不可用', { status: 503 });
        });
      })
  );
});