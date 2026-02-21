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
    sampleSlowFrames: 0
  };
}

export function getFireColumnWidth(preset, qualityConfig) {
  return Math.max(
    8,
    Math.round((Number(preset?.columnWidth) || 12) * (normalizeNumber(qualityConfig?.columnScale, 1) || 1))
  );
}

export function ensureFireGrid(matrixState, width, height, columnWidth) {
  const cols = Math.max(1, Math.floor(width / Math.max(1, columnWidth)));
  const rows = Math.max(1, Math.floor(height / Math.max(1, columnWidth)));
  const expectedSize = cols * rows;
  if (
    matrixState.fireCols !== cols ||
    matrixState.fireRows !== rows ||
    !Array.isArray(matrixState.fireHeat) ||
    matrixState.fireHeat.length !== expectedSize
  ) {
    matrixState.fireCols = cols;
    matrixState.fireRows = rows;
    matrixState.fireHeat = Array.from({ length: expectedSize }, () => 0);
    matrixState.fireBursts = [];
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

  if (telemetry.sampleFrames >= 36) {
    const slowRatio = telemetry.sampleSlowFrames / Math.max(1, telemetry.sampleFrames);
    if (reducedMotion) {
      telemetry.recommendTier = "low";
    } else if (telemetry.avgFrameMs > 30 || slowRatio > 0.35) {
      telemetry.recommendTier = "low";
    } else if (telemetry.avgFrameMs > 23 || slowRatio > 0.2) {
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

  const target = String(telemetry?.recommendTier || currentTier || "high");
  const tier = target === "low" || target === "medium" ? target : "high";
  const cooldownUntil = Number(telemetry?.tierCooldownUntil) || 0;
  if (now < cooldownUntil) {
    return currentTier;
  }
  if (tier !== currentTier) {
    telemetry.tierCooldownUntil = now + 1800;
  }
  return tier;
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
  const columnWidth = getFireColumnWidth(preset, qualityConfig);
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
  const burnChance = reducedMotion ? 0.72 : 0.9;
  for (let x = 0; x < cols; x += 1) {
    const idx = bottomRow * cols + x;
    const jitter = Math.random() < burnChance ? 0 : 1;
    heat[idx] = Math.max(0, levels - 1 - jitter);
  }

  applyFireBursts(matrixState, heat, cols, rows, levels, now);

  const spreadLoops = reducedMotion ? 1 : Math.min(3, Math.max(1, Math.round(dt * motionFactor)));
  for (let loop = 0; loop < spreadLoops; loop += 1) {
    const nextHeat = heat.slice();
    for (let y = 0; y < rows - 1; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const belowIndex = (y + 1) * cols + x;
        const source = heat[belowIndex];
        if (source <= 0) {
          nextHeat[y * cols + x] = 0;
          continue;
        }
        const decay = Math.floor(Math.random() * decayMax);
        const dstX = clamp(x - decay + 1, 0, cols - 1);
        nextHeat[y * cols + dstX] = Math.max(0, source - decay);
      }
    }
    heat = nextHeat;
  }
  matrixState.fireHeat = heat;

  const stride = Math.max(1, Number(qualityConfig?.drawStride) || 1);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += stride) {
      const level = heat[y * cols + x];
      if (level <= 0) continue;
      const ratio = level / Math.max(1, levels - 1);
      const [baseR, baseG, baseB] = DOOM_FIRE_PALETTE[Math.min(level, levels - 1)];
      const flicker = Math.sin(now * 0.02 + x * 0.21 + y * 0.11) * 6;
      const red = clamp(Math.round(baseR + flicker), 0, 255);
      const green = clamp(Math.round(baseG + flicker * 0.4), 0, 255);
      const blue = clamp(Math.round(baseB + flicker * 0.2), 0, 255);
      const alpha = 0.2 + ratio * 0.8;
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
