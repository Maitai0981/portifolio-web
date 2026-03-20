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
  const isFire = theme === "fire";
  if (reducedMotion || performanceTier === "low") {
    return {
      frameIntervalMs: isFire ? 58 : 38,
      columnScale: isFire ? 1.5 : 1.35,
      drawStride: isFire ? 3 : 2,
      shadowBlur: 0
    };
  }
  if (performanceTier === "medium") {
    return {
      frameIntervalMs: isFire ? 36 : 24,
      columnScale: isFire ? 1.25 : 1.15,
      drawStride: isFire ? 2 : 1,
      shadowBlur: isFire ? 3 : 5
    };
  }
  return {
    frameIntervalMs: isFire ? 18 : 16,
    columnScale: 1,
    drawStride: 1,
    shadowBlur: isFire ? 6 : 8
  };
}

export function shouldRenderMatrixFrame(now, lastRenderAt, frameIntervalMs) {
  if (!lastRenderAt) return true;
  return now - lastRenderAt >= Math.max(10, Number(frameIntervalMs) || 16);
}
