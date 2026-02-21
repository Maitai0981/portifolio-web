function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizedBurst(rawBurst, now) {
  return {
    x: normalizeNumber(rawBurst?.x, 0),
    y: normalizeNumber(rawBurst?.y, 0),
    radius: clamp(normalizeNumber(rawBurst?.radius, 3), 1, 16),
    power: clamp(normalizeNumber(rawBurst?.power, 1), 0.2, 1.5),
    ttlMs: clamp(normalizeNumber(rawBurst?.ttlMs, 220), 40, 1200),
    createdAt: normalizeNumber(rawBurst?.createdAt, now)
  };
}

export const DOOM_FIRE_PALETTE = Object.freeze([
  [7, 7, 7],
  [31, 7, 7],
  [47, 15, 7],
  [71, 15, 7],
  [87, 23, 7],
  [103, 31, 7],
  [119, 31, 7],
  [143, 39, 7],
  [159, 47, 7],
  [175, 63, 7],
  [191, 71, 7],
  [199, 71, 7],
  [223, 79, 7],
  [223, 87, 7],
  [223, 87, 7],
  [215, 95, 7],
  [215, 95, 7],
  [215, 103, 15],
  [207, 111, 15],
  [207, 119, 15],
  [207, 127, 15],
  [207, 135, 23],
  [199, 135, 23],
  [199, 143, 23],
  [199, 151, 31],
  [191, 159, 31],
  [191, 159, 31],
  [191, 167, 39],
  [191, 167, 39],
  [191, 175, 47],
  [183, 175, 47],
  [183, 183, 47],
  [183, 183, 55],
  [207, 207, 111],
  [223, 223, 159],
  [239, 239, 199],
  [255, 255, 255]
]);

export function createFireTelemetryState() {
  return {
    frameCount: 0,
    fps: 0,
    avgFrameMs: 0,
    maxFrameMs: 0,
    minFrameMs: 0,
    slowFrames: 0,
    burstsActive: 0,
    burstsTotal: 0,
    lastBurstAt: 0,
    recommendTier: "high",
    tierCooldownUntil: 0,
    sampleFrames: 0,
    sampleSlowFrames: 0,
    lastUpdatedAt: 0
  };
}

export function getFireColumnWidth(preset, qualityConfig) {
  return Math.max(
    8,
    Math.round((Number(preset?.columnWidth) || 12) * (normalizeNumber(qualityConfig?.columnScale, 1) || 1))
  );
}

function resampleHeatGrid(previousHeat, oldCols, oldRows, nextCols, nextRows) {
  const next = Array.from({ length: nextCols * nextRows }, () => 0);
  if (!Array.isArray(previousHeat) || previousHeat.length !== oldCols * oldRows) {
    return next;
  }
  for (let y = 0; y < nextRows; y += 1) {
    const sourceY = clamp(Math.floor((y / Math.max(1, nextRows - 1)) * Math.max(0, oldRows - 1)), 0, oldRows - 1);
    for (let x = 0; x < nextCols; x += 1) {
      const sourceX = clamp(
        Math.floor((x / Math.max(1, nextCols - 1)) * Math.max(0, oldCols - 1)),
        0,
        oldCols - 1
      );
      next[y * nextCols + x] = Math.max(0, Number(previousHeat[sourceY * oldCols + sourceX]) || 0);
    }
  }
  return next;
}

function resampleSourceLine(previousSource, oldCols, nextCols, levels) {
  const fallbackValue = Math.max(1, Math.round(levels * 0.56));
  const next = Array.from({ length: nextCols }, () => fallbackValue);
  if (!Array.isArray(previousSource) || previousSource.length !== oldCols) {
    return next;
  }
  for (let x = 0; x < nextCols; x += 1) {
    const sourceX = clamp(
      Math.floor((x / Math.max(1, nextCols - 1)) * Math.max(0, oldCols - 1)),
      0,
      oldCols - 1
    );
    next[x] = clamp(Number(previousSource[sourceX]) || fallbackValue, 0, levels - 1);
  }
  return next;
}

function rescaleBursts(previousBursts, oldCols, oldRows, nextCols, nextRows) {
  if (!Array.isArray(previousBursts) || previousBursts.length === 0) return [];
  const scaleX = nextCols / Math.max(1, oldCols);
  const scaleY = nextRows / Math.max(1, oldRows);
  return previousBursts.map((burst) => ({
    ...burst,
    x: clamp(Math.round(normalizeNumber(burst?.x, 0) * scaleX), 0, Math.max(0, nextCols - 1)),
    y: clamp(Math.round(normalizeNumber(burst?.y, 0) * scaleY), 0, Math.max(0, nextRows - 1)),
    radius: clamp(Math.round(normalizeNumber(burst?.radius, 1) * ((scaleX + scaleY) * 0.5)), 1, 16)
  }));
}

