import path from "node:path";
import { build } from "esbuild";

export async function loadBundledModule(entryRelativePath, target = "es2022") {
  const entryPoint = path.join(process.cwd(), entryRelativePath);
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
