export const THEMES = ["dark", "light", "hacker", "retro", "fire"];

export const THEME_CLASSES = [
  "theme-dark",
  "theme-light",
  "theme-hacker",
  "theme-retro",
  "theme-fire",
  "theme-secret"
];

export const ASCII_THEME_PRESETS = Object.freeze({
  hacker: {
    chars: "01<>[]{}#$%&*+-=|/\\",
    color: "#58ffad",
    colorAlt: "#9fffd2",
    trail: "rgba(2, 10, 6, 0.2)",
    glow: "rgba(88, 255, 173, 0.32)",
    fontSize: 13,
    columnWidth: 14,
    baseSpeed: 0.7,
    speedVariance: 1.05,
    resetChance: 0.976
  },
  secret: {
    chars: "░▒▓◇◆✧✦⟡⊹0123456789ABCDEF",
    color: "#82f0ff",
    colorAlt: "#ff8af6",
    trail: "rgba(7, 4, 18, 0.24)",
    glow: "rgba(255, 138, 246, 0.24)",
    fontSize: 13,
    columnWidth: 14,
    baseSpeed: 0.5,
    speedVariance: 0.9,
    resetChance: 0.982
  },
  fire: {
    chars: " .,:;irsXA253hMHGS#9B&@",
    color: "#ffb347",
    colorAlt: "#ffde8a",
    trail: "rgba(14, 4, 1, 0.3)",
    glow: "rgba(255, 132, 38, 0.38)",
    fontSize: 13,
    columnWidth: 12,
    baseSpeed: 0.3,
    speedVariance: 0.45,
    resetChance: 0.96,
    fireLevels: 24,
    fireDecayMax: 3
  }
});

export const THEME_COLOR_MAP = Object.freeze({
  dark: "#0b0d10",
  light: "#f5f6f8",
  hacker: "#020b06",
  retro: "#190f0a",
  fire: "#180703",
  secret: "#05030f"
});

export function getAsciiThemePreset(theme = "hacker") {
  return ASCII_THEME_PRESETS[theme] || ASCII_THEME_PRESETS.hacker;
}

export function isAsciiThemeEnabled(theme = "") {
  return theme === "hacker" || theme === "secret" || theme === "fire";
}
