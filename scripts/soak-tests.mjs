import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");

const loops = Math.max(1, Number(process.env.SOAK_LOOPS || 30));
const files = [
  path.join(ROOT, "tests/command-search.test.mjs"),
  path.join(ROOT, "tests/worker-api.test.mjs"),
  path.join(ROOT, "tests/performance-adaptive.test.mjs")
];

for (let i = 1; i <= loops; i += 1) {
  process.stdout.write(`[soak] rodada ${i}/${loops}\n`);
  const run = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
  if (run.status !== 0) {
    process.stderr.write(`[soak] falha encontrada na rodada ${i}.\n`);
    process.exit(run.status ?? 1);
  }
}

process.stdout.write(`[soak] concluido sem falhas apos ${loops} rodadas.\n`);
