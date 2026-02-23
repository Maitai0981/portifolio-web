import { startLegacyPortfolioRuntime } from "./legacyRuntime.js";

export function createPortfolioDependencies(overrides = {}) {
  return Object.freeze({
    startLegacyPortfolioRuntime,
    now: () => Date.now(),
    ...overrides
  });
}
