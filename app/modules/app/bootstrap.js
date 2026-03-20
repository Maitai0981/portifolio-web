import { createPortfolioDependencies, createPortfolioRuntime } from "./runtime/index.js";

export function initPortfolioApp(runtimeOptions = {}) {
  const dependencies = createPortfolioDependencies(runtimeOptions.dependencies);
  const runtime = createPortfolioRuntime({
    dependencies,
    runtimeOptions,
    env: window
  });
  runtime.start();
  return runtime;
}
