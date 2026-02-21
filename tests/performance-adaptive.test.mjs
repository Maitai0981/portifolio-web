import test from "node:test";
import assert from "node:assert/strict";
import { loadBundledModule } from "./helpers/loadBundledModule.mjs";

const typing = await loadBundledModule("modules/features/terminal/typing.js");
const matrixAdaptive = await loadBundledModule("modules/features/effects/matrixAdaptive.js");
const doomFire = await loadBundledModule("modules/features/effects/doomFire.js");

test("shouldTypeLinesByVolume ativa tipagem para lotes grandes", () => {
  const shortLines = ["a", "b", "c"];
  const manyLines = Array.from({ length: 10 }, (_, i) => `line-${i}`);
  const longLines = ["x".repeat(500)];

  assert.equal(typing.shouldTypeLinesByVolume(shortLines), false);
  assert.equal(typing.shouldTypeLinesByVolume(manyLines), true);
  assert.equal(typing.shouldTypeLinesByVolume(longLines), true);
});

test("getTypingRenderProfile ajusta chunk e tick conforme velocidade e motion", () => {
  const fast = typing.getTypingRenderProfile({ lineLength: 240, speed: 18, reducedMotion: false });
  const slow = typing.getTypingRenderProfile({ lineLength: 240, speed: 2, reducedMotion: false });
  const reduced = typing.getTypingRenderProfile({ lineLength: 240, speed: 18, reducedMotion: true });

  assert.equal(fast.speed, 18);
  assert.equal(fast.chunk > slow.chunk, true);
  assert.equal(fast.tickMs <= slow.tickMs, true);
  assert.equal(reduced.tickMs, 10);
});

test("updateMatrixPerformanceState reduz tier sob dt alto ou reduced motion", () => {
  const high = matrixAdaptive.updateMatrixPerformanceState({ smoothedDt: 1 }, 0.9, false);
  const medium = matrixAdaptive.updateMatrixPerformanceState({ smoothedDt: 1.3 }, 1.4, false);
  const low = matrixAdaptive.updateMatrixPerformanceState({ smoothedDt: 1.7 }, 1.9, false);
  const reduced = matrixAdaptive.updateMatrixPerformanceState({ smoothedDt: 1 }, 0.9, true);

  assert.equal(high.performanceTier, "high");
  assert.equal(medium.performanceTier, "medium");
  assert.equal(low.performanceTier, "low");
  assert.equal(reduced.performanceTier, "low");
});

test("getMatrixQualityConfig e shouldRenderMatrixFrame aplicam throttling esperado", () => {
  const high = matrixAdaptive.getMatrixQualityConfig("high", false, "hacker");
  const lowFire = matrixAdaptive.getMatrixQualityConfig("low", false, "fire");

  assert.equal(high.drawStride, 1);
  assert.equal(high.frameIntervalMs <= 20, true);
  assert.equal(lowFire.drawStride >= 2, true);
  assert.equal(lowFire.frameIntervalMs >= 44, true);

  assert.equal(matrixAdaptive.shouldRenderMatrixFrame(100, 0, 16), true);
  assert.equal(matrixAdaptive.shouldRenderMatrixFrame(100, 96, 16), false);
  assert.equal(matrixAdaptive.shouldRenderMatrixFrame(120, 96, 16), true);
});

test("doom fire queue e burst alteram telemetria e propagacao", () => {
  const matrixState = {
    fireCols: 0,
    fireRows: 0,
    fireHeat: [],
    fireBursts: [],
    fireTelemetry: doomFire.createFireTelemetryState()
  };

  doomFire.ensureFireGrid(matrixState, 320, 180, 12);
  const beforeTotal = matrixState.fireTelemetry.burstsTotal;
  doomFire.queueFireBurst(
    matrixState,
    { x: 4, y: 5, radius: 3, power: 1, ttlMs: 250, createdAt: 1000 },
    1000
  );
  assert.equal(matrixState.fireBursts.length > 0, true);
  assert.equal(matrixState.fireTelemetry.burstsTotal, beforeTotal + 1);
});

test("resolveFirePerformanceTier aplica fallback por telemetria", () => {
  const telemetry = doomFire.createFireTelemetryState();
  telemetry.recommendTier = "low";
  const tierLow = doomFire.resolveFirePerformanceTier({
    telemetry,
    currentTier: "high",
    reducedMotion: false,
    now: 5000
  });
  assert.equal(tierLow, "low");

  const tierReduced = doomFire.resolveFirePerformanceTier({
    telemetry,
    currentTier: "high",
    reducedMotion: true,
    now: 7000
  });
  assert.equal(tierReduced, "low");
});
