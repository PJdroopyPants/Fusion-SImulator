/* Cache-first service worker: precaches the whole exhibit so the hosted version keeps working
   with no network once it has been visited (the folder copy needs nothing). When releasing,
   bump CACHE_VERSION together with APP_VERSION in script.js so clients pick up the new files. */
const CACHE_VERSION = "fusion-sim-v1.1.0";
const ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "script.js",
  "icon.svg",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png",
  "og-card.jpg",
  "Fusion-Lab-Worksheet.html",
  "Fusion-Lab-Instructor-Key.html",
  "Fusion-Facilitator-Guide.html"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first with background refresh: instant offline loads, updates picked up on the next visit.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== location.origin) return;   // let the browser handle cross-origin
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const refresh = fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            const key = new URL(e.request.url);
            key.search = "";   // one cache entry per asset, however the visitor arrived
            caches.open(CACHE_VERSION).then((c) => c.put(key.href, copy));
          }
          return res;
        })
        .catch(() => hit || Response.error());   // never resolve respondWith with undefined
      return hit || refresh;
    })
  );
});
