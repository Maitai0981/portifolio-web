export const PET_TIMING = Object.freeze({
  bubbleMs: 1500,
  idleMs: 12000,
  neutralMs: 1500,
  microMinMs: 2400,
  microMaxMs: 5200,
  defaultPersistMs: 1600,
  animationClassMs: 600,
  pointerDeadzonePx: 44
});

export const PET_PERSIST_MS = Object.freeze({
  wake: 1800,
  click: 1200,
  key: 1100,
  command: 1300,
  error: 1800,
  reload: 1600,
  modeSwitch: 1600,
  guiOpen: 1300,
  guiSelect: 1100,
  themeChange: 1700,
  idle: 2600
});

export const PET_REACTION_CLASS_BY_TYPE = Object.freeze({
  click: "anim-pop",
  key: "anim-micro",
  command: "anim-bounce",
  reload: "anim-spin",
  modeGui: "anim-wiggle",
  modeCli: "anim-wiggle",
  wake: "anim-bounce",
  guiIcon: "anim-pop",
  themeChange: "anim-spin",
  error: "anim-shake",
  idle: "anim-pulse"
});

export const PET_REACTION_COOLDOWN_MS = Object.freeze({
  click: 120,
  key: 90,
  command: 140,
  error: 140,
  guiIcon: 220
});

export const PET_KEY_BURST_WINDOW_MS = 170;
export const PET_ALWAYS_ACTIVE = true;

export const PET_REACTION_PRIORITY = Object.freeze({
  wake: 100,
  error: 95,
  reload: 90,
  command: 80,
  modeGui: 70,
  modeCli: 70,
  themeChange: 68,
  guiIcon: 62,
  click: 52,
  key: 46,
  idle: 8,
  idleScan: 6,
  idleStretch: 6,
  blink: 5,
  neutral: 1
});

export const PET_QUEUE_MAX = 10;
export const PET_QUEUE_STEP_MS = 84;
