const CACHE_PREFIX = "portfolio-cache-";
const CACHE_NAME = `${CACHE_PREFIX}2026-02-20-01`;
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
  "./data.json",
  "./manifest.webmanifest",
  "./robots.txt",
  "./sitemap.xml",
  "./assets/sprite.png",
  "./assets/sprite_94.webp",
  "./assets/icons8.png",
  "./assets/Matheus.webp",
  "./assets/term.png",
  "./assets/icon-cnn.svg",
  "./assets/covers/supasport.svg",
  "./assets/covers/pibic-dermatologia.svg",
  "./assets/covers/cadastro-alunos.svg",
  "./assets/covers/crud-bd-python.svg",
  "./assets/edu/ifam.png",
  "./assets/edu/sesi-senai.png",
  "./assets/edu/aloys-joao-mann.webp",
  "./assets/web_model/model.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
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
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
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
  const isJson = url.pathname.endsWith(".json");
  const isStaticAsset = /\.(css|js|mjs|png|jpg|jpeg|svg|ico|webp|avif|woff2?)$/i.test(
    url.pathname
  );

  if (isNavigation || isJson) {
    event.respondWith(networkFirst(event.request, { fallbackToIndex: isNavigation }));
    return;
  }

  if (isStaticAsset) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((response) => {
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  if (cached) {
    networkPromise.catch(() => null);
    return cached;
  }

  return networkPromise;
}

async function networkFirst(request, options = {}) {
  const { fallbackToIndex = false } = options;
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackToIndex) {
      const indexFallback = await cache.match("./index.html");
      if (indexFallback) return indexFallback;
    }
    throw error;
  }
}
