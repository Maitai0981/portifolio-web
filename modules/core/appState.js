export function createAppState({ initialMode = "gui", viewportWidth = 0, viewportHeight = 0 } = {}) {
  return {
    mode: initialMode,
    sessionActive: true,
    commandBusy: false,
    commandQueue: Promise.resolve(),
    history: [],
    historyIndex: -1,
    theme: "dark",
    guiMono: false,
    secretUnlocked: false,
    commandMenuOpen: false,
    commandMenuIndex: 0,
    clockInterval: null,
    language: "pt",
    locale: "pt-BR",
    me: {
      active: false,
      history: [],
      lastProject: null
    },
    pendingWindowCommand: null,
    shell: {
      cwd: "~"
    },
    options: {
      typing: false,
      typingSpeed: 12,
      reducedMotion: false
    },
    content: null,
    matrix: {
      active: false,
      canvas: null,
      ctx: null,
      animationId: null,
      columns: 0,
      drops: [],
      speeds: [],
      offsets: [],
      lastTs: 0,
      fireHeat: [],
      fireCols: 0,
      fireRows: 0,
      width: 0,
      height: 0
    },
    pet: {
      active: false,
      root: null,
      bubble: null,
      art: null,
      hideBubbleTimer: null,
      bubbleVisibleUntil: 0,
      pendingBubble: null,
      idleTimer: null,
      microAnimationTimer: null,
      reactionTimer: null,
      animationTimer: null,
      currentType: "neutral",
      frameIndex: 0,
      frameDirection: 1,
      lastReactionAt: {
        click: 0,
        key: 0,
        command: 0,
        error: 0
      },
      keyBurst: {
        count: 0,
        lastAt: 0
      },
      insight: {
        commandStreak: 0,
        errorStreak: 0,
        lastCommand: "",
        lastDurationMs: 0,
        lastAction: ""
      },
      lookDirection: "center",
      lastPointerX: viewportWidth * 0.5,
      lastPointerY: viewportHeight * 0.5,
      reactionQueue: [],
      reactionQueueSeq: 0,
      reactionQueueTimer: null,
      reactionInFlight: null
    }
  };
}

export function createDomRefs() {
  return {
    terminal: null,
    terminalOutput: null,
    terminalInput: null,
    terminalInputLabel: null,
    prompt: null,
    commandMenu: null,
    commandSearch: null,
    commandSearchLabel: null,
    commandList: null,
    gui: null,
    desktop: null,
    taskbar: null,
    startButton: null,
    startMenu: null,
    taskButtons: null,
    taskbarClock: null,
    taskbarAvailability: null,
    themeColorMeta: null
  };
}
