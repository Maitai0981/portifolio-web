function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function updateMatrixPerformanceState(matrixState, dt, reducedMotion) {
  const previous = Number(matrixState?.smoothedDt) || 1;
  const smoothedDt = previous * 0.88 + dt * 0.12;
  let performanceTier = "high";

  if (reducedMotion) {
    performanceTier = "low";
  } else if (smoothedDt > 1.65) {
    performanceTier = "low";
  } else if (smoothedDt > 1.2) {
    performanceTier = "medium";
  }

  return {
    smoothedDt: clamp(smoothedDt, 0.4, 2.4),
    performanceTier
  };
}

export function getMatrixQualityConfig(performanceTier, reducedMotion, theme = "") {
  if (reducedMotion || performanceTier === "low") {
    return {
      frameIntervalMs: theme === "fire" ? 44 : 38,
      columnScale: 1.35,
      drawStride: 2,
      shadowBlur: 0
    };
  }
  if (performanceTier === "medium") {
    return {
      frameIntervalMs: theme === "fire" ? 28 : 24,
      columnScale: 1.15,
      drawStride: 1,
      shadowBlur: 5
    };
  }
  return {
    frameIntervalMs: theme === "fire" ? 20 : 16,
    columnScale: 1,
    drawStride: 1,
    shadowBlur: 8
  };
}

export function shouldRenderMatrixFrame(now, lastRenderAt, frameIntervalMs) {
  if (!lastRenderAt) return true;
  return now - lastRenderAt >= Math.max(10, Number(frameIntervalMs) || 16);
}