export function ensureFireGrid(matrixState, width, height, columnWidth) {
  const cols = Math.max(1, Math.floor(width / Math.max(1, columnWidth)));
  const rows = Math.max(1, Math.floor(height / Math.max(1, columnWidth)));
  const expectedSize = cols * rows;
  const previousCols = Math.max(0, Number(matrixState.fireCols) || 0);
  const previousRows = Math.max(0, Number(matrixState.fireRows) || 0);
  const previousHeat = Array.isArray(matrixState.fireHeat) ? matrixState.fireHeat : [];
  const previousBursts = Array.isArray(matrixState.fireBursts) ? matrixState.fireBursts : [];
  const previousSource = Array.isArray(matrixState.fireSource) ? matrixState.fireSource : [];
  if (
    previousCols !== cols ||
    previousRows !== rows ||
    !Array.isArray(matrixState.fireHeat) ||
    matrixState.fireHeat.length !== expectedSize
  ) {
    matrixState.fireCols = cols;
    matrixState.fireRows = rows;
    matrixState.fireHeat =
      previousCols > 0 && previousRows > 0
        ? resampleHeatGrid(previousHeat, previousCols, previousRows, cols, rows)
        : Array.from({ length: expectedSize }, () => 0);
    matrixState.fireBursts =
      previousCols > 0 && previousRows > 0
        ? rescaleBursts(previousBursts, previousCols, previousRows, cols, rows)
        : [];
    matrixState.fireSource = resampleSourceLine(
      previousSource,
      Math.max(1, previousCols),
      cols,
      DOOM_FIRE_PALETTE.length
    );
  }
}

export function queueFireBurst(matrixState, rawBurst, now = 0, maxBursts = 12) {
  if (!Array.isArray(matrixState.fireBursts)) {
    matrixState.fireBursts = [];
  }
  const burst = normalizedBurst(rawBurst, now);
  matrixState.fireBursts.push(burst);
  if (matrixState.fireBursts.length > maxBursts) {
    matrixState.fireBursts.splice(0, matrixState.fireBursts.length - maxBursts);
  }
  if (!matrixState.fireTelemetry || typeof matrixState.fireTelemetry !== "object") {
    matrixState.fireTelemetry = createFireTelemetryState();
  }
  matrixState.fireTelemetry.burstsTotal = Math.max(0, Number(matrixState.fireTelemetry.burstsTotal) || 0) + 1;
  matrixState.fireTelemetry.lastBurstAt = now;
}

function applySingleFireBurst(heat, cols, rows, levels, burst, now) {
  const ageMs = Math.max(0, now - normalizeNumber(burst.createdAt, now));
  const ttlMs = Math.max(1, normalizeNumber(burst.ttlMs, 1));
  if (ageMs >= ttlMs) return false;

  const life = 1 - ageMs / ttlMs;
  const radius = Math.max(1, Math.round(normalizeNumber(burst.radius, 1) * life));
  const cx = clamp(Math.round(normalizeNumber(burst.x, 0)), 0, cols - 1);
  const cy = clamp(Math.round(normalizeNumber(burst.y, 0)), 0, rows - 1);
  const power = clamp(normalizeNumber(burst.power, 1), 0.2, 1.5);

  for (let y = Math.max(0, cy - radius); y <= Math.min(rows - 1, cy + radius); y += 1) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(cols - 1, cx + radius); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > radius) continue;
      const influence = (1 - distance / Math.max(1, radius)) * life * power;
      if (influence <= 0) continue;
      const target = Math.round((levels - 1) * influence);
      const index = y * cols + x;
      if (target > heat[index]) {
        heat[index] = target;
      }
    }
  }

  return true;
}

function applyFireBursts(matrixState, heat, cols, rows, levels, now) {
  if (!Array.isArray(matrixState.fireBursts) || matrixState.fireBursts.length === 0) return;
  const nextBursts = [];
  matrixState.fireBursts.forEach((burst) => {
    const stillActive = applySingleFireBurst(heat, cols, rows, levels, burst, now);
    if (stillActive) nextBursts.push(burst);
  });
  matrixState.fireBursts = nextBursts;
}

