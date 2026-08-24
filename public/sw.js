const CACHE = "jay-connect-v2";
const ROOT = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const scoped = (path) => `${ROOT}${path}` || "/";
const SHELL = ["/", "/app/", "/dashboard/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/welgen-leadership.jpeg", "/community-leadership.jpeg"].map(scoped);
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match(scoped("/")))));
});
