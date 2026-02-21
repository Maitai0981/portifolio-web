import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";

const swPath = path.join(process.cwd(), "service-worker.js");
const swSource = await readFile(swPath, "utf8");

test("service-worker define caches com versionamento e prefixo", () => {
  assert.match(swSource, /const CACHE_PREFIX = "portfolio-cache-";/);
  assert.match(swSource, /const CACHE_VERSION = "[^"]+";/);
  assert.match(swSource, /const CORE_CACHE_NAME = `\$\{CACHE_PREFIX\}core-\$\{CACHE_VERSION\}`;/);
  assert.match(swSource, /const RUNTIME_CACHE_NAME = `\$\{CACHE_PREFIX\}runtime-\$\{CACHE_VERSION\}`;/);
});

test("service-worker registra eventos essenciais", () => {
  assert.match(swSource, /self\.addEventListener\("install"/);
  assert.match(swSource, /self\.addEventListener\("activate"/);
  assert.match(swSource, /self\.addEventListener\("fetch"/);
  assert.match(swSource, /self\.addEventListener\("message"/);
});

test("service-worker usa estratégias de cache esperadas", () => {
  assert.match(swSource, /async function staleWhileRevalidate/);
  assert.match(swSource, /async function networkFirst/);
  assert.match(swSource, /fallbackToIndex/);
  assert.match(swSource, /await caches\.match\("\.\/index\.html"\)/);
});

test("precache inclui arquivos críticos de inicialização", () => {
  const requiredAssets = [
    "./index.html",
    "./styles.css",
    "./styles/components.css",
    "./main.js",
    "./data.json",
    "./manifest.webmanifest",
    "./modules/commandSearch.js"
  ];
  requiredAssets.forEach((asset) => {
    assert.match(swSource, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
});