export function updateFireTelemetry(telemetryInput, { frameMs, now, burstsActive = 0, reducedMotion = false } = {}) {
  const telemetry =
    telemetryInput && typeof telemetryInput === "object" ? telemetryInput : createFireTelemetryState();
  const safeFrameMs = clamp(normalizeNumber(frameMs, 16.67), 4, 120);

  telemetry.frameCount = Math.max(0, Number(telemetry.frameCount) || 0) + 1;
  telemetry.avgFrameMs = telemetry.avgFrameMs
    ? telemetry.avgFrameMs * 0.88 + safeFrameMs * 0.12
    : safeFrameMs;
  telemetry.fps = Math.round(1000 / Math.max(1, telemetry.avgFrameMs));
  telemetry.maxFrameMs = telemetry.maxFrameMs
    ? Math.max(telemetry.maxFrameMs, safeFrameMs)
    : safeFrameMs;
  telemetry.minFrameMs = telemetry.minFrameMs
    ? Math.min(telemetry.minFrameMs, safeFrameMs)
    : safeFrameMs;
  telemetry.burstsActive = Math.max(0, Number(burstsActive) || 0);
  telemetry.sampleFrames = Math.max(0, Number(telemetry.sampleFrames) || 0) + 1;
  if (safeFrameMs > 28) {
    telemetry.slowFrames = Math.max(0, Number(telemetry.slowFrames) || 0) + 1;
    telemetry.sampleSlowFrames = Math.max(0, Number(telemetry.sampleSlowFrames) || 0) + 1;
  }

  if (telemetry.sampleFrames >= 24) {
    const slowRatio = telemetry.sampleSlowFrames / Math.max(1, telemetry.sampleFrames);
    const avgFrame = Number(telemetry.avgFrameMs) || safeFrameMs;
    const fps = Number(telemetry.fps) || 0;
    if (reducedMotion) {
      telemetry.recommendTier = "low";
    } else if (avgFrame > 27 || fps < 30 || slowRatio > 0.28) {
      telemetry.recommendTier = "low";
    } else if (avgFrame > 20 || fps < 44 || slowRatio > 0.12) {
      telemetry.recommendTier = "medium";
    } else {
      telemetry.recommendTier = "high";
    }
    telemetry.sampleFrames = 0;
    telemetry.sampleSlowFrames = 0;
  }

  if (Number.isFinite(now) && now > 0) {
    telemetry.lastUpdatedAt = now;
  }
  return telemetry;
}

function normalizeTier(value, fallback = "high") {
  const tier = String(value || fallback).toLowerCase();
  if (tier === "low" || tier === "medium" || tier === "high") return tier;
  return fallback;
}

function tierRank(tier) {
  if (tier === "low") return 0;
  if (tier === "medium") return 1;
  return 2;
}

export function resolveFirePerformanceTier({
  telemetry,
  currentTier = "high",
  reducedMotion = false,
  now = 0
} = {}) {
  if (reducedMotion) {
    telemetry.tierCooldownUntil = now + 1600;
    return "low";
  }

  const current = normalizeTier(currentTier, "high");
  const fps = Number(telemetry?.fps) || 0;
  const avgFrame = Number(telemetry?.avgFrameMs) || 16.67;
  let target = normalizeTier(telemetry?.recommendTier, current);
  if (avgFrame > 32 || fps < 24) {
    target = "low";
  } else if (avgFrame > 22 || fps < 38) {
    target = target === "low" ? "low" : "medium";
  }
  const cooldownUntil = Number(telemetry?.tierCooldownUntil) || 0;
  if (now < cooldownUntil) {
    return current;
  }
  if (target !== current) {
    const upgrade = tierRank(target) > tierRank(current);
    telemetry.tierCooldownUntil = now + (upgrade ? 2800 : 900);
  }
  return target;
}

function ensureFireSource(matrixState, cols, levels, reducedMotion, now) {
  if (!Array.isArray(matrixState.fireSource) || matrixState.fireSource.length !== cols) {
    const base = Math.max(2, Math.round(levels * 0.56));
    matrixState.fireSource = Array.from({ length: cols }, () => base + (Math.random() - 0.5) * 0.8);
  }
  const swayBase = Math.sin(now * 0.00055) * (reducedMotion ? 0.12 : 0.22);
  matrixState.fireWind = clamp((Number(matrixState.fireWind) || 0) * 0.95 + swayBase * 0.05, -0.65, 0.65);

  const smoothing = reducedMotion ? 0.95 : 0.9;
  const sparkChance = reducedMotion ? 0.008 : 0.022;
  const turbulenceScale = reducedMotion ? 0.45 : 1.05;
  const baseHeat = Math.max(2, Math.round(levels * 0.56));
  for (let x = 0; x < cols; x += 1) {
    const wave = Math.sin(now * 0.0017 + x * 0.19) * 0.45;
    const turbulence = (Math.random() - 0.5) * turbulenceScale;
    const sparkBoost = Math.random() < sparkChance ? 0.8 + Math.random() * 1.6 : 0;
    const target = clamp(baseHeat + wave + turbulence + sparkBoost, 0.6, levels - 2);
    const current = Number(matrixState.fireSource[x]) || target;
    matrixState.fireSource[x] = current * smoothing + target * (1 - smoothing);
  }
  return matrixState.fireSource;
}

