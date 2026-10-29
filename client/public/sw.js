const VERSION = "caisse-familiale-pwa-v11";
const APP_CACHE = `${VERSION}-app`;
const ASSET_CACHE = `${VERSION}-assets`;
const BASE_PATH = new URL("./", self.registration.scope).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    const shellUrl = `${BASE_PATH}index.html`;
    const shellResponse = await fetch(shellUrl, { cache: "no-store" });
    if (shellResponse.ok) await cache.put(shellUrl, shellResponse.clone());

    const manifestResponse = await fetch(`${BASE_PATH}offline-assets.json?version=${VERSION}`, { cache: "no-store" });
    if (!manifestResponse.ok) return;
    const files = await manifestResponse.json();
    const assets = files
      .filter((file) => typeof file === "string" && !file.startsWith("/") && !file.includes(".."))
      .map((file) => `${BASE_PATH}${file}`);
    await cache.addAll(assets);
  })());
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
  const appCache = await caches.open(APP_CACHE);
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request) || await appCache.match(request);
  if (cached) {
    void fetch(request).then((response) => { if (response.ok) void cache.put(request, response.clone()); }).catch(() => undefined);
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) { void cache.put(request, response.clone()); void appCache.put(request, response.clone()); }
    return response;
  } catch {
    return Response.error();
  }
}

async function cacheNavigation(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    // Version the navigation URL to bypass stale edge-cached HTML on deployment.
    const freshUrl = new URL(request.url);
    freshUrl.searchParams.set("__app_version", `${VERSION}-${Date.now().toString(36)}`);
    const freshRequest = new Request(freshUrl, {
      method: "GET",
      headers: request.headers,
      credentials: "same-origin",
      cache: "no-store",
      redirect: "follow",
    });
    const response = await fetch(freshRequest, { cache: "no-store" });
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
