const CACHE_PREFIX = "caisse-familiale-static-";
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const BASE_PATH = new URL("./", self.registration.scope).pathname;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Never cache navigations: every deployment is visible immediately.
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  const url = new URL(event.request.url);
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith(`${BASE_PATH}assets/`) || url.pathname.endsWith("/manifest.json"));
  if (!isStaticAsset) return;

  // Vite's hashed asset names make these safe to cache between deployments.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});