export function runDoomFireFrame({
  matrixState,
  ctx,
  now,
  dt,
  motionFactor,
  width,
  height,
  preset,
  qualityConfig,
  reducedMotion = false
}) {
  const requestedCell = Number(matrixState?.fireCellSize) || getFireColumnWidth(preset, qualityConfig);
  const columnWidth = Math.max(8, Math.round(requestedCell));
  matrixState.fireCellSize = columnWidth;
  ensureFireGrid(matrixState, width, height, columnWidth);

  const cols = matrixState.fireCols;
  const rows = matrixState.fireRows;
  const levels = DOOM_FIRE_PALETTE.length;
  const decayMax = Math.max(2, Math.min(5, Number(preset.fireDecayMax) || 3));
  const cell = columnWidth;

  let heat = matrixState.fireHeat;
  ctx.fillStyle = preset.trail;
  ctx.fillRect(0, 0, width, height);
  ctx.shadowBlur = reducedMotion ? 0 : Number(qualityConfig?.shadowBlur ?? 8);
  ctx.shadowColor = preset.glow;

  const bottomRow = rows - 1;
  const source = ensureFireSource(matrixState, cols, levels, reducedMotion, now);
  for (let x = 0; x < cols; x += 1) {
    const idx = bottomRow * cols + x;
    const targetHeat = clamp(Math.round(Number(source[x]) || Math.round(levels * 0.56)), 0, levels - 1);
    const currentHeat = Number(heat[idx]) || 0;
    heat[idx] = currentHeat * 0.35 + targetHeat * 0.65;
  }

  applyFireBursts(matrixState, heat, cols, rows, levels, now);

  const spreadLoops = reducedMotion ? 1 : Math.min(3, Math.max(1, Math.round(dt * motionFactor)));
  for (let loop = 0; loop < spreadLoops; loop += 1) {
    const nextHeat = Array.from({ length: heat.length }, () => 0);
    for (let y = 0; y < rows - 1; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const belowIndex = (y + 1) * cols + x;
        const sourceHeat = heat[belowIndex];
        if (sourceHeat <= 0) {
          continue;
        }
        const decay = Math.floor(Math.random() * decayMax);
        const windShift = Math.round((Number(matrixState.fireWind) || 0) + (Math.random() - 0.5) * 0.5);
        const dstX = clamp(x - decay + 1 + windShift, 0, cols - 1);
        const propagated = Math.max(0, sourceHeat - decay);
        const dstIndex = y * cols + dstX;
        nextHeat[dstIndex] = Math.max(nextHeat[dstIndex] || 0, propagated);
      }
    }
    for (let x = 0; x < cols; x += 1) {
      const idx = bottomRow * cols + x;
      nextHeat[idx] = Math.max(nextHeat[idx] || 0, heat[idx]);
    }
    heat = nextHeat;
  }
  matrixState.fireHeat = heat;

  const stride = Math.max(1, Number(qualityConfig?.drawStride) || 1);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += stride) {
      const level = heat[y * cols + x];
      if (level <= 0) continue;
      const colorIndex = clamp(Math.round(level), 0, levels - 1);
      const ratio = colorIndex / Math.max(1, levels - 1);
      const [baseR, baseG, baseB] = DOOM_FIRE_PALETTE[colorIndex];
      const flicker = Math.sin(now * 0.02 + x * 0.21 + y * 0.11) * 6;
      const red = clamp(Math.round(baseR + flicker), 0, 255);
      const green = clamp(Math.round(baseG + flicker * 0.4), 0, 255);
      const blue = clamp(Math.round(baseB + flicker * 0.2), 0, 255);
      const alpha = 0.08 + ratio * 0.62;
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
      ctx.fillRect(
        x * cell,
        y * cell,
        Math.max(1, cell * stride + 0.35),
        Math.max(1, cell + 0.35)
      );
    }
  }
  ctx.shadowBlur = 0;

  const telemetry = updateFireTelemetry(matrixState.fireTelemetry, {
    frameMs: dt * 16.67,
    now,
    burstsActive: Array.isArray(matrixState.fireBursts) ? matrixState.fireBursts.length : 0,
    reducedMotion
  });
  matrixState.fireTelemetry = telemetry;
  return telemetry;
}

export function getFireTelemetrySnapshot(matrixState, tier) {
  const telemetry =
    matrixState?.fireTelemetry && typeof matrixState.fireTelemetry === "object"
      ? matrixState.fireTelemetry
      : createFireTelemetryState();
  return {
    fps: Number(telemetry.fps) || 0,
    avgFrameMs: Number(telemetry.avgFrameMs) || 0,
    slowFrames: Number(telemetry.slowFrames) || 0,
    burstsActive: Number(telemetry.burstsActive) || 0,
    burstsTotal: Number(telemetry.burstsTotal) || 0,
    recommendTier: String(telemetry.recommendTier || "high"),
    tier: String(tier || "high")
  };
}
