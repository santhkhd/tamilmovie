const CACHE_NAME = "tamil-cinematic-v1";
const APP_SHELL = [
  "./",
  "index.html",
  "details.html",
  "favorites.html",
  "css/styles.css",
  "js/dataStore.js",
  "js/app.js",
  "js/details.js",
  "js/favorites.js",
  "imdb_tamil_movies_with_cast.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== location.origin) return;

  if (event.request.destination === "image") {
    event.respondWith(imageStrategy(event.request));
  } else {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return response;
          })
      )
    );
  }
});

const imageStrategy = async (request) => {
  const cache = await caches.open(`${CACHE_NAME}-images`);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
};

