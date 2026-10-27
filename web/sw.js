/* DSH Pocket service worker: cache the app shell, never cache API or proxied DSH data. */
const VERSION = 'dsh-pocket-v1';
const SHELL = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './qrcode.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/health')) return;
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }
  if (SHELL.some((item) => url.pathname.endsWith(item.replace('./', '/')))) {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
      return response;
    }).catch(() => caches.match(request)));
  }
});
