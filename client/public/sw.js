const VERSION = "caisse-familiale-pwa-v5";
const APP_CACHE = `${VERSION}-app`;
const ASSET_CACHE = `${VERSION}-assets`;
const BASE_PATH = new URL("./", self.registration.scope).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.add(`${BASE_PATH}index.html`)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function cacheAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    void fetch(request).then((response) => { if (response.ok) void cache.put(request, response.clone()); }).catch(() => undefined);
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) void cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

async function cacheNavigation(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    // Prefer the published shell so hashed assets always match the current release.
    const response = await fetch(request, { cache: "no-cache" });
    if (response.ok) {
      await cache.put(`${BASE_PATH}index.html`, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request) || await cache.match(`${BASE_PATH}index.html`);
    return cached || Response.error();
  }
}
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") { event.respondWith(cacheNavigation(event.request)); return; }
  if (url.pathname.startsWith(`${BASE_PATH}assets/`) || /\/(manifest|icon(?:-maskable)?)\.(json|svg|png)$/.test(url.pathname)) event.respondWith(cacheAsset(event.request));
});
