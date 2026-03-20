import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const require = createRequire(import.meta.url);
const { transform } = require(path.join(ROOT, "config/node_modules/esbuild"));
const JS_TARGETS = [
  "app/main.js",
  "app/service-worker.js",
  "app/modules",
  "scripts/build.mjs",
  "scripts/lint.mjs",
  "worker"
];

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(filePath, files);
      continue;
    }
    if (/\.(m?js|ts)$/i.test(entry.name)) {
      files.push(filePath);
    }
  }
  return files;
}

async function resolveTargets() {
  const files = [];
  for (const target of JS_TARGETS) {
    const absolute = path.join(ROOT, target);
    const fileStat = await stat(absolute).catch(() => null);
    if (!fileStat) continue;
    if (fileStat.isDirectory()) {
      await walk(absolute, files);
      continue;
    }
    files.push(absolute);
  }
  return files;
}

async function lintJs(filePath) {
  const source = await readFile(filePath, "utf8");
  const ext = path.extname(filePath).toLowerCase();
  const loader = ext === ".ts" ? "ts" : "js";
  await transform(source, {
    loader,
    target: "es2020",
    charset: "utf8",
    sourcemap: false
  });
}

async function lintHtml() {
  const html = await readFile(path.join(ROOT, "app", "index.html"), "utf8");
  const checks = [
    { pattern: /<title>.+<\/title>/i, message: "index.html is missing <title>" },
    {
      pattern: /<meta\s+name="description"\s+content="[^"]+"/i,
      message: "index.html is missing meta description"
    },
    {
      pattern: /<link\s+rel="canonical"\s+href="https:\/\/[^"]+"/i,
      message: "index.html is missing canonical link"
    }
  ];
  const failures = checks.filter((check) => !check.pattern.test(html));
  if (failures.length) {
    throw new Error(failures.map((item) => item.message).join(" | "));
  }
}

async function run() {
  const files = await resolveTargets();
  const failures = [];
  for (const filePath of files) {
    try {
      await lintJs(filePath);
    } catch (error) {
      failures.push(`${path.relative(ROOT, filePath)}: ${error.message}`);
    }
  }

  try {
    await lintHtml();
  } catch (error) {
    failures.push(error.message);
  }

  if (failures.length) {
    console.error("Lint failures:");
    failures.forEach((item) => console.error(`- ${item}`));
    process.exit(1);
  }
  console.log(`Lint OK (${files.length} JS files + index.html checks).`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
