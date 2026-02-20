const CACHE_PREFIX = "portfolio-cache-";
const CACHE_VERSION = "2026-02-20-14";
const CORE_CACHE_NAME = `${CACHE_PREFIX}core-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `${CACHE_PREFIX}runtime-${CACHE_VERSION}`;
const RUNTIME_MAX_ENTRIES = 80;

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./404.html",
  "./styles.css",
  "./main.js",
  "./modules/trie.js",
  "./modules/levenshtein.js",
  "./modules/commandSearch.js",
  "./modules/cnnDemo.js",
  "./modules/algorithmViewer.js",
  "./modules/snakeGame.js",
  "./data.json",
  "./manifest.webmanifest",
  "./robots.txt",
  "./sitemap.xml",
  "./assets/sprite_94.webp",
  "./assets/icons8.png",
  "./assets/term.png",
  "./assets/icon-cnn.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX))
          .filter((key) => key !== CORE_CACHE_NAME && key !== RUNTIME_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation =
    event.request.mode === "navigate" || event.request.destination === "document";
  const isDataLike =
    url.pathname.endsWith(".json") ||
    url.pathname.includes("/assets/web_model/") ||
    url.pathname.includes("/assets/covers/");
  const isStaticAsset = /\.(css|js|mjs|png|jpg|jpeg|svg|ico|webp|avif|woff2?)$/i.test(
    url.pathname
  );

  if (isNavigation) {
    event.respondWith(networkFirst(event.request, CORE_CACHE_NAME, { fallbackToIndex: true }));
    return;
  }

  if (isDataLike) {
    event.respondWith(networkFirst(event.request, RUNTIME_CACHE_NAME));
    return;
  }

  if (isStaticAsset) {
    event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE_NAME));
  }
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then(async (response) => {
    if (response && response.ok) {
      await cache.put(request, response.clone());
      await pruneCache(cache, RUNTIME_MAX_ENTRIES);
    }
    return response;
  });

  if (cached) {
    networkPromise.catch(() => null);
    return cached;
  }
  return networkPromise;
}

async function networkFirst(request, cacheName, options = {}) {
  const { fallbackToIndex = false } = options;
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
      await pruneCache(cache, RUNTIME_MAX_ENTRIES);
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackToIndex) {
      const indexFallback = await caches.match("./index.html");
      if (indexFallback) return indexFallback;
    }
    throw error;
  }
}

async function pruneCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const overflow = keys.length - maxEntries;
  for (let i = 0; i < overflow; i += 1) {
    await cache.delete(keys[i]);
  }
}
