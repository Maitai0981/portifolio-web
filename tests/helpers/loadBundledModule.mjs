import path from "node:path";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import { createRequire } from "node:module";

const TEST_HELPERS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_HELPERS_DIR, "../..");
const require = createRequire(import.meta.url);
const { build } = require(path.join(ROOT, "config/node_modules/esbuild"));

export async function loadBundledModule(entryRelativePath, target = "es2022") {
  const directPath = path.join(ROOT, entryRelativePath);
  const appPath = path.join(ROOT, "app", entryRelativePath);
  const appPathExists = await stat(appPath).then(() => true).catch(() => false);
  const entryPoint = appPathExists ? appPath : directPath;
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: "node",
    format: "esm",
    target,
    write: false
  });
  const code = result.outputFiles[0].text;
  const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  return import(dataUrl);
}
