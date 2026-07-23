/*
 * BTIX temporary service worker.
 *
 * This file intentionally caches only same-origin application shell files.
 * Firebase, WhatsApp, Cloudinary, CDN, and other remote services
 * requests remain network-managed and are not intercepted by this worker.
 */

const CACHE_PREFIX = 'btix-';
const CACHE_NAME = 'btix-manual-v1';

const APP_SHELL = [
  './',
  './index.html',
  './site.webmanifest',
  './favicon.ico',
  './assets/css/beetix.bundle.css',
  './assets/js/head-errors.js',
  './assets/js/tailwind-config.js',
  './assets/js/loading-overlay.js',
  './assets/js/runtime-base.js',
  './assets/js/report-pdf-overrides.js',
  './assets/js/buyer-report-overrides.js',
  './assets/js/compat-stubs.js',
  './assets/js/payment-deposit-overrides.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(APP_SHELL.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(async () =>
          (await caches.match('./index.html')) ||
          (await caches.match('./')) ||
          Response.error()
        )
    );
    return;
  }

  const isStaticAsset =
    requestUrl.pathname.includes('/assets/') ||
    requestUrl.pathname.endsWith('/site.webmanifest') ||
    requestUrl.pathname.endsWith('/favicon.ico');

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const networkResponse = fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cachedResponse || Response.error());

      return cachedResponse || networkResponse;
    })
  );
});
