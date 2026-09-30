const CACHE_NAME = "hem-smartdisiplin-shell-v8";
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const path = value => `${BASE}${value}` || "/";
const APP_SHELL = [path("/"), path("/manifest.webmanifest"), path("/pwa-icon-192.png"), path("/pwa-icon-512.png"), path("/apple-touch-icon.png"), path("/kpm-cutout.png"), path("/sk-ranggu-cutout.png")];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith(path("/api/"))) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      void caches.open(CACHE_NAME).then(cache => cache.put(path("/"), copy));
      return response;
    }).catch(() => caches.match(path("/"))));
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && ["style", "script", "image", "font"].includes(request.destination)) {
      const copy = response.clone();
      void caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  })));
});
