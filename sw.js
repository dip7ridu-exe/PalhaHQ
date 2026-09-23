const CACHE_NAME = "palhaghq-v7-mobile-zoom";
const CORE_FILES = [
  "./",
  "./index.html",
  "./styles.css?v=7-mobile-zoom",
  "./app.js?v=7-mobile-zoom",
  "./library.js?v=7-mobile-zoom",
  "./catalog.js?v=7-mobile-zoom",
  "./favicon.svg",
  "./manifest.webmanifest",
  "./vendor/pdfjs/pdf.mjs",
  "./vendor/pdfjs/pdf.worker.mjs",
  "./vendor/unarchiver/unarchiver.min.js",
  "./vendor/unarchiver/lib/jszip.min.js",
  "./vendor/unarchiver/lib/libunrar.min.js",
  "./vendor/unarchiver/lib/libunrar.js.mem",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const updateCache = async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(event.request, response.clone());
    }
    return response;
  };

  const networkFirst = event.request.mode === "navigate"
    || ["script", "style", "document"].includes(event.request.destination);

  if (networkFirst) {
    event.respondWith(
      fetch(event.request)
        .then(updateCache)
        .catch(async () => (await caches.match(event.request)) || caches.match("./index.html")),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then(updateCache)),
  );
});
