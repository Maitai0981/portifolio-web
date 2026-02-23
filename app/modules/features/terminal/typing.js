function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function shouldTypeLinesByVolume(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return false;
  const totalChars = lines.reduce((sum, line) => sum + String(line || "").length, 0);
  return lines.length >= 8 || totalChars >= 420;
}

export function getTypingRenderProfile({
  lineLength = 0,
  speed = 12,
  reducedMotion = false
} = {}) {
  const normalizedSpeed = clamp(Math.round(Number(speed) || 12), 1, 18);
  const speedRatio = normalizedSpeed / 18;
  const baseChunk = lineLength >= 320 ? 9 : lineLength >= 180 ? 7 : lineLength >= 90 ? 5 : 4;
  const chunk = Math.max(4, Math.round(baseChunk + speedRatio * 14));
  const tickMs = reducedMotion ? 10 : clamp(8 - Math.round(speedRatio * 5), 3, 8);
  return { chunk, tickMs, speed: normalizedSpeed };
}
