const CACHE_NAME = "portfolio-cache-v38";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./main.js",
  "./modules/trie.js",
  "./modules/levenshtein.js",
  "./modules/commandSearch.js",
  "./modules/cnnDemo.js",
  "./data.json",
  "./manifest.webmanifest",
  "./assets/sprite.png",
  "./assets/pessoa.png",
  "./assets/midia-social.png",
  "./assets/dev.png",
  "./assets/livros.png",
  "./assets/curriculo.png",
  "./assets/o-email.png",
  "./assets/icon.svg",
  "./assets/algoritmo.png",
  "./assets/snake.png",
  "./assets/icon-cnn.svg",
  "./assets/covers/supasport.svg",
  "./assets/covers/pibic-dermatologia.svg",
  "./assets/covers/cadastro-alunos.svg",
  "./assets/covers/crud-bd-python.svg",
  "./assets/edu/ifam.svg",
  "./assets/edu/sesi-senai.svg",
  "./assets/edu/aloys-joao-mann.svg",
  "./assets/web_model/model.json",
  "./assets/web_model/group1-shard1of1.bin"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
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
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isHtml =
    event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    event.request.headers.get("accept")?.includes("text/html");
  const isJson = url.pathname.endsWith(".json");

  if (isHtml || isJson) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match("./index.html");
  }
}
