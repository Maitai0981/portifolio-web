function normalizeStartupMode(value) {
  return String(value || "").toLowerCase() === "cli" ? "cli" : "gui";
}

export function createRuntimeContext(runtimeOptions = {}, env = globalThis) {
  const appVersion = String(runtimeOptions.appVersion || env?.__APP_VERSION__ || "dev");
  const startupMode = normalizeStartupMode(runtimeOptions.startupMode);
  const startedAt = Number(runtimeOptions.startedAt || Date.now());

  return Object.freeze({
    appVersion,
    startupMode,
    startedAt
  });
}

export function createPortfolioRuntime({ dependencies, runtimeOptions = {}, env = globalThis } = {}) {
  if (!dependencies || typeof dependencies.startLegacyPortfolioRuntime !== "function") {
    throw new Error("createPortfolioRuntime: dependencies.startLegacyPortfolioRuntime is required");
  }

  const context = createRuntimeContext(runtimeOptions, env);

  function start() {
    return dependencies.startLegacyPortfolioRuntime(context);
  }

  return Object.freeze({
    context,
    start
  });
}
