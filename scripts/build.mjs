import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { transform } from "esbuild";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const COPY_LIST = [
  ".nojekyll",
  "404.html",
  "assets",
  "data.json",
  "index.html",
  "main.js",
  "manifest.webmanifest",
  "modules",
  "robots.txt",
  "service-worker.js",
  "sitemap.xml",
  "styles.css"
];

async function safeCopy(relativePath) {
  const source = path.join(ROOT, relativePath);
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

async function build() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  for (const item of COPY_LIST) {
    await safeCopy(item);
  }

  const allFiles = await walkFiles(DIST);
  await Promise.all(
    allFiles.map(async (file) => {
      const fileStat = await stat(file);
      if (!fileStat.isFile()) return;
      await minifyFile(file);
    })
  );

  console.log("Build concluido em ./dist");
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
