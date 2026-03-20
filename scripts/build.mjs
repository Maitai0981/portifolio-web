import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const APP_ROOT = path.join(ROOT, "app");
const DIST = path.join(ROOT, "dist");
const require = createRequire(import.meta.url);
const { transform } = require(path.join(ROOT, "config/node_modules/esbuild"));
const COPY_LIST = [
  ".nojekyll",
  "404.html",
  "assets",
  "data.json",
  "index.html",
  "me-inspector.html",
  "main.js",
  "manifest.webmanifest",
  "modules",
  "robots.txt",
  "service-worker.js",
  "sitemap.xml",
  "styles",
  "styles.css"
];

function getBuildVersion() {
  const fromEnv = String(process.env.BUILD_VERSION || "").trim();
  if (fromEnv) return fromEnv;
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}-${pad(
    now.getUTCHours()
  )}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

async function safeCopy(relativePath) {
  const source = path.join(APP_ROOT, relativePath);
  const destination = path.join(DIST, relativePath);
  await cp(source, destination, { recursive: true });
}

async function walkFiles(directory, files = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(absolute, files);
      continue;
    }
    files.push(absolute);
  }
  return files;
}

async function minifyFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const loader = ext === ".css" ? "css" : ext === ".js" ? "js" : null;
  if (!loader) return;

  const code = await readFile(filePath, "utf8");
  const result = await transform(code, {
    loader,
    minify: true,
    legalComments: "none",
    target: loader === "js" ? "es2020" : undefined
  });
  await writeFile(filePath, result.code, "utf8");
}

async function injectBuildVersion(version) {
  const indexPath = path.join(DIST, "index.html");
  const swPath = path.join(DIST, "service-worker.js");

  const indexSource = await readFile(indexPath, "utf8");
  const nextIndex = indexSource
    .replace(/window\.__APP_VERSION__\s*=\s*"[^"]*"/, `window.__APP_VERSION__ = "${version}"`)
    .replace(/(manifest\.webmanifest\?v=)[^"]+/g, `$1${version}`)
    .replace(/(styles\.css\?v=)[^"]+/g, `$1${version}`)
    .replace(/(main\.js\?v=)[^"]+/g, `$1${version}`);
  await writeFile(indexPath, nextIndex, "utf8");

  const swSource = await readFile(swPath, "utf8");
  const nextSw = swSource.replace(/const CACHE_VERSION = "[^"]+";/, `const CACHE_VERSION = "${version}";`);
  await writeFile(swPath, nextSw, "utf8");
}

async function build() {
  const buildVersion = getBuildVersion();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  for (const item of COPY_LIST) {
    await safeCopy(item);
  }

  await injectBuildVersion(buildVersion);

  const allFiles = await walkFiles(DIST);
  await Promise.all(
    allFiles.map(async (file) => {
      const fileStat = await stat(file);
      if (!fileStat.isFile()) return;
      await minifyFile(file);
    })
  );

  console.log(`Build concluido em ./dist (version: ${buildVersion})`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
