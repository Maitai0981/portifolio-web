import {
  buildCommandIndex,
  getPrefixMatches,
  searchCommands,
  suggestCommands
} from "./modules/commandSearch.js";
import { createAppState, createDomRefs } from "./modules/core/appState.js";
import {
  THEMES,
  THEME_CLASSES,
  THEME_COLOR_MAP,
  getAsciiThemePreset,
  isAsciiThemeEnabled
} from "./modules/core/themeConfig.js";
import { GUI_WINDOW_COMMANDS } from "./modules/features/gui/config.js";
import {
  PET_ALWAYS_ACTIVE,
  PET_KEY_BURST_WINDOW_MS,
  PET_PERSIST_MS,
  PET_QUEUE_MAX,
  PET_QUEUE_STEP_MS,
  PET_REACTION_CLASS_BY_TYPE,
  PET_REACTION_COOLDOWN_MS,
  PET_REACTION_PRIORITY,
  PET_TIMING
} from "./modules/features/pet/config.js";
import { PET_ASCII_SPRITE_SHEET } from "./modules/features/pet/spriteSheet.js";
import { COMMANDS, HISTORY_MAX_ITEMS, TERMINAL_MAX_LINES } from "./modules/features/terminal/config.js";
import {
  getTypingRenderProfile,
  shouldTypeLinesByVolume
} from "./modules/features/terminal/typing.js";
import {
  getMatrixQualityConfig,
  shouldRenderMatrixFrame,
  updateMatrixPerformanceState
} from "./modules/features/effects/matrixAdaptive.js";
import {
  createFireTelemetryState,
  ensureFireGrid,
  getFireColumnWidth,
  getFireTelemetrySnapshot,
  queueFireBurst,
  resolveFirePerformanceTier,
  runDoomFireFrame
} from "./modules/features/effects/doomFire.js";

(() => {
  const INITIAL_MODE = "gui";

  const state = createAppState({
    initialMode: INITIAL_MODE,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  });

  const dom = createDomRefs();

  const LINK_REGEX = /((https?:\/\/[^\s]+)|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}))/gi;
  const ANSI_REGEX = /\u001b\[(\d+)m/g;

  const STORAGE_KEYS = Object.freeze({
    lang: "portfolioLang",
    theme: "portfolioTheme",
    mode: "portfolioMode",
    guiMono: "portfolioGuiMono",
    petActive: "portfolioPetActive",
    typingSpeed: "portfolioTypingSpeed",
    reducedMotion: "portfolioReducedMotion"
  });
  const commandIndex = buildCommandIndex(COMMANDS);

  const TRANSITION_MS = 120;
  const APP_VERSION = window.__APP_VERSION__ || "dev";
  const SW_CACHE_PREFIX = "portfolio-cache-";
  const SUPPORTED_LANGS = ["pt", "en"];
  const ME_API_TIMEOUT_MS = 14000;
  const ME_API_ATTEMPT_TIMEOUTS_MS = [5000, 9000, 14000];
  const ME_API_RETRY_LIMIT = 2;
  const ME_API_RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
  const ME_HISTORY_WINDOW = 6;
  const ME_DEBUG_LOG_KEY = "portfolioMeRequestLog";
  const ME_DEBUG_MAX_ITEMS = 120;
  const RAW_ME_API_URL = String(
    window.__ME_API_URL__ || document.querySelector('meta[name="me-api-url"]')?.getAttribute("content") || ""
  ).trim();
  const ME_API_ENDPOINT = RAW_ME_API_URL
    ? (RAW_ME_API_URL.endsWith("/me") ? RAW_ME_API_URL : `${RAW_ME_API_URL.replace(/\/+$/, "")}/me`)
    : "";

  const DEFAULT_I18N = {
    pt: {
      ui: {
        commandMenuTitle: "Menu de comandos",
        commandMenuPlaceholder: "Digite um comando...",
        commandMenuHint: "Enter para executar • Esc para fechar",
        commandMenuAriaLabel: "Menu de comandos",
        terminalInputLabel: "Entrada de comando do terminal",
        commandSearchLabel: "Pesquisar comando",
        startMenuHeader: "Iniciar",
        startButton: "Iniciar",
        desktopAriaLabel: "Atalhos do desktop",
        themeToggleLabel: "Tema",
        themeLight: "Claro",
        themeDark: "Escuro",
        themeMono: "Mono",
        availabilityBadge: "Disponivel para trabalho",
        availabilityCta: "Contato",
        labels: {
          about: "Sobre",
          social: "Social",
          projects: "Projetos",
          education: "Educacao",
          resume: "Curriculo",
          email: "Email",
          terminal: "Terminal",
          algorithms: "Algoritmos",
          cnn: "CNN Demo",
          snake: "Snake"
        },
        windowTitles: {
          about: "Sobre",
          social: "Social",
          projects: "Projetos",
          education: "Educacao",
          resume: "Curriculo",
          email: "Email",
          algorithms: "Visualizador de Algoritmos",
          cnn: "CNN Demo",
          snake: "Snake",
          terminal: "Terminal"
        },
        profileLabel: "Perfil",
        noContent: "Sem conteudo.",
        noProjects: "Nenhum projeto listado.",
        offline: "Offline",
        languageLabels: {
          pt: "Portugues (pt)",
          en: "English (en)"
        },
        modeLabels: {
          cli: "terminal",
          gui: "gui"
        }
      },
      messages: {
        loading: "Carregando portfolio...",
        loadError: "Erro ao carregar conteudo. Usando dados fallback.",
        helpNotFound: "help: nenhum topico corresponde a `{{topic}}`",
        commandNotFound: "Comando nao encontrado: {{command}}",
        sessionEnded: "Sessao encerrada.",
        switchGui: "Alternando para modo grafico...",
        alreadyTerminal: "Voce ja esta no terminal.",
        backToTerminal: "Voltando ao terminal...",
        possibleCommands: "Possiveis comandos: {{commands}}",
        historyEmpty: "Historico vazio.",
        meIntro: [
          "Oi! Sou o Matheus AI, seu guia do portfolio.",
          "Pergunte sobre projetos, tecnologias ou perfil.",
          "Exemplos: me fale sobre SupaSport | me links do PIBIC Dermatologia | me stack do CRUD",
          "Para encerrar a conversa: me exit"
        ],
        meExit: "Conversa encerrada.",
        meHelp: [
          "Use `me <pergunta>` para conversar.",
          "Exemplos: `me fale sobre SupaSport`, `me links do CRUD`, `me stack do PIBIC`."
        ],
        meProfilePrefix: "Sou {{profile}}.",
        meProfileFallback: "Sou o Matheus AI, seu assistente de portfolio.",
        meProfileDetails: "Posso explicar projetos, tecnologias e objetivos.",
        meProjectsNone: "Ainda nao tenho projetos cadastrados.",
        meProjectsIntro: "Aqui estao meus projetos:",
        meNoMatchIntro: "Nao entendi a pergunta. Posso falar sobre:",
        meUnknown: "Nao entendi a pergunta. Pergunte sobre meus projetos ou perfil.",
        meApiUnavailable: "A IA remota nao respondeu. Usei o contexto local.",
        meSourcesLabel: "Fontes",
        meResponseLabel: "Resposta",
        meApiNotConfigured: "IA remota nao configurada. Defina me-api-url no index.html.",
        localTimeLine: "Local em Londrina, Brasil: {{datetime}} {{tz}}",
        projectNoDescription: "Sem descricao.",
        projectNoDetails: "Sem detalhes cadastrados.",
        projectNoStack: "Nao informada.",
        projectNoLessons: "Nao informado.",
        projectLinksLabel: "Links",
        projectStackLabel: "Stack",
        projectLessonsLabel: "Licoes",
        projectDefaultName: "Projeto",
        noProjectsListed: "Nenhum projeto listado.",
        themeCurrent: "Tema atual: {{theme}}",
        themeAvailable: "Disponiveis: {{themes}}",
        themeInvalid: "Tema invalido: {{theme}}",
        themeChanged: "Tema alterado para: {{theme}}",
        themeUsage: "Use: theme {{themes}}",
        typingCurrent: "Velocidade de digitacao atual: {{speed}}",
        typingChanged: "Velocidade de digitacao ajustada para: {{speed}}",
        typingUsage: "Use: typing [1-18]",
        motionStatusReduced: "Reducao de movimento: ativada",
        motionStatusFull: "Reducao de movimento: desativada",
        motionChangedReduced: "Reducao de movimento ativada.",
        motionChangedFull: "Reducao de movimento desativada.",
        motionUsage: "Use: motion [on|off|status]",
        petActivated: "Mascote ativado.",
        petDeactivated: "Mascote ocultado.",
        petAlwaysOn: "Mascote fixo: sempre ativo.",
        petAlreadyActive: "O mascote ja esta ativo.",
        petAlreadyInactive: "O mascote ja esta oculto.",
        petStatusOn: "Mascote: ativo",
        petStatusOff: "Mascote: oculto",
        petUsage: "Use: pet | pet on | pet status",
        searchUsage: "Uso: grep <termo> (ou find <termo>)",
        searchHeader: "Resultados para: {{query}}",
        searchNoResults: "Nenhum resultado encontrado.",
        searchAboutLabel: "Sobre",
        searchProjectsLabel: "Projetos",
        algoHint: "Escolha um algoritmo e acompanhe a execucao.",
        algoSelectLabel: "Selecionar algoritmo",
        algoRandom: "Novo array",
        algoReset: "Resetar",
        algoRun: "Executar",
        algoPause: "Pausar",
        algoStep: "Passo",
        algoBubbleLabel: "Bubble sort",
        algoSelectionLabel: "Selection sort",
        algoMergeLabel: "Merge sort",
        algoQuickLabel: "Quick sort",
        algoHeapLabel: "Heap sort",
        algoDijkstraLabel: "Dijkstra",
        algoStatusReady: "Pronto para iniciar.",
        algoStatusRunning: "Executando...",
        algoStatusDone: "Execucao concluida.",
        snakeHint: "Setas/WASD ou arraste no celular • Espaco para pausar.",
        snakeStart: "Iniciar",
        snakePause: "Pausar",
        snakeRestart: "Reiniciar",
        snakeGameOver: "Fim de jogo.",
        snakeScore: "Pontos: {{score}}",
        cnnHint: "Desenhe um digito no quadro e clique em Prever.",
        cnnExplain:
          "Pipeline: treino em Python, exportacao do modelo e inferencia no navegador com pre-processamento consistente.",
        cnnPreviewLabel: "Preview 28x28",
        cnnClear: "Limpar",
        cnnPredict: "Prever",
        cnnResultLabel: "Predicao",
        cnnLatencyLabel: "Latencia",
        cnnStatusLoading: "Carregando modelo...",
        cnnStatusReady: "Modelo pronto.",
        cnnStatusError: "Erro ao carregar o modelo.",
        cnnStatusNoTf: "TensorFlow.js nao carregado.",
        cnnEmpty: "Desenhe algo antes de prever.",
        neofetch: {
          os: "OS",
          host: "Host",
          kernel: "Kernel",
          shell: "Shell",
          theme: "Tema",
          terminal: "Terminal",
          uptime: "Uptime",
          osValue: "Portfolio Terminal v1.0",
          kernelValue: "JavaScript ES6+",
          shellValue: "Shell custom"
        },
        langUsage: "Use: lang pt | en",
        langInvalid: "Idioma invalido: {{lang}}",
        langChanged: "Idioma alterado para: {{lang}}",
        langCurrent: "Idioma atual: {{lang}}",
        sudoMessages: [
          "sudo: voce realmente achou que tinha permissoes?",
          "sudo: melhor nao.",
          "sudo: acesso negado. tente novamente amanha.",
          "sudo: suas credenciais foram... brincadeira.",
          "sudo: nao ha cafe suficiente para isso."
        ],
        fsCatUsage: "Uso: cat <arquivo>",
        fsNotFound: "Arquivo ou diretorio nao encontrado: {{path}}",
        fsNotDir: "Nao e um diretorio: {{path}}",
        fsIsDir: "E um diretorio: {{path}}",
        fsEmpty: "Pasta vazia.",
        fsCwd: "Diretorio atual: {{path}}",
        a11yMode: "Modo {{mode}} ativado.",
        a11yLang: "Idioma definido para {{lang}}."
      }
    },
    en: {
      ui: {
        commandMenuTitle: "Command menu",
        commandMenuPlaceholder: "Type a command...",
        commandMenuHint: "Enter to run • Esc to close",
        commandMenuAriaLabel: "Command menu",
        terminalInputLabel: "Terminal command input",
        commandSearchLabel: "Search command",
        startMenuHeader: "Start",
        startButton: "Start",
        desktopAriaLabel: "Desktop shortcuts",
        themeToggleLabel: "Theme",
        themeLight: "Light",
        themeDark: "Dark",
        themeMono: "Mono",
        availabilityBadge: "Available for work",
        availabilityCta: "Contact",
        labels: {
          about: "About",
          social: "Social",
          projects: "Projects",
          education: "Education",
          resume: "Resume",
          email: "Email",
          terminal: "Terminal",
          algorithms: "Algorithms",
          cnn: "CNN Demo",
          snake: "Snake"
        },
        windowTitles: {
          about: "About",
          social: "Social",
          projects: "Projects",
          education: "Education",
          resume: "Resume",
          email: "Email",
          algorithms: "Algorithm Visualizer",
          cnn: "CNN Demo",
          snake: "Snake",
          terminal: "Terminal"
        },
        profileLabel: "Profile",
        noContent: "No content.",
        noProjects: "No projects listed.",
        offline: "Offline",
        languageLabels: {
          pt: "Portugues (pt)",
          en: "English (en)"
        },
        modeLabels: {
          cli: "terminal",
          gui: "gui"
        }
      },
      messages: {
        loading: "Loading portfolio...",
        loadError: "Failed to load content. Using fallback data.",
        helpNotFound: "help: no help topics match `{{topic}}`",
        commandNotFound: "Command not found: {{command}}",
        sessionEnded: "Session ended.",
        switchGui: "Switching to GUI mode...",
        alreadyTerminal: "You are already in the terminal.",
        backToTerminal: "Returning to the terminal...",
        possibleCommands: "Possible commands: {{commands}}",
        historyEmpty: "History is empty.",
        meIntro: [
          "Hi! I'm Matheus AI, your portfolio guide.",
          "Ask about projects, technologies, or profile.",
          "Examples: me tell me about SupaSport | me links for PIBIC Dermatologia | me stack for the CRUD",
          "To end the conversation: me exit"
        ],
        meExit: "Conversation ended.",
        meHelp: [
          "Use `me <question>` to chat.",
          "Examples: `me tell me about SupaSport`, `me links for the CRUD`, `me stack for PIBIC`."
        ],
        meProfilePrefix: "I am {{profile}}.",
        meProfileFallback: "I'm Matheus AI, your portfolio assistant.",
        meProfileDetails: "I can explain projects, technologies, and goals.",
        meProjectsNone: "I don't have projects listed yet.",
        meProjectsIntro: "Here are my projects:",
        meNoMatchIntro: "I didn't get the question. I can talk about:",
        meUnknown: "I didn't get the question. Ask about my projects or profile.",
        meApiUnavailable: "Remote AI did not respond. I used local context.",
        meSourcesLabel: "Sources",
        meResponseLabel: "Answer",
        meApiNotConfigured: "Remote AI is not configured. Set me-api-url in index.html.",
        localTimeLine: "Local time in Londrina, Brazil is {{datetime}} {{tz}}",
        projectNoDescription: "No description.",
        projectNoDetails: "No details provided.",
        projectNoStack: "Not provided.",
        projectNoLessons: "Not provided.",
        projectLinksLabel: "Links",
        projectStackLabel: "Stack",
        projectLessonsLabel: "Lessons",
        projectDefaultName: "Project",
        noProjectsListed: "No projects listed.",
        themeCurrent: "Current theme: {{theme}}",
        themeAvailable: "Available: {{themes}}",
        themeInvalid: "Invalid theme: {{theme}}",
        themeChanged: "Theme set to: {{theme}}",
        themeUsage: "Use: theme {{themes}}",
        typingCurrent: "Current typing speed: {{speed}}",
        typingChanged: "Typing speed set to: {{speed}}",
        typingUsage: "Use: typing [1-18]",
        motionStatusReduced: "Reduced motion: enabled",
        motionStatusFull: "Reduced motion: disabled",
        motionChangedReduced: "Reduced motion enabled.",
        motionChangedFull: "Reduced motion disabled.",
        motionUsage: "Use: motion [on|off|status]",
        petActivated: "Mascot activated.",
        petDeactivated: "Mascot hidden.",
        petAlwaysOn: "Mascot is fixed: always active.",
        petAlreadyActive: "Mascot is already active.",
        petAlreadyInactive: "Mascot is already hidden.",
        petStatusOn: "Mascot: active",
        petStatusOff: "Mascot: hidden",
        petUsage: "Use: pet | pet on | pet status",
        searchUsage: "Usage: grep <term> (or find <term>)",
        searchHeader: "Results for: {{query}}",
        searchNoResults: "No results found.",
        searchAboutLabel: "About",
        searchProjectsLabel: "Projects",
        algoHint: "Pick an algorithm and follow the execution.",
        algoSelectLabel: "Select algorithm",
        algoRandom: "New array",
        algoReset: "Reset",
        algoRun: "Run",
        algoPause: "Pause",
        algoStep: "Step",
        algoBubbleLabel: "Bubble sort",
        algoSelectionLabel: "Selection sort",
        algoMergeLabel: "Merge sort",
        algoQuickLabel: "Quick sort",
        algoHeapLabel: "Heap sort",
        algoDijkstraLabel: "Dijkstra",
        algoStatusReady: "Ready to start.",
        algoStatusRunning: "Running...",
        algoStatusDone: "Execution complete.",
        snakeHint: "Arrows/WASD or swipe on mobile • Space to pause.",
        snakeStart: "Start",
        snakePause: "Pause",
        snakeRestart: "Restart",
        snakeGameOver: "Game over.",
        snakeScore: "Score: {{score}}",
        cnnHint: "Draw a digit and click Predict.",
        cnnExplain:
          "Pipeline: training in Python, model export, and browser inference with consistent preprocessing.",
        cnnPreviewLabel: "Preview 28x28",
        cnnClear: "Clear",
        cnnPredict: "Predict",
        cnnResultLabel: "Prediction",
        cnnLatencyLabel: "Latency",
        cnnStatusLoading: "Loading model...",
        cnnStatusReady: "Model ready.",
        cnnStatusError: "Failed to load model.",
        cnnStatusNoTf: "TensorFlow.js not loaded.",
        cnnEmpty: "Draw something before predicting.",
        neofetch: {
          os: "OS",
          host: "Host",
          kernel: "Kernel",
          shell: "Shell",
          theme: "Theme",
          terminal: "Terminal",
          uptime: "Uptime",
          osValue: "Portfolio Terminal v1.0",
          kernelValue: "JavaScript ES6+",
          shellValue: "Custom shell"
        },
        langUsage: "Use: lang pt | en",
        langInvalid: "Invalid language: {{lang}}",
        langChanged: "Language set to: {{lang}}",
        langCurrent: "Current language: {{lang}}",
        sudoMessages: [
          "sudo: nice try, but no permissions.",
          "sudo: nope.",
          "sudo: access denied. maybe tomorrow.",
          "sudo: credentials accepted... just kidding.",
          "sudo: not enough coffee for that."
        ],
        fsCatUsage: "Usage: cat <file>",
        fsNotFound: "File or directory not found: {{path}}",
        fsNotDir: "Not a directory: {{path}}",
        fsIsDir: "Is a directory: {{path}}",
        fsEmpty: "Empty directory.",
        fsCwd: "Current directory: {{path}}",
        a11yMode: "Mode {{mode}} active.",
        a11yLang: "Language set to {{lang}}."
      }
    }
  };

  const audioState = {
    context: null,
    lastTime: 0
  };

  const KONAMI_SEQUENCE = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a"
  ];
  let konamiIndex = 0;

  const windowManager = {
    nextId: 1,
    zIndex: 20,
    windows: new Map(),
    createWindow({ title, lines, commandKey, contentFactory }) {
      const id = this.nextId++;
      const offset = (this.windows.size % 5) * 24;
      const win = document.createElement("div");
      win.className = "window";
      win.style.left = `${60 + offset}px`;
      win.style.top = `${80 + offset}px`;
      win.style.zIndex = this.zIndex++;
      win.dataset.id = id;

      const titleBar = document.createElement("div");
      titleBar.className = "window-titlebar";

      const titleEl = document.createElement("div");
      titleEl.className = "window-title";
      titleEl.textContent = title;

      const controls = document.createElement("div");
      controls.className = "window-controls";

      const minimizeBtn = document.createElement("button");
      minimizeBtn.className = "window-btn";
      minimizeBtn.type = "button";
      minimizeBtn.textContent = "_";

      const closeBtn = document.createElement("button");
      closeBtn.className = "window-btn";
      closeBtn.type = "button";
      closeBtn.textContent = "x";

      controls.append(minimizeBtn, closeBtn);
      titleBar.append(titleEl, controls);

      const content = document.createElement("div");
      content.className = "window-content";
      let contentNode = null;
      let windowMeta = null;
      if (typeof contentFactory === "function") {
        const result = contentFactory();
        if (result) {
          contentNode = result.node || result;
          windowMeta = result.__windowMeta || contentNode.__windowMeta || null;
        }
      } else {
        renderLines(content, lines, { typing: false });
      }
      if (contentNode) {
        content.append(contentNode);
      }

      const resizer = document.createElement("div");
      resizer.className = "window-resizer";

      win.append(titleBar, content, resizer);
      dom.desktop.append(win);

      const taskButton = document.createElement("button");
      taskButton.className = "task-button";
      taskButton.textContent = title;
      taskButton.dataset.id = id;
      dom.taskButtons.append(taskButton);

      const winData = {
        id,
        element: win,
        titleEl,
        contentEl: content,
        taskButton,
        minimized: false,
        commandKey,
        onClose: null,
        onFocus: null
      };
      if (windowMeta?.size) {
        const { width, height } = windowMeta.size;
        if (width) win.style.width = `${width}px`;
        if (height) win.style.height = `${height}px`;
      }
      if (windowMeta?.onClose) {
        winData.onClose = windowMeta.onClose;
      }
      if (windowMeta?.onFocus) {
        winData.onFocus = windowMeta.onFocus;
      }
      this.windows.set(id, winData);

      const focus = () => this.focusWindow(id);
      win.addEventListener("mousedown", focus);
      taskButton.addEventListener("click", () => this.toggleMinimize(id));

      minimizeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        this.toggleMinimize(id, true);
      });

      closeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        this.closeWindow(id);
      });

      this.enableDrag(win, titleBar);
      this.enableResize(win, resizer);
      this.ensureWindowVisible(win);
      this.focusWindow(id);
    },
    focusWindow(id) {
      const winData = this.windows.get(id);
      if (!winData) return;
      winData.element.style.zIndex = this.zIndex++;
      for (const data of this.windows.values()) {
        data.element.classList.toggle("active", data.id === id && !data.minimized);
        data.taskButton.classList.toggle("active", data.id === id && !data.minimized);
      }
      if (winData.onFocus) {
        winData.onFocus();
      }
    },
    toggleMinimize(id, force) {
      const winData = this.windows.get(id);
      if (!winData) return;
      const shouldMinimize = force !== undefined ? force : !winData.minimized;
      winData.minimized = shouldMinimize;
      winData.element.classList.toggle("minimized", shouldMinimize);
      if (shouldMinimize) {
        winData.element.classList.remove("active");
      }
      winData.taskButton.classList.toggle("active", !shouldMinimize);
      if (!shouldMinimize) {
        this.focusWindow(id);
      }
    },
    closeWindow(id) {
      const winData = this.windows.get(id);
      if (!winData) return;
      if (winData.onClose) {
        winData.onClose();
      }
      winData.element.remove();
      winData.taskButton.remove();
      this.windows.delete(id);
    },
    ensureWindowVisible(win) {
      if (!win) return;
      const padding = 8;
      const viewportHeight = getViewportHeight();
      const taskbar = getTaskbarHeight();
      const maxWidth = Math.max(200, window.innerWidth - padding * 2);
      const maxHeight = Math.max(160, viewportHeight - taskbar - padding * 2);

      const rect = win.getBoundingClientRect();
      let nextWidth = rect.width;
      let nextHeight = rect.height;

      if (nextWidth > maxWidth) {
        nextWidth = maxWidth;
        win.style.width = `${nextWidth}px`;
      }
      if (nextHeight > maxHeight) {
        nextHeight = maxHeight;
        win.style.height = `${nextHeight}px`;
      }

      const updatedRect = win.getBoundingClientRect();
      const width = updatedRect.width;
      const height = updatedRect.height;
      const maxLeft = window.innerWidth - width - padding;
      const maxTop = viewportHeight - taskbar - height - padding;
      const nextLeft = Math.min(Math.max(updatedRect.left, padding), maxLeft);
      const nextTop = Math.min(Math.max(updatedRect.top, padding), maxTop);
      win.style.left = `${Math.max(nextLeft, padding)}px`;
      win.style.top = `${Math.max(nextTop, padding)}px`;
    },
    ensureAllVisible() {
      this.windows.forEach((winData) => {
        this.ensureWindowVisible(winData.element);
      });
    },
    enableDrag(win, handle) {
      const manager = this;
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let startLeft = 0;
      let startTop = 0;

      const onMouseMove = (event) => {
        if (!dragging) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        win.style.left = `${startLeft + dx}px`;
        win.style.top = `${startTop + dy}px`;
      };

      const onMouseUp = () => {
        dragging = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        manager.ensureWindowVisible(win);
      };

      handle.addEventListener("mousedown", (event) => {
        if (event.button !== 0) return;
        dragging = true;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = win.offsetLeft;
        startTop = win.offsetTop;
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
    },
    enableResize(win, handle) {
      const manager = this;
      let resizing = false;
      let startX = 0;
      let startY = 0;
      let startWidth = 0;
      let startHeight = 0;

      const onPointerMove = (event) => {
        if (!resizing) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        const minWidth = 260;
        const minHeight = 180;
        const maxWidth = window.innerWidth - 20;
        const maxHeight = getViewportHeight() - getTaskbarHeight() - 20;
        const nextWidth = Math.min(Math.max(startWidth + dx, minWidth), maxWidth);
        const nextHeight = Math.min(Math.max(startHeight + dy, minHeight), maxHeight);
        win.style.width = `${nextWidth}px`;
        win.style.height = `${nextHeight}px`;
      };

      const onPointerUp = (event) => {
        if (!resizing) return;
        resizing = false;
        handle.releasePointerCapture(event.pointerId);
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        manager.ensureWindowVisible(win);
      };

      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        resizing = true;
        startX = event.clientX;
        startY = event.clientY;
        startWidth = win.offsetWidth;
        startHeight = win.offsetHeight;
        handle.setPointerCapture(event.pointerId);
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
      });
    }
  };

  let selectedDesktopIcon = null;
  let errorBannerTimer = null;

  function readStoredValue(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStoredValue(key, value) {
    try {
      localStorage.setItem(key, String(value));
      return true;
    } catch {
      return false;
    }
  }

  function removeStoredValue(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function readStoredJson(key, fallback = null) {
    const raw = readStoredValue(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeStoredJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function truncateDebugText(value, max = 420) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 3))}...`;
  }

  function toPlainText(value) {
    return String(value || "")
      .replace(/\r/g, "")
      .replace(/```[a-zA-Z0-9_-]*\n?/g, "")
      .replace(/```/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1: $2")
      .replace(/^>\s?/gm, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function extractMeAnswerText(payload) {
    const directCandidates = [payload?.answer, payload?.text, payload?.response, payload?.result];
    for (const candidate of directCandidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return toPlainText(candidate);
      }
      if (Array.isArray(candidate)) {
        const joined = candidate.map((item) => String(item || "")).join("\n").trim();
        if (joined) return toPlainText(joined);
      }
    }
    return "";
  }

  function normalizeMeSourceItems(items) {
    if (!Array.isArray(items)) return [];
    const output = [];
    items.slice(0, 8).forEach((item) => {
      if (typeof item === "string") {
        const text = String(item || "").trim();
        if (text) output.push({ name: "", url: "", description: text });
        return;
      }
      const name = String(item?.name || item?.repo || item?.title || "").trim();
      const url = String(item?.url || item?.html_url || "").trim();
      const description = String(item?.description || "").trim();
      if (name || url || description) {
        output.push({ name, url, description });
      }
    });
    return output;
  }

  function normalizeMeApiPayload(payload) {
    const answer = extractMeAnswerText(payload);
    const sources = normalizeMeSourceItems(payload?.sources || payload?.reposUsed || []);
    const schema = String(payload?.meta?.schema || payload?.schema || "unknown");
    return { answer, sources, schema };
  }

  function classifyMeApiError(status, isAbort) {
    if (Number.isFinite(status)) {
      if (status === 429) return "rate_limited";
      if (status >= 500) return "server_error";
      if (status === 401 || status === 403) return "auth_or_cors";
      if (status >= 400) return "client_error";
    }
    if (isAbort) return "timeout_or_abort";
    return "network_or_cors_error";
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function appendMeDebugLog(entry) {
    if (!entry || typeof entry !== "object") return;
    const current = readStoredJson(ME_DEBUG_LOG_KEY, []);
    const list = Array.isArray(current) ? current : [];
    const normalized = {
      id: String(entry.id || `${Date.now()}`),
      timestamp: String(entry.timestamp || new Date().toISOString()),
      question: truncateDebugText(entry.question || "", 260),
      lang: String(entry.lang || state.language || "pt"),
      endpoint: String(entry.endpoint || ME_API_ENDPOINT || ""),
      path: String(entry.path || window.location.pathname || "/"),
      origin: String(entry.origin || window.location.origin || ""),
      status: Number.isFinite(Number(entry.status)) ? Number(entry.status) : null,
      ok: Boolean(entry.ok),
      result: String(entry.result || "unknown"),
      durationMs: Math.max(0, Number(entry.durationMs) || 0),
      error: truncateDebugText(entry.error || "", 320),
      answerPreview: truncateDebugText(entry.answerPreview || "", 480),
      responsePreview: truncateDebugText(entry.responsePreview || "", 480),
      sourcesCount: Math.max(0, Number(entry.sourcesCount) || 0),
      requestHistory: Array.isArray(entry.requestHistory) ? entry.requestHistory.slice(0, 8) : [],
      attempts: Array.isArray(entry.attempts)
        ? entry.attempts.slice(0, 6).map((attempt) => ({
          attempt: Math.max(1, Number(attempt?.attempt) || 1),
          status: Number.isFinite(Number(attempt?.status)) ? Number(attempt.status) : null,
          result: String(attempt?.result || ""),
          durationMs: Math.max(0, Number(attempt?.durationMs) || 0),
          error: truncateDebugText(attempt?.error || "", 180)
        }))
        : []
    };

    list.unshift(normalized);
    if (list.length > ME_DEBUG_MAX_ITEMS) {
      list.length = ME_DEBUG_MAX_ITEMS;
    }
    writeStoredJson(ME_DEBUG_LOG_KEY, list);
  }

  function normalizeStoredBoolean(value) {
    if (value == null) return null;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") return true;
    if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") return false;
    return null;
  }

  function getMatrixPreset(theme = state.theme) {
    return getAsciiThemePreset(theme);
  }

  function isAsciiTheme(theme = state.theme) {
    return isAsciiThemeEnabled(theme);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomCharIndex(poolLength) {
    return Math.floor(Math.random() * Math.max(1, poolLength));
  }

  function fillMatrixColumns(height, columnWidth, preset) {
    const columns = Math.max(1, Math.floor((state.matrix.width || window.innerWidth) / columnWidth));
    state.matrix.columns = columns;
    state.matrix.drops = Array.from({ length: columns }, () => Math.random() * (height / columnWidth));
    state.matrix.speeds = Array.from(
      { length: columns },
      () => preset.baseSpeed + Math.random() * Math.max(0.01, preset.speedVariance)
    );
    state.matrix.offsets = Array.from(
      { length: columns },
      () => randomCharIndex(String(preset.chars || "").length)
    );
  }

  function triggerFireBurstFromPointer(clientX, clientY) {
    if (state.theme !== "fire" || !state.matrix.active || !state.matrix.canvas) return;
    if (typeof clientX !== "number" || typeof clientY !== "number") return;

    const rect = state.matrix.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;

    const preset = getMatrixPreset("fire");
    const qualityConfig = getMatrixQualityConfig(
      state.matrix.performanceTier,
      state.options.reducedMotion,
      "fire"
    );
    const cell = getFireColumnWidth(preset, qualityConfig);
    ensureFireGrid(state.matrix, state.matrix.width || rect.width, state.matrix.height || rect.height, cell);

    const cols = state.matrix.fireCols;
    const rows = state.matrix.fireRows;
    const gx = clamp(Math.floor((clientX - rect.left) / Math.max(1, cell)), 0, cols - 1);
    const gy = clamp(Math.floor((clientY - rect.top) / Math.max(1, cell)), 0, rows - 1);
    const now = performance.now();

    queueFireBurst(
      state.matrix,
      {
        x: gx,
        y: gy,
        radius: state.options.reducedMotion ? 2 : 4,
        power: state.options.reducedMotion ? 0.75 : 1,
        ttlMs: state.options.reducedMotion ? 110 : 230,
        createdAt: now
      },
      now
    );
  }

  function toFiniteNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function logClientError(context, error, extra = {}) {
    const payload = {
      context,
      message: error instanceof Error ? error.message : String(error || ""),
      stack: error instanceof Error ? error.stack : "",
      mode: state.mode,
      theme: state.theme,
      language: state.language,
      timestamp: new Date().toISOString(),
      ...extra
    };
    console.error("[portfolio:error]", payload);
  }

  function ensureErrorBanner() {
    let banner = document.getElementById("error-banner");
    if (banner) return banner;
    banner = document.createElement("div");
    banner.id = "error-banner";
    banner.className = "error-banner";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    document.body.append(banner);
    return banner;
  }

  function showErrorBanner(message, durationMs = 2600) {
    const text = String(message || "").trim();
    if (!text) return;
    const banner = ensureErrorBanner();
    banner.textContent = text;
    banner.classList.add("is-visible");
    clearTimeout(errorBannerTimer);
    errorBannerTimer = setTimeout(() => {
      banner.classList.remove("is-visible");
    }, Math.max(900, Number(durationMs) || 2600));
  }

  function normalizeLanguage(input) {
    const value = String(input || "")
      .trim()
      .toLowerCase()
      .replace("_", "-");
    if (!value) return null;
    if (value === "pt" || value.startsWith("pt-") || value === "ptbr") return "pt";
    if (value === "en" || value.startsWith("en-")) return "en";
    return SUPPORTED_LANGS.includes(value) ? value : null;
  }

  function getLocaleForLanguage(lang) {
    return lang === "en" ? "en-US" : "pt-BR";
  }

  function resolveInitialLanguage() {
    const fromQuery = normalizeLanguage(new URLSearchParams(window.location.search).get("lang"));
    if (fromQuery) return fromQuery;
    const stored = normalizeLanguage(readStoredValue(STORAGE_KEYS.lang));
    if (stored) return stored;
    const navigatorLang = normalizeLanguage(navigator.language || navigator.userLanguage || "");
    return navigatorLang || "pt";
  }

  function getContent() {
    const base = state.content || {};
    const fallback = DEFAULT_I18N[state.language] || DEFAULT_I18N.pt;
    const translations = base.translations;
    if (translations) {
      const selected = translations[state.language] || translations.pt || translations.en || {};
      return {
        ...selected,
        meta: { ...(base.meta || {}), ...(selected.meta || {}) },
        ui: { ...fallback.ui, ...(selected.ui || {}) },
        messages: { ...fallback.messages, ...(selected.messages || {}) }
      };
    }
    return {
      ...base,
      meta: { ...(base.meta || {}) },
      ui: { ...fallback.ui, ...(base.ui || {}) },
      messages: { ...fallback.messages, ...(base.messages || {}) }
    };
  }

  function isMobileViewport() {
    return window.matchMedia && window.matchMedia("(max-width: 700px)").matches;
  }

  function getViewportHeight() {
    const viewport = window.visualViewport;
    if (viewport && Number.isFinite(viewport.height) && viewport.height > 0) {
      return Math.floor(viewport.height);
    }
    return window.innerHeight;
  }

  function getTaskbarHeight() {
    const cssHeight = Number.parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--taskbar-height"),
      10
    );
    const fallback = Number.isFinite(cssHeight) && cssHeight > 0 ? cssHeight : 40;
    const measured = dom.taskbar?.offsetHeight || 0;
    return Math.max(fallback, measured);
  }

  function getPetCommandJokes(command, isPt) {
    const key = String(command || "").toLowerCase();
    const jokesPt = {
      help: ["Pediu help? Ate gato usa manual quando a caixa vem sem tampa."],
      lang: ["Trocar idioma? Eu sou bilingue: miau e miau premium."],
      me: ["Perguntou sobre voce? Eu aprovo esse marketing pessoal felino."],
      about: ["Sobre voce lido. Spoiler: 100% humano, 200% dev."],
      social: ["Redes sociais abertas. Hora de socializar sem perder o deploy."],
      projects: ["Projetos na tela. Portfolio mais organizado que minha caixa de areia."],
      education: ["Educacao carregada. Diploma de gato: mestre em soneca aplicada."],
      resume: ["Resume aberto. Curriculo enxuto, impacto bruto."],
      curriculum: ["Curriculum servido. Esse CV ta com mais garra que arranhador novo."],
      email: ["Email exibido. Mensagem curta, assunto forte e sem anexar meme... ou quase."],
      banner: ["Banner no ar. Isso sim e abrir com estilo."],
      date: ["Data mostrada. O tempo passa, bug fica... ai a gente corrige."],
      neofetch: ["Neofetch rodou. Setup bonito compila mais rapido no coracao."],
      cowsay: ["Cowsay? Muuuuito bom. Eu, como gato, respeito o bovino poeta."],
      sudo: ["Sudo negado. Nem eu tenho root, so ronron."],
      history: ["Historico aberto. Seus comandos estao com mais lore que serie longa."],
      clear: ["Tela limpa. Faxina digital feita com a pata esquerda."],
      cls: ["CLS passado. Chao brilhando, sem poeira de stack trace."],
      reload: ["Reload dado. Reiniciei sem perder minhas 7 vidas de processo."],
      exit: ["Exit? Volta logo, o terminal fica triste sem plateia."],
      gui: ["GUI ativada. Agora com janelas e zero corrente de ar."],
      "exit-gui": ["Saiu da GUI. De volta ao raiz, onde o prompt canta."],
      terminal: ["Terminal aberto. Bem-vindo ao habitat natural dos comandos."],
      theme: ["Tema trocado. Agora sim: fashion week do terminal."],
      pet: ["Chamou o pet? Presente! Com trocadilho e pelo virtual."],
      algorithms: ["Algoritmos abertos. Complexidade baixa, carisma alto."],
      cnn: ["CNN carregada. Rede neural ativada, neurio felino curioso."],
      snake: ["Snake aberto. Cobrinha no palco e eu na torcida."],
      default: ["Comando executado. Mais um passo rumo ao dominio mundial do prompt."]
    };

    const jokesEn = {
      help: ["Need help? Even cats read docs when the box has no lid."],
      lang: ["Language switch? I am bilingual: meow and premium meow."],
      me: ["Talking about you? Approved by the feline marketing board."],
      about: ["About read. Spoiler: 100% human, 200% dev."],
      social: ["Social links open. Networking without breaking deploy."],
      projects: ["Projects loaded. Portfolio cleaner than my litter box."],
      education: ["Education loaded. Cat diploma: applied nap sciences."],
      resume: ["Resume open. Lean CV, strong impact."],
      curriculum: ["Curriculum served. This CV has sharp claws."],
      email: ["Email shown. Short message, strong subject line."],
      banner: ["Banner up. That is how you open with style."],
      date: ["Date shown. Time moves, bugs stay, then we fix."],
      neofetch: ["Neofetch done. A clean setup compiles better."],
      cowsay: ["Cowsay? Moo-velous. Respect to the bovine poet."],
      sudo: ["Sudo denied. No root today, only purr privileges."],
      history: ["History opened. Your command lore is growing."],
      clear: ["Screen cleared. Digital cleanup completed."],
      cls: ["CLS executed. Floor shining, no stack-trace dust."],
      reload: ["Reload done. Same session, fresh state."],
      exit: ["Exit? Come back soon, the terminal misses you."],
      gui: ["GUI enabled. Windows open, airflow stable."],
      "exit-gui": ["Leaving GUI. Back to prompt roots."],
      terminal: ["Terminal opened. Natural habitat of commands."],
      theme: ["Theme changed. Terminal fashion week started."],
      pet: ["You called the pet? Present, with extra puns."],
      algorithms: ["Algorithms opened. Low complexity, high charisma."],
      cnn: ["CNN loaded. Neural network online, whiskers curious."],
      snake: ["Snake opened. Game on, reflexes ready."],
      default: ["Command done. One more clean move in terminal land."]
    };

    if (isPt) {
      return jokesPt[key] || jokesPt.default;
    }
    return jokesEn[key] || jokesEn.default;
  }

  function getPetErrorJokes(command, isPt) {
    const key = String(command || "").toLowerCase();
    const errorsPt = {
      sudo: ["Sem sudo hoje. Ate eu obedeco as permissoes da casa."],
      default: ["Deu erro, mas relaxa: bug tambem e uma feature em treinamento."]
    };
    const errorsEn = {
      sudo: ["No sudo today. House permissions are enforced."],
      default: ["That failed, but no panic: every bug is a feature in training."]
    };
    if (isPt) {
      return errorsPt[key] || errorsPt.default;
    }
    return errorsEn[key] || errorsEn.default;
  }

  function getPetGuiIconJokes(command, isPt, phase = "open") {
    const key = String(command || "").toLowerCase();
    const selectedPt = {
      terminal: ["Terminal selecionado. Cheiro de comando no ar."],
      about: ["Sobre selecionado. Hora do trailer oficial do dev."],
      social: ["Social selecionado. Cat networking ativado."],
      projects: ["Projects selecionado. Vitrine de build impecavel."],
      education: ["Education selecionado. Conhecimento em modo turbo."],
      algorithms: ["Algorithms selecionado. O(n) de fofura confirmado."],
      cnn: ["CNN selecionado. Neuronios aquecendo os bigodes."],
      snake: ["Snake selecionado. Cobrinha na area, foco no reflexo."],
      resume: ["Resume selecionado. CV pronto para critico exigente."],
      email: ["Email selecionado. Mensagem chegando em 3, 2, miau."],
      default: ["Icone selecionado. Eu vi isso com meus olhos ASCII."]
    };
    const openedPt = {
      terminal: ["Abrindo terminal. Casa do prompt e da paz interior."],
      about: ["Abrindo Sobre. Lore principal desbloqueada."],
      social: ["Abrindo Social. Link por link, sem cair no limbo."],
      projects: ["Abrindo Projects. Portifolio no modo chef's kiss."],
      education: ["Abrindo Education. Certificados sem fake guru."],
      algorithms: ["Abrindo Algorithms. Complexidade sob controle."],
      cnn: ["Abrindo CNN Demo. Deep learning, deep ronron."],
      snake: ["Abrindo Snake. Se perder, culpa da cobrinha, nao minha."],
      resume: ["Abrindo Resume. Contratavel e compilavel."],
      email: ["Abrindo Email. Assunto forte e sem textao."],
      default: ["Icone aberto. GUI trabalhando bonito."]
    };
    const selectedEn = {
      default: ["Icon selected. I saw that with my ASCII eyes."]
    };
    const openedEn = {
      default: ["Icon opened. GUI workflow looks clean."]
    };
    const table = isPt
      ? phase === "select"
        ? selectedPt
        : openedPt
      : phase === "select"
        ? selectedEn
        : openedEn;
    return table[key] || table.default;
  }

  function getThemeDisplayName(theme, isPt) {
    const key = String(theme || "").toLowerCase();
    const namesPt = {
      dark: "escuro",
      light: "claro",
      hacker: "hacker",
      retro: "retro",
      fire: "fogo",
      secret: "secreto"
    };
    const namesEn = {
      dark: "dark",
      light: "light",
      hacker: "hacker",
      retro: "retro",
      fire: "fire",
      secret: "secret"
    };
    const table = isPt ? namesPt : namesEn;
    return table[key] || key || (isPt ? "desconhecido" : "unknown");
  }

  function getPetThemeChangeJokes(theme, isPt) {
    const key = String(theme || "").toLowerCase();
    const label = getThemeDisplayName(key, isPt);
    const jokesPt = {
      dark: [`Tema ${label} aplicado. Modo ninja felino ativado.`],
      light: [`Tema ${label} aplicado. Agora ate meu bigode brilha.`],
      hacker: [`Tema ${label} aplicado. Iniciando ronron criptografado.`],
      retro: [`Tema ${label} aplicado. Vibe 90s e arranhador vintage.`],
      fire: [`Tema ${label} aplicado. Aquecendo pixels no modo brasa.`],
      secret: [`Tema ${label} aplicado. Nivel lendario desbloqueado.`],
      default: [`Tema ${label} aplicado. Casaco novo, mesmo mascote.`]
    };
    const jokesEn = {
      dark: [`${label} theme on. Stealth cat mode engaged.`],
      light: [`${label} theme on. Even my whiskers are brighter.`],
      hacker: [`${label} theme on. Encrypting purr sequence.`],
      retro: [`${label} theme on. Vintage vibes, modern claws.`],
      fire: [`${label} theme on. Flame mode ignited.`],
      secret: [`${label} theme on. Legendary mode unlocked.`],
      default: [`${label} theme on. New style, same cat.`]
    };
    const table = isPt ? jokesPt : jokesEn;
    return table[key] || table.default;
  }

  function getPetTempoLabel(durationMs, isPt) {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      return isPt ? "tempo indefinido" : "timing unknown";
    }
    if (durationMs <= 120) return isPt ? "instantaneo" : "instant";
    if (durationMs <= 420) return isPt ? "rapido" : "fast";
    if (durationMs <= 1000) return isPt ? "estavel" : "steady";
    return isPt ? "mais lento" : "slower";
  }

  function getPetCommandInsights(meta, isPt) {
    const durationMs = Number(meta.durationMs || 0);
    const linesCount = Math.max(0, Number(meta.linesCount || 0));
    const action = String(meta.action || "").toLowerCase();
    const streak = Math.max(0, Number(meta.commandStreak || 0));
    const tempo = getPetTempoLabel(durationMs, isPt);
    const output = [];

    output.push(
      isPt
        ? `Leitura: ${tempo} (${Math.max(0, Math.round(durationMs))}ms).`
        : `Read: ${tempo} (${Math.max(0, Math.round(durationMs))}ms).`
    );

    if (action === "gui" || action === "terminal") {
      output.push(isPt ? "Mudanca de modo detectada." : "Mode switch detected.");
    } else if (action === "reload") {
      output.push(isPt ? "Reset de sessao confirmado." : "Session reset confirmed.");
    }

    if (linesCount >= 14) {
      output.push(
        isPt ? "Resposta extensa. Parse completo." : "Large output. Parsed end-to-end."
      );
    } else if (linesCount >= 1) {
      output.push(
        isPt ? `Saida curta: ${linesCount} linha(s).` : `Compact output: ${linesCount} line(s).`
      );
    }

    if (streak >= 3) {
      output.push(
        isPt ? `Sequencia boa: ${streak} comandos seguidos.` : `Good streak: ${streak} commands in a row.`
      );
    }
    return output;
  }

  function getPetErrorInsights(meta, isPt) {
    const streak = Math.max(0, Number(meta.errorStreak || 0));
    const hasSuggestions = Boolean(meta.hasSuggestions);
    const output = [];
    if (hasSuggestions) {
      output.push(
        isPt ? "Tenho sugestoes no terminal para corrigir rapido." : "I have terminal suggestions to fix it fast."
      );
    }
    if (streak >= 2) {
      output.push(
        isPt ? `Padrao de erro detectado (${streak}x).` : `Error pattern detected (${streak}x).`
      );
    }
    return output;
  }

  function getPetPhrases(type, meta = {}) {
    const isPt = state.language === "pt";
    const command = String(meta.command || "").toLowerCase();
    const commandText = command ? `\`${command}\`` : isPt ? "esse comando" : "that command";
    const theme = String(meta.theme || state.theme || "").toLowerCase();
    const unifiedCommandPhrase =
      (getPetCommandJokes(command, isPt)[0]) ||
      (isPt ? "Comando executado." : "Command executed.");
    const phrases = {
      wake: isPt
        ? ["Oi! Eu sou seu pet ASCII.", "Ativado. Agora eu reajo a tudo.", "Pronto para acompanhar comandos."]
        : ["Hi! I'm your ASCII pet.", "Activated. I react to everything now.", "Ready to follow commands."],
      click: isPt
        ? ["Clique detectado.", "Ei, senti esse clique.", "To de olho no mouse."]
        : ["Click detected.", "Hey, I felt that click.", "Mouse movement noticed."],
      key: isPt
        ? [
            meta.keyBurst >= 5 ? "Rajada de teclas detectada." : "Input recebido.",
            meta.keyBurst >= 5 ? "Voce esta em modo turbo." : "Esse teclado nao para.",
            "Leitura de input atualizada."
          ]
        : [
            meta.keyBurst >= 5 ? "Key burst detected." : "Input received.",
            meta.keyBurst >= 5 ? "You are in turbo mode." : "That keyboard never stops.",
            "Input reading updated."
          ],
      idle: isPt
        ? ["Tudo bem por ai?", "Ainda estou aqui.", "Posso ajudar com outro comando?"]
        : ["Everything okay there?", "I'm still here.", "Need another command?"],
      command: [unifiedCommandPhrase],
      error: isPt
        ? [`Falhou em ${commandText}.`, ...getPetErrorJokes(command, true), ...getPetErrorInsights(meta, true)]
        : [`Failed at ${commandText}.`, ...getPetErrorJokes(command, false), ...getPetErrorInsights(meta, false)],
      reload: isPt
        ? ["Recarregando sessao e mantendo CLI.", "Limpando estado.", "Pronto, terminal renovado."]
        : ["Reloading session and keeping CLI.", "Clearing state.", "Done, refreshed terminal."],
      modeGui: isPt
        ? ["Entrando na GUI.", "Modo grafico ativado.", "GUI aberta."]
        : ["Entering GUI.", "Graphic mode enabled.", "GUI opened."],
      modeCli: isPt
        ? ["Voltando para o terminal.", "CLI ativada.", "Prompt pronto."]
        : ["Back to terminal.", "CLI enabled.", "Prompt ready."],
      guiIcon: [unifiedCommandPhrase],
      themeChange: isPt
        ? getPetThemeChangeJokes(theme, true)
        : getPetThemeChangeJokes(theme, false)
    };
    return phrases[type] || [];
  }

  function getPetSprite(type) {
    return PET_ASCII_SPRITE_SHEET[type] || PET_ASCII_SPRITE_SHEET.neutral;
  }

  function getPetFrame(sprite, frameIndex) {
    const fallback = { face: "•ᴥ•", body: "/|_|\\", status: "..." };
    if (!sprite || !Array.isArray(sprite.frames) || sprite.frames.length === 0) return fallback;
    const safeIndex = Math.max(0, Math.min(frameIndex, sprite.frames.length - 1));
    return sprite.frames[safeIndex] || fallback;
  }

  function buildPetAscii(frame, lookDirection = "center") {
    const earsLine =
      lookDirection === "left" ? "◀  /\\_/\\    " : lookDirection === "right" ? "   /\\_/\\ ▶" : "   /\\_/\\   ";
    const faceLine = `  ( ${frame.face} )`;
    const bodyLine = `   ${frame.body}`;
    const statusLine = `   ${frame.status}`;
    return [earsLine, faceLine, bodyLine, statusLine].join("\n");
  }

  function renderPetAscii() {
    if (!state.pet.art) return;
    const sprite = getPetSprite(state.pet.currentType);
    const frame = getPetFrame(sprite, state.pet.frameIndex);
    state.pet.art.textContent = buildPetAscii(frame, state.pet.lookDirection);
  }

  function stopPetAnimation() {
    if (state.pet.animationTimer) {
      clearInterval(state.pet.animationTimer);
      state.pet.animationTimer = null;
    }
  }

  function startPetAnimation(type, options = {}) {
    const sprite = getPetSprite(type);
    const shouldRestart = options.restart !== false || state.pet.currentType !== type;
    state.pet.currentType = type;
    if (shouldRestart) {
      state.pet.frameIndex = 0;
      state.pet.frameDirection = 1;
    }
    stopPetAnimation();
    renderPetAscii();

    const frameCount = sprite.frames?.length || 0;
    if (frameCount <= 1) return;

    const fps = Number.isFinite(sprite.fps) && sprite.fps > 0 ? sprite.fps : 6;
    const intervalMs = Math.max(60, Math.round(1000 / fps));
    state.pet.animationTimer = setInterval(() => {
      const currentSprite = getPetSprite(state.pet.currentType);
      const lastFrame = Math.max(0, (currentSprite.frames?.length || 1) - 1);

      if (currentSprite.loop) {
        if (currentSprite.loopMode === "pingpong" && lastFrame > 0) {
          let nextFrame = state.pet.frameIndex + state.pet.frameDirection;
          if (nextFrame > lastFrame) {
            state.pet.frameDirection = -1;
            nextFrame = Math.max(0, lastFrame - 1);
          } else if (nextFrame < 0) {
            state.pet.frameDirection = 1;
            nextFrame = Math.min(lastFrame, 1);
          }
          state.pet.frameIndex = nextFrame;
        } else {
          state.pet.frameIndex = (state.pet.frameIndex + 1) % (lastFrame + 1);
        }
      } else if (state.pet.frameIndex < lastFrame) {
        state.pet.frameIndex += 1;
      } else {
        stopPetAnimation();
        return;
      }
      renderPetAscii();
    }, intervalMs);
  }

  function resolvePetLookDirection(x) {
    if (!state.pet.root || typeof x !== "number") return "center";
    const rect = state.pet.root.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const deltaX = x - centerX;
    if (deltaX < -PET_TIMING.pointerDeadzonePx) return "left";
    if (deltaX > PET_TIMING.pointerDeadzonePx) return "right";
    return "center";
  }

  function clearPetTimers() {
    if (state.pet.hideBubbleTimer) {
      clearTimeout(state.pet.hideBubbleTimer);
      state.pet.hideBubbleTimer = null;
    }
    if (state.pet.idleTimer) {
      clearTimeout(state.pet.idleTimer);
      state.pet.idleTimer = null;
    }
    if (state.pet.reactionTimer) {
      clearTimeout(state.pet.reactionTimer);
      state.pet.reactionTimer = null;
    }
    if (state.pet.microAnimationTimer) {
      clearTimeout(state.pet.microAnimationTimer);
      state.pet.microAnimationTimer = null;
    }
    if (state.pet.reactionQueueTimer) {
      clearTimeout(state.pet.reactionQueueTimer);
      state.pet.reactionQueueTimer = null;
    }
    if (state.pet.bubble) {
      state.pet.bubble.classList.remove("is-visible");
      state.pet.bubble.textContent = "";
    }
    state.pet.bubbleVisibleUntil = 0;
    state.pet.pendingBubble = null;
    state.pet.reactionQueue = [];
    state.pet.reactionInFlight = null;
    stopPetAnimation();
  }

  function showPetBubble(text, duration = PET_TIMING.bubbleMs, options = {}) {
    if (!state.pet.bubble) return;
    const content = String(text || "").trim();
    if (!content) return;
    const now = Date.now();
    const safeDuration = Math.max(250, Number(duration) || PET_TIMING.bubbleMs);
    const isVisible = state.pet.bubble.classList.contains("is-visible");
    const locked =
      isVisible &&
      state.pet.bubbleVisibleUntil > 0 &&
      now < state.pet.bubbleVisibleUntil;

    if (locked && !options.force) {
      state.pet.pendingBubble = { text: content, duration: safeDuration };
      return;
    }

    clearTimeout(state.pet.hideBubbleTimer);
    state.pet.pendingBubble = null;
    state.pet.bubble.textContent = content;
    state.pet.bubble.classList.add("is-visible");
    state.pet.bubbleVisibleUntil = now + safeDuration;
    state.pet.hideBubbleTimer = setTimeout(() => {
      state.pet.bubble.classList.remove("is-visible");
      state.pet.bubbleVisibleUntil = 0;
      state.pet.hideBubbleTimer = null;
      const nextBubble = state.pet.pendingBubble;
      state.pet.pendingBubble = null;
      if (nextBubble && state.pet.active) {
        showPetBubble(nextBubble.text, nextBubble.duration, { force: true });
      }
    }, safeDuration);
  }

  function resetPetIdleTimer() {
    if (!state.pet.active) return;
    clearTimeout(state.pet.idleTimer);
    state.pet.idleTimer = setTimeout(() => {
      reactPet("idle", { persistMs: PET_PERSIST_MS.idle });
    }, PET_TIMING.idleMs);
  }

  function schedulePetMicroAnimation() {
    clearTimeout(state.pet.microAnimationTimer);
    if (!state.pet.active) return;
    const delayRange = PET_TIMING.microMaxMs - PET_TIMING.microMinMs;
    const delay = PET_TIMING.microMinMs + Math.round(Math.random() * Math.max(0, delayRange));
    state.pet.microAnimationTimer = setTimeout(() => {
      state.pet.microAnimationTimer = null;
      if (
        state.pet.active &&
        !state.pet.reactionTimer &&
        (state.pet.currentType === "neutral" || state.pet.currentType === "idle")
      ) {
        const roll = Math.random();
        if (roll < 0.55) {
          startPetAnimation("blink", { restart: true });
          schedulePetNeutral(220);
        } else if (roll < 0.85) {
          startPetAnimation("idleScan", { restart: true });
          schedulePetNeutral(520);
        } else {
          startPetAnimation("idleStretch", { restart: true });
          schedulePetNeutral(620);
        }
      }
      schedulePetMicroAnimation();
    }, delay);
  }

  function schedulePetNeutral(delay = PET_TIMING.neutralMs) {
    clearTimeout(state.pet.reactionTimer);
    state.pet.reactionTimer = setTimeout(() => {
      state.pet.reactionTimer = null;
      startPetAnimation("neutral", { restart: true });
    }, delay);
  }

  function getPetReactionClass(type) {
    return PET_REACTION_CLASS_BY_TYPE[type] || "";
  }

  function shouldPetReactByCooldown(type) {
    const key = String(type || "").toLowerCase();
    const cooldown = PET_REACTION_COOLDOWN_MS[key] || 0;
    if (cooldown <= 0) return true;
    const now = Date.now();
    const last = Number(state.pet.lastReactionAt[key] || 0);
    if (now - last < cooldown) return false;
    state.pet.lastReactionAt[key] = now;
    return true;
  }

  function updatePetInsight(type, meta = {}) {
    const key = String(type || "").toLowerCase();
    if (key === "error") {
      state.pet.insight.errorStreak += 1;
      state.pet.insight.commandStreak = 0;
      return;
    }
    if (key === "command" || key === "reload" || key === "modegui" || key === "modecli" || key === "themechange") {
      state.pet.insight.commandStreak += 1;
      state.pet.insight.errorStreak = Math.max(0, state.pet.insight.errorStreak - 1);
      state.pet.insight.lastCommand = String(meta.command || "");
      state.pet.insight.lastDurationMs = Math.max(0, Number(meta.durationMs || 0));
      state.pet.insight.lastAction = String(meta.action || "");
    }
  }

  function spawnPetParticles(type) {
    if (!state.pet.root) return;
    const rect = state.pet.root.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.3;

    const configs = {
      command: { count: 7, colors: ["#8ae234", "#fcaf3e", "#fce94f"], star: true },
      wake: { count: 9, colors: ["#fce94f", "#fcaf3e", "#8ae234"], star: true },
      error: { count: 6, colors: ["#ef2929", "#cc0000", "#ff8080"], star: false },
      themeChange: { count: 8, colors: ["#ad7fa8", "#75507b", "#f2c94c"], star: true },
      modeGui: { count: 5, colors: ["#729fcf", "#4a90d9", "#ffffff"], star: false },
      reload: { count: 6, colors: ["#06989a", "#2fffcc", "#8ae234"], star: false }
    };

    const cfg = configs[type];
    if (!cfg) return;

    for (let i = 0; i < cfg.count; i += 1) {
      const spark = document.createElement("div");
      spark.className = `pet-spark${cfg.star ? " is-star" : ""}`;

      const angle = Math.random() * Math.PI * 2;
      const dist = 28 + Math.random() * 44;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 18;
      const dur = 0.38 + Math.random() * 0.36;
      const rot = (Math.random() - 0.5) * 400;
      const color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];

      spark.style.setProperty("--dx", `${dx}px`);
      spark.style.setProperty("--dy", `${dy}px`);
      spark.style.setProperty("--dur", `${dur}s`);
      spark.style.setProperty("--rot", `${rot}deg`);
      spark.style.left = `${cx - 4}px`;
      spark.style.top = `${cy - 4}px`;
      spark.style.background = color;
      spark.style.animationDelay = `${i * 0.03}s`;

      document.body.appendChild(spark);
      spark.addEventListener("animationend", () => spark.remove(), { once: true });
    }
  }

  function getPetPriority(type) {
    return PET_REACTION_PRIORITY[type] ?? PET_REACTION_PRIORITY.neutral;
  }

  function trimPetQueue() {
    if (state.pet.reactionQueue.length <= PET_QUEUE_MAX) return;
    state.pet.reactionQueue.sort((a, b) => b.priority - a.priority || a.seq - b.seq);
    state.pet.reactionQueue = state.pet.reactionQueue.slice(0, PET_QUEUE_MAX);
  }

  function schedulePetQueueDrain(delayMs = PET_QUEUE_STEP_MS) {
    clearTimeout(state.pet.reactionQueueTimer);
    state.pet.reactionQueueTimer = setTimeout(() => {
      state.pet.reactionQueueTimer = null;
      drainPetReactionQueue();
    }, Math.max(20, Number(delayMs) || PET_QUEUE_STEP_MS));
  }

  function enqueuePetReaction(type, options = {}) {
    const reactionType = String(type || "").trim();
    if (!reactionType) return;

    const next = {
      type: reactionType,
      options,
      priority: getPetPriority(reactionType),
      seq: ++state.pet.reactionQueueSeq
    };

    const queue = state.pet.reactionQueue;
    const last = queue[queue.length - 1];
    if (
      last &&
      last.type === next.type &&
      Math.abs(last.priority - next.priority) <= 1 &&
      !options.force
    ) {
      last.options = next.options;
      schedulePetQueueDrain(10);
      return;
    }

    queue.push(next);
    trimPetQueue();

    const active = state.pet.reactionInFlight;
    if (active && next.priority > active.priority + 12) {
      clearTimeout(state.pet.reactionQueueTimer);
      state.pet.reactionQueueTimer = null;
      state.pet.reactionInFlight = null;
      queue.sort((a, b) => b.priority - a.priority || a.seq - b.seq);
      schedulePetQueueDrain(10);
      return;
    }

    if (!active) {
      schedulePetQueueDrain(10);
    }
  }

  function popNextPetReaction() {
    const queue = state.pet.reactionQueue;
    if (!queue.length) return null;
    queue.sort((a, b) => b.priority - a.priority || a.seq - b.seq);
    return queue.shift() || null;
  }

  function performPetReaction(type, options = {}) {
    updatePetInsight(type, options.meta || {});
    const messages = getPetPhrases(type, options.meta || {});
    if (messages.length && !options.skipBubble) {
      showPetBubble(getRandomItem(messages), options.bubbleDuration || PET_TIMING.bubbleMs, {
        force: Boolean(options.forceBubble)
      });
    }
    const allAnimClasses = [
      "is-react-click",
      "is-react-key",
      "is-react-command",
      "is-react-error",
      "anim-bounce",
      "anim-shake",
      "anim-spin",
      "anim-wiggle",
      "anim-pop",
      "anim-micro",
      "anim-pulse"
    ];
    state.pet.root.classList.remove(...allAnimClasses);
    const animationClass = getPetReactionClass(type);
    if (animationClass) {
      void state.pet.root.offsetWidth;
      state.pet.root.classList.add(animationClass);
      if (animationClass !== "anim-pulse") {
        let cleared = false;
        const clearClass = () => {
          if (cleared) return;
          cleared = true;
          state.pet.root?.classList.remove(animationClass);
        };
        state.pet.root.addEventListener("animationend", clearClass, { once: true });
        setTimeout(clearClass, PET_TIMING.animationClassMs);
      }
    }
    if (["command", "wake", "error", "themeChange", "modeGui", "reload"].includes(type)) {
      spawnPetParticles(type);
    }
    startPetAnimation(type, { restart: true });
    schedulePetNeutral(options.persistMs || PET_TIMING.defaultPersistMs);
    resetPetIdleTimer();
  }

  function drainPetReactionQueue() {
    if (!state.pet.active || !state.pet.root) return;
    if (state.pet.reactionInFlight) return;
    const next = popNextPetReaction();
    if (!next) return;

    state.pet.reactionInFlight = next;
    performPetReaction(next.type, next.options);
    const lowPriority = next.priority <= 12;
    const stepMs = lowPriority ? PET_QUEUE_STEP_MS + 24 : PET_QUEUE_STEP_MS;
    state.pet.reactionQueueTimer = setTimeout(() => {
      state.pet.reactionInFlight = null;
      state.pet.reactionQueueTimer = null;
      if (state.pet.reactionQueue.length > 0) {
        drainPetReactionQueue();
      }
    }, stepMs);
  }

  function reactPet(type, options = {}) {
    if (!state.pet.active || !state.pet.root) return;
    if (!shouldPetReactByCooldown(type)) return;
    if (
      (type === "idle" || type === "blink" || type === "idleScan" || type === "idleStretch") &&
      state.pet.reactionQueue.length > 0
    ) {
      return;
    }
    enqueuePetReaction(type, options);
  }

  function ensurePetMascot() {
    if (state.pet.root) return;
    const host = document.getElementById("app") || document.body;
    const root = document.createElement("div");
    root.id = "pet-mascot";
    root.className = "hidden";
    root.setAttribute("aria-hidden", "true");

    const bubble = document.createElement("div");
    bubble.className = "pet-bubble";
    bubble.textContent = "";

    const art = document.createElement("pre");
    art.className = "pet-ascii";
    art.setAttribute("aria-hidden", "true");

    root.append(bubble, art);
    host.append(root);

    state.pet.root = root;
    state.pet.bubble = bubble;
    state.pet.art = art;
    state.pet.currentType = "neutral";
    state.pet.frameIndex = 0;
    renderPetAscii();
  }

  function setPetActive(active) {
    ensurePetMascot();
    const enabled = PET_ALWAYS_ACTIVE ? true : Boolean(active);
    const hasChanged = enabled !== state.pet.active;
    state.pet.active = enabled;
    writeStoredValue(STORAGE_KEYS.petActive, enabled ? "1" : "0");
    clearPetTimers();

    if (!state.pet.root) return hasChanged;
    if (enabled) {
      state.pet.root.classList.remove("hidden");
      state.pet.root.classList.add("is-active");
      state.pet.root.setAttribute("aria-hidden", "false");
      state.pet.lookDirection = resolvePetLookDirection(state.pet.lastPointerX);
      startPetAnimation("neutral", { restart: true });
      if (hasChanged || state.pet.currentType === "neutral") {
        reactPet("wake", { persistMs: PET_PERSIST_MS.wake });
      }
      schedulePetMicroAnimation();
    } else {
      state.pet.root.classList.add("hidden");
      state.pet.root.classList.remove(
        "is-active",
        "is-react-click",
        "is-react-key",
        "is-react-command",
        "is-react-error",
        "anim-bounce",
        "anim-shake",
        "anim-spin",
        "anim-wiggle",
        "anim-pop",
        "anim-micro",
        "anim-pulse"
      );
      state.pet.root.setAttribute("aria-hidden", "true");
      if (state.pet.bubble) {
        state.pet.bubble.classList.remove("is-visible");
      }
      state.pet.currentType = "neutral";
      state.pet.frameIndex = 0;
      state.pet.frameDirection = 1;
      renderPetAscii();
    }
    return hasChanged;
  }

  function handlePetPointerMove(event) {
    if (!state.pet.active) return;
    if (typeof event.clientX !== "number" || typeof event.clientY !== "number") return;
    state.pet.lastPointerX = event.clientX;
    state.pet.lastPointerY = event.clientY;
    const nextDirection = resolvePetLookDirection(event.clientX);
    if (nextDirection !== state.pet.lookDirection) {
      state.pet.lookDirection = nextDirection;
      renderPetAscii();
    }
    resetPetIdleTimer();
  }

  function handlePetClick(event) {
    if (event && typeof event.clientX === "number" && typeof event.clientY === "number") {
      triggerFireBurstFromPointer(event.clientX, event.clientY);
    }
    reactPet("click", { persistMs: PET_PERSIST_MS.click });
  }

  function handlePetKeydown(event) {
    if (!state.pet.active) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length === 1 || event.key === "Enter" || event.key === "Backspace") {
      const now = Date.now();
      const delta = now - Number(state.pet.keyBurst.lastAt || 0);
      state.pet.keyBurst.count = delta <= PET_KEY_BURST_WINDOW_MS ? state.pet.keyBurst.count + 1 : 1;
      state.pet.keyBurst.lastAt = now;
      reactPet("key", {
        persistMs: PET_PERSIST_MS.key,
        meta: { keyBurst: state.pet.keyBurst.count }
      });
    }
  }

  function getBannerLines() {
    const content = getContent();
    const baseLines =
      isMobileViewport() && Array.isArray(content.bannerMobile)
        ? content.bannerMobile
        : content.banner || [];
    const timeLine = buildLondrinaTimeLine();
    return timeLine ? [...baseLines, timeLine] : baseLines;
  }

  function buildLondrinaTimeLine() {
    const messages = getMessages();
    const timeZone = "America/Sao_Paulo";
    const now = new Date();
    const locale = state.language === "pt" ? "pt-BR" : "en-GB";
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    const tzFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      timeZoneName: "short"
    });
    const tzPart = tzFormatter
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value;
    const timezone = tzPart || "EET";
    const datetime =
      state.language === "pt"
        ? `${dateFormatter.format(now)} às ${timeFormatter.format(now)}`
        : `${dateFormatter.format(now)} at ${timeFormatter.format(now)}`;
    const template =
      messages.localTimeLine ||
      "Local time in Londrina, Brazil is {{datetime}} {{tz}}";
    return formatTemplate(template, { datetime, tz: timezone });
  }

  function getUi() {
    return getContent().ui || DEFAULT_I18N[state.language]?.ui || DEFAULT_I18N.pt.ui;
  }

  function getMessages() {
    return getContent().messages || DEFAULT_I18N[state.language]?.messages || DEFAULT_I18N.pt.messages;
  }

  function getLanguageLabel(lang) {
    const ui = getUi();
    const labels = ui.languageLabels || {};
    return labels[lang] || lang;
  }

  function formatTemplate(template, vars = {}) {
    return String(template || "").replace(/\{\{(\w+)\}\}/g, (_match, key) => {
      const value = vars[key];
      return value === undefined || value === null ? "" : String(value);
    });
  }

  function ensureAnnouncer() {
    let announcer = document.getElementById("sr-announcer");
    if (announcer) return announcer;
    announcer = document.createElement("div");
    announcer.id = "sr-announcer";
    announcer.className = "sr-only";
    announcer.setAttribute("role", "status");
    announcer.setAttribute("aria-live", "polite");
    document.body.append(announcer);
    return announcer;
  }

  function announceToScreenReader(message) {
    if (!message) return;
    const announcer = ensureAnnouncer();
    announcer.textContent = "";
    window.setTimeout(() => {
      announcer.textContent = message;
    }, 20);
  }

  function getCommandLabel(commandKey) {
    const ui = getUi();
    return ui.labels?.[commandKey] || ui.windowTitles?.[commandKey] || commandKey;
  }

  function getWindowTitle(commandKey) {
    const ui = getUi();
    return ui.windowTitles?.[commandKey] || getCommandLabel(commandKey);
  }

  function updateUiText() {
    const ui = getUi();
    const header = dom.commandMenu?.querySelector(".command-menu-header");
    if (header && ui.commandMenuTitle) header.textContent = ui.commandMenuTitle;
    if (dom.commandSearch && ui.commandMenuPlaceholder) {
      dom.commandSearch.placeholder = ui.commandMenuPlaceholder;
    }
    if (dom.terminalInput && ui.terminalInputLabel) {
      dom.terminalInput.setAttribute("aria-label", ui.terminalInputLabel);
    }
    if (dom.terminalInputLabel && ui.terminalInputLabel) {
      dom.terminalInputLabel.textContent = ui.terminalInputLabel;
    }
    if (dom.commandSearch && ui.commandSearchLabel) {
      dom.commandSearch.setAttribute("aria-label", ui.commandSearchLabel);
    }
    if (dom.commandSearchLabel && ui.commandSearchLabel) {
      dom.commandSearchLabel.textContent = ui.commandSearchLabel;
    }
    const hint = dom.commandMenu?.querySelector(".command-menu-hint");
    if (hint && ui.commandMenuHint) hint.textContent = ui.commandMenuHint;
    const panel = dom.commandMenu?.querySelector(".command-menu-panel");
    if (panel && ui.commandMenuAriaLabel) panel.setAttribute("aria-label", ui.commandMenuAriaLabel);
    const desktopIcons = document.getElementById("desktop-icons");
    if (desktopIcons && ui.desktopAriaLabel) {
      desktopIcons.setAttribute("aria-label", ui.desktopAriaLabel);
    }
    if (dom.startButton && ui.startButton) dom.startButton.textContent = ui.startButton;
    const startHeader = dom.startMenu?.querySelector(".start-menu-header");
    if (startHeader && ui.startMenuHeader) startHeader.textContent = ui.startMenuHeader;
    if (dom.taskbarAvailability && ui.availabilityBadge) {
      dom.taskbarAvailability.textContent = ui.availabilityBadge;
    }

    document.querySelectorAll(".desktop-icon").forEach((icon) => {
      const label = getCommandLabel(icon.dataset.command);
      const labelEl = icon.querySelector(".icon-label");
      if (labelEl) labelEl.textContent = label;
    });

    dom.startMenu?.querySelectorAll("li[data-command]").forEach((item) => {
      const label = getCommandLabel(item.dataset.command);
      const labelEl = item.querySelector(".start-label");
      if (labelEl) labelEl.textContent = label;
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "menuitem");
    });

    if (ui.pageTitle) {
      document.title = ui.pageTitle;
    }

    updateMonoToggle();
  }

  function refreshOpenWindows() {
    windowManager.windows.forEach((winData) => {
      const title = getWindowTitle(winData.commandKey);
      if (winData.titleEl) winData.titleEl.textContent = title;
      winData.taskButton.textContent = title;
      winData.contentEl.innerHTML = "";
      winData.contentEl.append(buildGuiContent(winData.commandKey));
    });
  }

  function applyLanguage(lang, options = {}) {
    const normalized = normalizeLanguage(lang) || state.language || "pt";
    state.language = normalized;
    state.locale = getLocaleForLanguage(normalized);
    if (options.persist) {
      writeStoredValue(STORAGE_KEYS.lang, normalized);
    }
    document.documentElement.lang = normalized === "pt" ? "pt-BR" : "en";
    updateUiText();
    renderCommandMenu(dom.commandSearch?.value || "");
    updatePrompt();
    refreshOpenWindows();
    startClock();
    if (options.announce) {
      const messages = getMessages();
      const label = getLanguageLabel(normalized);
      announceToScreenReader(formatTemplate(messages.a11yLang, { lang: label }));
    }
  }

  function buildFallbackContent() {
    return {
      meta: {
        user: "Matheus",
        machine: "saragoca"
      },
      translations: {
        pt: {
          meta: {
            name: "Matheus Saragoca",
            role: "Desenvolvedor de Software",
            location: "Brasil"
          },
          banner: ["Falha ao carregar conteudo."],
          help: ["help"],
          about: [],
          aboutKeywords: [],
          social: [],
          projects: [],
          resume: [],
          email: [],
          ui: DEFAULT_I18N.pt.ui,
          messages: DEFAULT_I18N.pt.messages
        },
        en: {
          meta: {
            name: "Matheus Saragoca",
            role: "Software Developer",
            location: "Brazil"
          },
          banner: ["Failed to load content."],
          help: ["help"],
          about: [],
          aboutKeywords: [],
          social: [],
          projects: [],
          resume: [],
          email: [],
          ui: DEFAULT_I18N.en.ui,
          messages: DEFAULT_I18N.en.messages
        }
      }
    };
  }

  function cacheDom() {
    dom.terminal = document.getElementById("terminal");
    dom.terminalOutput = document.getElementById("terminal-output");
    dom.terminalInput = document.getElementById("terminal-input");
    dom.terminalInputLabel = document.getElementById("terminal-input-label");
    dom.prompt = document.getElementById("prompt");
    dom.commandMenu = document.getElementById("command-menu");
    dom.commandSearch = document.getElementById("command-search");
    dom.commandSearchLabel = document.getElementById("command-search-label");
    dom.commandList = document.getElementById("command-list");
    dom.gui = document.getElementById("gui");
    dom.desktop = document.getElementById("desktop");
    dom.taskbar = document.getElementById("taskbar");
    dom.startButton = document.getElementById("start-button");
    dom.startMenu = document.getElementById("start-menu");
    dom.taskButtons = document.getElementById("task-buttons");
    dom.taskbarClock = document.getElementById("taskbar-clock");
    dom.taskbarAvailability = document.getElementById("taskbar-availability");
    dom.themeColorMeta = document.getElementById("theme-color-meta");
  }

  function bindEvents() {
    dom.terminalInput.addEventListener("keydown", handleTerminalKeydown);
    dom.startButton.addEventListener("click", toggleStartMenu);
    dom.startMenu.addEventListener("click", handleStartMenuClick);
    dom.startMenu.addEventListener("keydown", handleStartMenuKeydown);
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleGlobalKeydown);
    document.addEventListener("click", handleClickSound, true);
    dom.desktop.addEventListener("click", handleDesktopClick);
    dom.desktop.addEventListener("dblclick", handleDesktopDblClick);
    dom.desktop.addEventListener("keydown", handleDesktopKeydown);
    dom.commandMenu.addEventListener("click", handleCommandMenuClick);
    dom.commandSearch.addEventListener("input", handleCommandSearch);
    dom.commandSearch.addEventListener("keydown", handleCommandSearchKeydown);
    document.addEventListener("pointermove", handlePetPointerMove, { passive: true });
    document.addEventListener("click", handlePetClick, true);
    document.addEventListener("keydown", handlePetKeydown, true);
    const syncWindowLayout = () => windowManager.ensureAllVisible();
    window.addEventListener("resize", syncWindowLayout);
    window.addEventListener("orientationchange", syncWindowLayout);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", syncWindowLayout);
    }

  }

  function initCustomCursor() {
    if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;
    const cursor = document.createElement("div");
    cursor.id = "custom-cursor";
    const dot = document.createElement("div");
    dot.className = "custom-cursor-dot";
    cursor.append(dot);
    document.body.append(cursor);
    document.body.classList.add("has-custom-cursor");

    const interactiveSelector =
      "a, button, .desktop-icon, #start-menu li, .task-button, .window-btn, .command-item, canvas";

    let rafId = null;
    let posX = 0;
    let posY = 0;

    function updateCursor() {
      rafId = null;
      cursor.style.left = `${posX}px`;
      cursor.style.top = `${posY}px`;
    }

    function handleMove(event) {
      posX = event.clientX;
      posY = event.clientY;
      if (rafId == null) {
        rafId = window.requestAnimationFrame(updateCursor);
      }
    }

    function handleHover(event) {
      const target = event.target.closest(interactiveSelector);
      cursor.classList.toggle("is-hover", Boolean(target));
    }

    function hideCursor() {
      cursor.classList.add("is-hidden");
    }

    function showCursor() {
      cursor.classList.remove("is-hidden");
    }

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseover", handleHover);
    document.addEventListener("mouseout", handleHover);
    document.addEventListener("mousedown", () => cursor.classList.add("is-active"));
    document.addEventListener("mouseup", () => cursor.classList.remove("is-active"));
    document.addEventListener("mouseleave", hideCursor);
    document.addEventListener("mouseenter", showCursor);
    document.addEventListener("focusin", (event) => {
      if (event.target && event.target.matches("input, textarea")) {
        cursor.classList.add("is-hidden");
      }
    });
    document.addEventListener("focusout", () => {
      cursor.classList.remove("is-hidden");
    });
  }

  async function loadContent() {
    const messages = getMessages();
    appendOutputLine(messages.loading, "info");
    announceToScreenReader(messages.loading);
    try {
      const response = await fetch(`./data.json?v=${APP_VERSION}`);
      if (!response.ok) {
        throw new Error("Failed to load data.json");
      }
      state.content = await response.json();
    } catch (error) {
      state.content = buildFallbackContent();
      appendOutputLine(messages.loadError, "error");
      announceToScreenReader(messages.loadError);
      logClientError("loadContent", error);
      showErrorBanner(messages.loadError, 2600);
    }
  }

  function formatPromptPath() {
    return state.shell.cwd || "~";
  }

  function updatePrompt() {
    const meta = getContent().meta || {};
    const user = meta.user || "Matheus";
    const machine = meta.machine || "saragoca";
    const path = formatPromptPath();
    if (!dom.prompt) return;
    dom.prompt.textContent = "";

    const userHost = document.createElement("span");
    userHost.className = "prompt-userhost";
    userHost.textContent = `${user}@${machine}:`;

    const pathEl = document.createElement("span");
    pathEl.className = "prompt-path";
    pathEl.textContent = path;

    const symbol = document.createElement("span");
    symbol.className = "prompt-symbol";
    symbol.textContent = "$";

    dom.prompt.append(userHost, pathEl, symbol);
  }

  function initTerminal() {
    updatePrompt();
    clearOutput();
    appendOutputLines(getBannerLines());
    setMode(state.mode);
  }

  function focusInput() {
    if (!state.sessionActive) return;
    dom.terminalInput.focus();
  }

  function setCommandBusy(busy) {
    state.commandBusy = Boolean(busy);
    if (dom.terminalInput) {
      dom.terminalInput.readOnly = state.commandBusy;
    }
  }

  function enqueueCliCommand(command, origin = "cli") {
    if (!command) return Promise.resolve();

    const run = async () => {
      if (!state.sessionActive) return;
      state.history.push(command);
      if (state.history.length > HISTORY_MAX_ITEMS) {
        state.history.splice(0, state.history.length - HISTORY_MAX_ITEMS);
      }
      state.historyIndex = -1;
      appendCommandEcho(command);
      setCommandBusy(true);
      try {
        await executeCommand(command, origin);
      } finally {
        setCommandBusy(false);
        if (state.mode === "cli") {
          focusInput();
        }
      }
    };

    state.commandQueue = state.commandQueue.then(run, run);
    return state.commandQueue;
  }

  async function handleTerminalKeydown(event) {
    if (!state.sessionActive) return;

    if (event.ctrlKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      event.stopPropagation();
      clearOutput();
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "k") {
      event.preventDefault();
      event.stopPropagation();
      toggleCommandMenu();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      autocompleteCommand();
      return;
    }

    if (shouldPlayKeyClick(event)) {
      ensureAudio();
      playClick();
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (state.commandBusy) return;
      const input = dom.terminalInput.value.trim();
      if (!input) return;
      dom.terminalInput.value = "";
      await enqueueCliCommand(input, "cli");
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      navigateHistory(-1);
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      navigateHistory(1);
    }
  }

  function handleGlobalKeydown(event) {
    if (event.altKey && event.key.toLowerCase() === "g") {
      event.preventDefault();
      toggleMode();
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "k") {
      event.preventDefault();
      toggleCommandMenu();
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      clearOutput();
      return;
    }

    if (state.commandMenuOpen && event.key === "Escape") {
      event.preventDefault();
      closeCommandMenu();
      return;
    }

    trackKonami(event);
  }

  function toggleMode() {
    if (state.mode === "cli") {
      setMode("gui");
    } else {
      setMode("cli");
    }
  }

  function toggleCommandMenu() {
    if (state.mode !== "cli" || !state.sessionActive) return;
    if (state.commandMenuOpen) {
      closeCommandMenu();
    } else {
      openCommandMenu();
    }
  }

  function openCommandMenu() {
    state.commandMenuOpen = true;
    dom.commandMenu.classList.remove("hidden");
    dom.commandMenu.setAttribute("aria-hidden", "false");
    dom.commandSearch.value = "";
    renderCommandMenu("");
    dom.commandSearch.focus();
  }

  function closeCommandMenu() {
    state.commandMenuOpen = false;
    dom.commandMenu.classList.add("hidden");
    dom.commandMenu.setAttribute("aria-hidden", "true");
    if (state.mode === "cli") {
      focusInput();
    }
  }

  function handleCommandMenuClick(event) {
    const item = event.target.closest(".command-item");
    if (!item) {
      if (event.target === dom.commandMenu) {
        closeCommandMenu();
      }
      return;
    }
    const command = item.dataset.command;
    runCommandFromMenu(command);
  }

  function handleCommandSearch() {
    renderCommandMenu(dom.commandSearch.value);
  }

  function handleCommandSearchKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCommandMenu();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveCommandSelection(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveCommandSelection(-1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      executeSelectedCommand();
    }
  }

  function renderCommandMenu(filter) {
    const query = (filter || "").toLowerCase().trim();
    const helpMap = getContent().commandHelp || {};
    const items = searchCommands(commandIndex, query, helpMap, COMMANDS.length);

    dom.commandList.innerHTML = "";
    items.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "command-item";
      if (index === 0) li.classList.add("active");
      li.dataset.command = item.command;
      const left = document.createElement("div");
      left.textContent = item.command;
      const right = document.createElement("span");
      right.textContent = item.description;
      li.append(left, right);
      dom.commandList.append(li);
    });
    state.commandMenuIndex = 0;
  }

  function moveCommandSelection(delta) {
    const items = Array.from(dom.commandList.querySelectorAll(".command-item"));
    if (!items.length) return;
    state.commandMenuIndex = (state.commandMenuIndex + delta + items.length) % items.length;
    items.forEach((item, index) => {
      item.classList.toggle("active", index === state.commandMenuIndex);
    });
    items[state.commandMenuIndex].scrollIntoView({ block: "nearest" });
  }

  function executeSelectedCommand() {
    const items = Array.from(dom.commandList.querySelectorAll(".command-item"));
    if (!items.length) return;
    const item = items[state.commandMenuIndex] || items[0];
    runCommandFromMenu(item.dataset.command);
  }

  async function runCommandFromMenu(command) {
    closeCommandMenu();
    if (!command || !state.sessionActive || state.commandBusy) return;
    await enqueueCliCommand(command, "cli");
  }

  function handleClickSound(event) {
    const target = event.target;
    const isInteractive = target.closest(
      "button, a, .desktop-icon, #start-menu li, .task-button, .window-btn, .command-item"
    );
    if (!isInteractive) return;
    ensureAudio();
    playClick();
  }

  function trackKonami(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const expected = KONAMI_SEQUENCE[konamiIndex];
    if (key === expected) {
      konamiIndex += 1;
      if (konamiIndex === KONAMI_SEQUENCE.length) {
        konamiIndex = 0;
        unlockSecretMode();
      }
    } else {
      konamiIndex = key === KONAMI_SEQUENCE[0] ? 1 : 0;
    }
  }

  function unlockSecretMode() {
    if (state.secretUnlocked) return;
    state.secretUnlocked = true;
    setTheme("secret");
    if (state.mode === "cli") {
      appendOutputLine("\u001b[35mModo secreto desbloqueado.\u001b[0m");
    }
  }

  function navigateHistory(direction) {
    if (state.history.length === 0) return;
    if (state.historyIndex === -1) {
      state.historyIndex = state.history.length;
    }
    const nextIndex = state.historyIndex + direction;
    if (nextIndex < 0 || nextIndex > state.history.length) return;
    state.historyIndex = nextIndex;
    const value = state.history[state.historyIndex] || "";
    dom.terminalInput.value = value;
  }

  function autocompleteCommand() {
    const input = dom.terminalInput.value;
    if (!input.trim()) return;
    if (dom.terminalInput.selectionStart !== input.length || dom.terminalInput.selectionEnd !== input.length) {
      return;
    }
    const parts = input.trim().split(/\s+/);
    if (parts.length > 1) return;
    const prefix = parts[0].toLowerCase();
    const matches = getPrefixMatches(commandIndex, prefix, 12);
    if (matches.length === 1) {
      dom.terminalInput.value = matches[0] + " ";
      return;
    }
    if (matches.length > 1) {
      const messages = getMessages();
      appendOutputLine(formatTemplate(messages.possibleCommands, { commands: matches.join(" ") }));
    }
  }

  function appendCommandEcho(input) {
    const line = document.createElement("div");
    line.className = "terminal-line command-echo";
    const prompt = document.createElement("span");
    prompt.textContent = dom.prompt.textContent + " ";
    line.append(prompt, document.createTextNode(input));
    dom.terminalOutput.append(line);
    trimTerminalOutput();
    scrollToBottom();
  }

  async function executeCommand(rawInput, origin) {
    const { command, args } = parseInput(rawInput);
    if (!command) return;
    const startedAt = performance.now();
    try {
      const result = await getCommandResult(command, args);

      if (result.error) {
        appendOutputLine(result.error, "error");
        showErrorBanner(result.error, 2200);
        const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
        const hasSuggestions = Boolean(result.lines && result.lines.length > 0);
        reactPet("error", {
          meta: {
            command,
            durationMs,
            hasSuggestions,
            errorStreak: state.pet.insight.errorStreak + 1
          },
          persistMs: PET_PERSIST_MS.error
        });
        if (result.lines && result.lines.length > 0) {
          await appendOutputLines(result.lines, {
            typing: shouldTypeLines(result.lines),
            speed: state.options.typingSpeed
          });
        }
        return;
      }

      if (result.lines && result.lines.length > 0) {
        await appendOutputLines(result.lines, {
          typing: shouldTypeLines(result.lines),
          speed: state.options.typingSpeed
        });
      }

      const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
      const linesCount = Array.isArray(result.lines) ? result.lines.length : 0;
      const commandMeta = {
        command,
        action: result.action || "",
        durationMs,
        linesCount,
        commandStreak: state.pet.insight.commandStreak + 1
      };

      if (command !== "theme" && !["reload", "gui", "terminal"].includes(result.action || "")) {
        reactPet("command", { meta: commandMeta, persistMs: PET_PERSIST_MS.command });
      }

      if (result.action) {
        if (result.action === "reload") {
          reactPet("reload", { meta: commandMeta, persistMs: PET_PERSIST_MS.reload });
        }
        applyAction(result.action, origin);
      }
    } catch (error) {
      const fallback = state.language === "pt" ? "Erro interno ao executar comando." : "Internal command error.";
      appendOutputLine(fallback, "error");
      showErrorBanner(fallback, 2600);
      logClientError("executeCommand", error, { rawInput, command });
      reactPet("error", {
        meta: {
          command,
          durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
          hasSuggestions: false
        },
        persistMs: PET_PERSIST_MS.error
      });
      return;
    }
  }

  function parseInput(input) {
    const parts = input.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { command: "", args: [] };
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    return { command, args };
  }

  async function getCommandResult(command, args) {
    const content = getContent();
    const messages = getMessages();
    switch (command) {
      case "help":
        if (args.length > 0) {
          const topic = args[0].toLowerCase();
          const helpMap = content?.commandHelp || {};
          const entry = helpMap[topic];
          if (!entry) {
            return { lines: [formatTemplate(messages.helpNotFound, { topic })] };
          }
          const lines = String(entry).split("\n");
          return { lines: formatHelpDetail(lines, topic) };
        }
        return { lines: formatHelpList(content?.help || []) };
      case "lang":
        return handleLangCommand(args);
      case "me":
        return await handleMeCommand(args);
      case "about":
        return { lines: highlightLinesWithAnsi(content?.about || [], content?.aboutKeywords || []) };
      case "social":
        return { lines: content?.social || [] };
      case "projects":
        return { lines: formatProjects(content?.projects || []) };
      case "education":
        return { lines: formatEducationLines(content?.education || []) };
      case "resume":
        return { lines: content?.resume || [] };
      case "curriculum":
        return { lines: content?.resume || [] };
      case "email":
        return { lines: content?.email || [] };
      case "banner":
        return { lines: getBannerLines() };
      case "date":
        return { lines: [new Date().toLocaleString(state.locale)] };
      case "neofetch":
        return { lines: formatNeofetch() };
      case "cowsay":
        return { lines: formatCowsay(args) };
      case "sudo":
        return handleSudoCommand(args);
      case "history":
        return { lines: formatHistory() };
      case "theme":
        return handleThemeCommand(args);
      case "typing":
        return handleTypingCommand(args);
      case "motion":
        return handleMotionCommand(args);
      case "pet":
        return handlePetCommand(args);
      case "algorithms":
      case "cnn":
      case "snake":
        return handleProgramCommand(command);
      case "clear":
      case "cls":
        return { action: "cls" };
      case "reload":
        return { action: "reload" };
      case "exit":
        return { lines: [messages.sessionEnded], action: "exit" };
      case "gui":
        return { lines: [messages.switchGui], action: "gui" };
      case "exit-gui":
      case "terminal":
        if (state.mode === "cli") {
          return { lines: [messages.alreadyTerminal] };
        }
        return { lines: [messages.backToTerminal], action: "terminal" };
      default:
        {
          const suggestions = suggestCommands(commandIndex, command, 6);
          if (suggestions.length) {
            return {
              error: formatTemplate(messages.commandNotFound, { command }),
              lines: [formatTemplate(messages.possibleCommands, { commands: suggestions.join(" ") })]
            };
          }
          return { error: formatTemplate(messages.commandNotFound, { command }) };
        }
    }
  }

  function formatHistory() {
    const messages = getMessages();
    if (state.history.length === 0) {
      return [messages.historyEmpty];
    }
    return state.history.map((entry, index) => `${index + 1}  ${entry}`);
  }

  function getRandomItem(items) {
    if (!Array.isArray(items) || items.length === 0) return "";
    return items[Math.floor(Math.random() * items.length)];
  }

  function handleLangCommand(args) {
    const messages = getMessages();
    if (!args || args.length === 0) {
      const label = getLanguageLabel(state.language);
      return {
        lines: [formatTemplate(messages.langCurrent, { lang: label }), messages.langUsage]
      };
    }
    const normalized = normalizeLanguage(args[0]);
    if (!normalized) {
      return {
        lines: [
          formatTemplate(messages.langInvalid, { lang: args[0] }),
          messages.langUsage
        ]
      };
    }
    applyLanguage(normalized, { persist: true, announce: true });
    const label = getLanguageLabel(normalized);
    return { lines: [formatTemplate(messages.langChanged, { lang: label })] };
  }

  function handleSudoCommand() {
    const messages = getMessages();
    const fallbackList = DEFAULT_I18N[state.language]?.messages?.sudoMessages || [];
    const list = messages.sudoMessages || fallbackList;
    return { lines: [getRandomItem(list) || "sudo: nope."] };
  }

  function handleSearchCommand(args) {
    const messages = getMessages();
    const content = getContent();
    const query = args.join(" ").trim();
    if (!query) {
      return { lines: [messages.searchUsage] };
    }
    const lowerQuery = query.toLowerCase();
    const lines = [formatTemplate(messages.searchHeader, { query })];
    let hasResults = false;

    const aboutMatches = (content.about || []).filter((line) =>
      String(line).toLowerCase().includes(lowerQuery)
    );
    if (aboutMatches.length) {
      lines.push(`${messages.searchAboutLabel}:`);
      aboutMatches.forEach((line) => {
        const snippet = highlightTextWithAnsi(truncateText(String(line), 160), [query]);
        lines.push(`- ${snippet}`);
      });
      hasResults = true;
    }

    const projectMatches = [];
    (content.projects || []).forEach((project, index) => {
      const name = project.name || `${messages.projectDefaultName} ${index + 1}`;
      const fields = [];
      if (project.name) fields.push(project.name);
      if (project.description) fields.push(project.description);
      if (project.details && project.details !== project.description) fields.push(project.details);
      if (project.lessons) {
        if (Array.isArray(project.lessons)) {
          fields.push(project.lessons.join(", "));
        } else {
          fields.push(project.lessons);
        }
      }
      if (Array.isArray(project.stack) && project.stack.length) fields.push(project.stack.join(", "));
      if (Array.isArray(project.aliases) && project.aliases.length) fields.push(project.aliases.join(", "));
      if (Array.isArray(project.links) && project.links.length) fields.push(project.links.join(" | "));
      const matching = fields.filter((field) =>
        String(field).toLowerCase().includes(lowerQuery)
      );
      if (matching.length) {
        projectMatches.push({ name, snippet: matching[0] });
      }
    });

    if (projectMatches.length) {
      lines.push(`${messages.searchProjectsLabel}:`);
      projectMatches.forEach((match) => {
        const snippet = highlightTextWithAnsi(truncateText(String(match.snippet), 160), [query]);
        lines.push(`- ${match.name}: ${snippet}`);
      });
      hasResults = true;
    }

    if (!hasResults) {
      lines.push(messages.searchNoResults);
    }

    return { lines };
  }

  function formatHelpList(lines) {
    const rawLines = (lines || []).map((line) => String(line ?? ""));
    if (rawLines.length === 0) return [];

    const commandEntries = [];
    const extras = [];
    let title = "";

    rawLines.forEach((line) => {
      const trimmed = line.trim();
      if (!title && trimmed && /comandos|commands/i.test(trimmed)) {
        title = trimmed.replace(/:$/, "");
        return;
      }
      const match = trimmed.match(/^([\w-]+)\s+-\s+(.+)$/);
      if (match) {
        commandEntries.push({ command: match[1], desc: match[2] });
        return;
      }
      extras.push(line);
    });

    if (!commandEntries.length) {
      return rawLines;
    }

    if (!title) {
      title = state.language === "pt" ? "Comandos disponiveis" : "Commands available";
    }

    const maxLen = commandEntries.reduce(
      (max, entry) => Math.max(max, entry.command.length),
      0
    );

    const output = [];
    output.push(`┌─ ${title}`);
    commandEntries.forEach((entry) => {
      const padded = entry.command.padEnd(maxLen, " ");
      output.push(`│ ${colorizeCommand(padded)}  ${entry.desc}`);
    });

    if (extras.some((line) => String(line).trim() !== "")) {
      output.push("├─");
      extras.forEach((line) => {
        const text = String(line ?? "");
        if (!text.trim()) {
          output.push("│");
          return;
        }
        output.push(`│ ${text}`);
      });
    }

    output.push("└─");
    return output;
  }

  function formatHelpDetail(lines, command) {
    const target = String(command || "").toLowerCase();
    if (!target) return lines || [];
    const pattern = new RegExp(`^(${escapeRegExp(target)})(?=\\s|$)`, "i");
    return (lines || []).map((line) => {
      const text = String(line);
      return text.replace(pattern, (match) => colorizeCommand(match));
    });
  }

  function colorizeCommand(command) {
    return `\u001b[36m${command}\u001b[0m`;
  }

  function handleProgramCommand(command) {
    if (state.mode === "gui") {
      openGuiWindow(command);
      return { lines: [] };
    }
    state.pendingWindowCommand = command;
    const messages = getMessages();
    return { lines: [messages.switchGui], action: "gui" };
  }

  function truncateText(text, maxLength) {
    const value = String(text || "");
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 3)}...`;
  }

  function buildVirtualFs(content) {
    const messages = getMessages();
    const projects = content.projects || [];
    const projectDir = {
      type: "dir",
      children: {}
    };

    projects.forEach((project, index) => {
      const name = project.name || `${messages.projectDefaultName} ${index + 1}`;
      const fileName = `${slugify(name) || `project-${index + 1}`}.txt`;
      projectDir.children[fileName] = {
        type: "file",
        content: buildProjectFile(project, messages)
      };
    });

    return {
      type: "dir",
      children: {
        "about.txt": { type: "file", content: content.about || [] },
        "projects.txt": { type: "file", content: formatProjects(projects) },
        "social.txt": { type: "file", content: content.social || [] },
        "education.txt": { type: "file", content: content.education || [] },
        "resume.txt": { type: "file", content: content.resume || [] },
        "email.txt": { type: "file", content: content.email || [] },
        "help.txt": { type: "file", content: content.help || [] },
        projects: projectDir
      }
    };
  }

  function buildProjectFile(project, messages) {
    const lines = [];
    const name = project.name || messages.projectDefaultName;
    const description = project.description || messages.projectNoDescription;
    const details = project.details && project.details !== project.description ? project.details : "";
    lines.push(name);
    if (description) lines.push(description);
    if (details) lines.push(details);
    const lessons = formatProjectLessons(project, messages);
    if (lessons) {
      lines.push(`${messages.projectLessonsLabel}: ${lessons}`);
    }
    if (Array.isArray(project.stack) && project.stack.length) {
      lines.push(`${messages.projectStackLabel}: ${project.stack.join(", ")}`);
    }
    if (Array.isArray(project.links) && project.links.length) {
      lines.push(`${messages.projectLinksLabel}: ${project.links.join(" | ")}`);
    }
    return lines;
  }

  function formatProjectLessons(project, messages) {
    if (!project) return "";
    const raw = project.lessons;
    if (Array.isArray(raw)) {
      const items = raw.map((item) => String(item || "").trim()).filter(Boolean);
      return items.length ? items.join(" | ") : "";
    }
    if (raw) {
      return String(raw).trim();
    }
    return messages.projectNoLessons ? "" : "";
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  function resolvePath(input) {
    const raw = String(input || "").trim();
    if (!raw) return state.shell.cwd;
    const current = state.shell.cwd === "~" ? [] : state.shell.cwd.slice(2).split("/").filter(Boolean);
    let parts = [];

    if (raw.startsWith("~")) {
      parts = raw.slice(1).split("/").filter(Boolean);
    } else if (raw.startsWith("/")) {
      parts = raw.slice(1).split("/").filter(Boolean);
    } else {
      parts = current.concat(raw.split("/").filter(Boolean));
    }

    const resolved = [];
    parts.forEach((part) => {
      if (part === ".") return;
      if (part === "..") {
        resolved.pop();
        return;
      }
      resolved.push(part);
    });

    return resolved.length ? `~/${resolved.join("/")}` : "~";
  }

  function getNodeAtPath(root, path) {
    const segments = path === "~" ? [] : path.slice(2).split("/").filter(Boolean);
    let node = root;
    for (const segment of segments) {
      if (!node || node.type !== "dir" || !node.children || !node.children[segment]) {
        return null;
      }
      node = node.children[segment];
    }
    return node;
  }

  function listDirectory(node) {
    if (!node || node.type !== "dir") return [];
    const entries = Object.keys(node.children || {});
    return entries
      .map((entry) => (node.children[entry].type === "dir" ? `${entry}/` : entry))
      .sort();
  }

  function handleLsCommand(args) {
    const messages = getMessages();
    const content = getContent();
    const fs = buildVirtualFs(content);
    const targetPath = resolvePath(args[0]);
    const node = getNodeAtPath(fs, targetPath);
    if (!node) {
      return { lines: [formatTemplate(messages.fsNotFound, { path: targetPath })] };
    }
    if (node.type === "file") {
      return { lines: [targetPath.split("/").pop()] };
    }
    const entries = listDirectory(node);
    if (!entries.length) {
      return { lines: [messages.fsEmpty] };
    }
    return { lines: [entries.join("  ")] };
  }

  function handleCdCommand(args) {
    const messages = getMessages();
    const content = getContent();
    const fs = buildVirtualFs(content);
    const targetPath = resolvePath(args[0] || "~");
    const node = getNodeAtPath(fs, targetPath);
    if (!node) {
      return { lines: [formatTemplate(messages.fsNotFound, { path: targetPath })] };
    }
    if (node.type !== "dir") {
      return { lines: [formatTemplate(messages.fsNotDir, { path: targetPath })] };
    }
    state.shell.cwd = targetPath;
    updatePrompt();
    return { lines: [formatTemplate(messages.fsCwd, { path: targetPath })] };
  }

  function handleCatCommand(args) {
    const messages = getMessages();
    if (!args || args.length === 0) {
      return { lines: [messages.fsCatUsage || messages.langUsage] };
    }
    const content = getContent();
    const fs = buildVirtualFs(content);
    const targetPath = resolvePath(args[0]);
    const node = getNodeAtPath(fs, targetPath);
    if (!node) {
      return { lines: [formatTemplate(messages.fsNotFound, { path: targetPath })] };
    }
    if (node.type === "dir") {
      return { lines: [formatTemplate(messages.fsIsDir, { path: targetPath })] };
    }
    const lines = Array.isArray(node.content) ? node.content : [String(node.content)];
    return { lines };
  }

  async function handleMeCommand(args) {
    const messages = getMessages();
    const message = args.join(" ").trim();
    if (!message) {
      state.me.active = true;
      const intro = [...(messages.meIntro || [])];
      if (!ME_API_ENDPOINT) {
        intro.push(messages.meApiNotConfigured || "Remote AI is not configured.");
      }
      return {
        lines: prefixAgentLines(intro)
      };
    }

    if (isMeExit(message)) {
      state.me.active = false;
      state.me.lastProject = null;
      return { lines: prefixAgentLines([messages.meExit]) };
    }

    state.me.active = true;
    state.me.history.push({ role: "user", text: message });
    if (state.me.history.length > 40) {
      state.me.history.splice(0, state.me.history.length - 40);
    }

    const remote = await requestMeFromApi(message);
    const fallback = buildMeResponse(message);
    const warning =
      !remote?.lines?.length && ME_API_ENDPOINT
        ? messages.meApiUnavailable || "Remote AI did not respond."
        : "";
    const response = formatMeResponseLines(remote?.lines?.length ? remote.lines : fallback, {
      warning,
      sources: remote?.sources || []
    });

    state.me.history.push({ role: "assistant", text: response.join("\n") });
    if (state.me.history.length > 40) {
      state.me.history.splice(0, state.me.history.length - 40);
    }
    return { lines: prefixAgentLines(response) };
  }

  async function requestMeFromApi(question) {
    if (!ME_API_ENDPOINT) return null;
    const startedAt = performance.now();
    const debugEntry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      question,
      lang: state.language,
      endpoint: ME_API_ENDPOINT,
      path: window.location.pathname,
      origin: window.location.origin,
      status: null,
      ok: false,
      result: "",
      durationMs: 0,
      error: "",
      answerPreview: "",
      responsePreview: "",
      sourcesCount: 0,
      attempts: [],
      requestHistory: state.me.history.slice(-ME_HISTORY_WINDOW).map((item) => ({
        role: String(item?.role || ""),
        text: truncateDebugText(item?.text || "", 140)
      }))
    };
    try {
      const maxAttempts = Math.max(1, ME_API_RETRY_LIMIT + 1);
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const timeoutMs = Math.max(
          1200,
          Number(ME_API_ATTEMPT_TIMEOUTS_MS[attempt] || ME_API_TIMEOUT_MS || 14000)
        );
        const controller = new AbortController();
        const attemptStartedAt = performance.now();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetch(ME_API_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            signal: controller.signal,
            body: JSON.stringify({
              question,
              lang: state.language,
              history: state.me.history.slice(-ME_HISTORY_WINDOW)
            })
          });

          const responseText = await response.text().catch(() => "");
          debugEntry.status = response.status;
          debugEntry.responsePreview = truncateDebugText(responseText, 480);

          if (!response.ok) {
            const errorType = classifyMeApiError(response.status, false);
            debugEntry.result = errorType;
            debugEntry.attempts.push({
              attempt: attempt + 1,
              status: response.status,
              result: errorType,
              durationMs: Math.max(0, Math.round(performance.now() - attemptStartedAt)),
              error: `me api status ${response.status}`
            });
            if (attempt < maxAttempts - 1 && ME_API_RETRYABLE_STATUS.has(response.status)) {
              await sleep(180 * (attempt + 1));
              continue;
            }
            throw new Error(`me api status ${response.status}`);
          }

          const payload = responseText ? JSON.parse(responseText) : {};
          const normalized = normalizeMeApiPayload(payload);
          const answer = normalized.answer;
          debugEntry.sourcesCount = normalized.sources.length;
          debugEntry.answerPreview = truncateDebugText(answer, 480);
          if (!answer) {
            debugEntry.result = "invalid_payload";
            debugEntry.attempts.push({
              attempt: attempt + 1,
              status: response.status,
              result: "invalid_payload",
              durationMs: Math.max(0, Math.round(performance.now() - attemptStartedAt)),
              error: "Missing answer text in payload."
            });
            if (attempt < maxAttempts - 1) {
              await sleep(120 * (attempt + 1));
              continue;
            }
            return null;
          }

          let lines = answer
            .split(/\r?\n/g)
            .map((line) => String(line || ""))
            .slice(0, 30);

          const sourceLines = formatMeSources(normalized.sources);
          if (sourceLines.length) {
            const firstSourceLine = lines.findIndex((line) => isMeSourceHeading(line));
            if (firstSourceLine >= 0) {
              lines = lines.slice(0, firstSourceLine);
            }
          }

          debugEntry.ok = true;
          debugEntry.result = normalized.schema === "me.v1" ? "success" : "success_schema_unknown";
          debugEntry.attempts.push({
            attempt: attempt + 1,
            status: response.status,
            result: debugEntry.result,
            durationMs: Math.max(0, Math.round(performance.now() - attemptStartedAt)),
            error: ""
          });

          return {
            lines: normalizeMeBodyLines(lines),
            sources: sourceLines
          };
        } catch (error) {
          const isAbort = Boolean(controller.signal.aborted);
          const errorType = classifyMeApiError(debugEntry.status, isAbort);
          if (!debugEntry.result || debugEntry.result === "success") {
            debugEntry.result = errorType;
          }
          const message = error instanceof Error ? error.message : String(error || "");
          debugEntry.error = message;
          debugEntry.attempts.push({
            attempt: attempt + 1,
            status: Number.isFinite(debugEntry.status) ? debugEntry.status : null,
            result: errorType,
            durationMs: Math.max(0, Math.round(performance.now() - attemptStartedAt)),
            error: message
          });
          const canRetry = attempt < maxAttempts - 1 && (isAbort || errorType === "network_or_cors_error");
          if (canRetry) {
            await sleep(220 * (attempt + 1));
            continue;
          }
          logClientError("me-api", error, { endpoint: ME_API_ENDPOINT, errorType });
          return null;
        } finally {
          clearTimeout(timeout);
        }
      }
      return null;
    } finally {
      debugEntry.durationMs = Math.max(0, Math.round(performance.now() - startedAt));
      appendMeDebugLog(debugEntry);
    }
  }

  function formatMeSources(sources) {
    if (!Array.isArray(sources) || sources.length === 0) return [];
    const lines = [];
    sources.slice(0, 5).forEach((item) => {
      if (typeof item === "string") {
        lines.push(...wrapMeLine(`- ${String(item || "").trim()}`, 104));
        return;
      }
      const name = String(item?.name || item?.repo || item?.title || "").trim();
      const url = String(item?.url || item?.html_url || "").trim();
      const description = String(item?.description || "").trim();
      if (name && url) {
        lines.push(...wrapMeLine(`- ${name}: ${url}`, 104));
      } else if (url) {
        lines.push(...wrapMeLine(`- ${url}`, 104));
      } else if (name) {
        lines.push(...wrapMeLine(`- ${name}`, 104));
      }
      if (description) {
        lines.push(...wrapMeLine(`  ${description}`, 104));
      }
    });
    return lines;
  }

  function formatMeResponseLines(lines, options = {}) {
    const messages = getMessages();
    const warning = String(options.warning || "").trim();
    const body = normalizeMeBodyLines(lines);
    const sources = Array.isArray(options.sources) ? options.sources.filter(Boolean) : [];
    const output = [];

    if (warning) {
      output.push(`\u001b[33m${warning}\u001b[0m`);
      output.push("");
    }

    output.push(`\u001b[90m${messages.meResponseLabel || "Answer"}\u001b[0m`);
    output.push("");
    output.push(...body);

    if (sources.length) {
      output.push("");
      output.push(`\u001b[90m${messages.meSourcesLabel || "Sources"}\u001b[0m`);
      output.push(...sources);
    }

    return output;
  }

  function normalizeMeBodyLines(lines) {
    if (!Array.isArray(lines)) return [];
    const normalized = [];
    let lastWasBlank = false;

    lines.forEach((line) => {
      const raw = String(line == null ? "" : line).replace(/\t/g, "  ").trimEnd();
      const trimmed = raw.trim();

      if (!trimmed) {
        if (!lastWasBlank && normalized.length > 0) {
          normalized.push("");
        }
        lastWasBlank = true;
        return;
      }

      let text = trimmed
        .replace(/^#{1,6}\s*/, "")
        .replace(/^[-*]\s+/, "- ")
        .replace(/^\u2022\s+/, "- ")
        .replace(/^(\d+)\)\s+/, "$1. ");

      const wrapped = wrapMeLine(text, 104);
      normalized.push(...wrapped);
      lastWasBlank = false;
    });

    while (normalized.length > 0 && !String(normalized[normalized.length - 1] || "").trim()) {
      normalized.pop();
    }

    return normalized.slice(0, 36);
  }

  function wrapMeLine(line, maxWidth = 104) {
    const text = String(line || "").trimEnd();
    if (!text) return [""];
    if (removeAnsi(text).length <= maxWidth) return [text];

    const bulletMatch = text.match(/^(-\s+|\d+\.\s+)/);
    const prefix = bulletMatch ? bulletMatch[0] : "";
    const content = prefix ? text.slice(prefix.length).trim() : text.trim();
    if (!content || content.includes("http://") || content.includes("https://")) {
      return [text];
    }

    const indent = " ".repeat(prefix.length);
    const words = content.split(/\s+/g).filter(Boolean);
    const lines = [];
    let current = prefix;

    words.forEach((word) => {
      const next = current.trim().length ? `${current} ${word}` : `${prefix}${word}`;
      if (removeAnsi(next).length <= maxWidth) {
        current = next;
        return;
      }
      lines.push(current);
      current = `${indent}${word}`;
    });

    if (current.trim().length) {
      lines.push(current);
    }
    return lines.length ? lines : [text];
  }

  function isMeSourceHeading(line) {
    const normalized = normalizeText(String(line || "")).replace(/[:\s]+/g, "");
    return normalized === "fontes" || normalized === "sources";
  }

  function isMeExit(message) {
    const normalized = normalizeText(message);
    return ["exit", "sair", "quit", "tchau", "bye", "/exit", ":q"].some((word) =>
      normalized === word || normalized.endsWith(` ${word}`)
    );
  }

  function buildMeResponse(message) {
    const content = getContent();
    const messages = getMessages();
    const normalized = normalizeText(message);

    if (hasAny(normalized, ["ajuda", "help", "comandos", "como usar"])) {
      return messages.meHelp || [];
    }

    if (
      hasAny(normalized, [
        "quem e voce",
        "quem é voce",
        "sobre voce",
        "sobre você",
        "apresenta",
        "who are you",
        "about you",
        "introduce yourself"
      ])
    ) {
      const meta = content.meta || {};
      const parts = [meta.name, meta.role, meta.location].filter(Boolean).join(" - ");
      return [
        parts
          ? formatTemplate(messages.meProfilePrefix, { profile: parts })
          : messages.meProfileFallback,
        messages.meProfileDetails
      ];
    }

    if (hasAny(normalized, ["projetos", "projects", "portfolio", "portifolio", "portfólio", "lista"])) {
      const projects = content.projects || [];
      if (!projects.length) {
        return [messages.meProjectsNone];
      }
      return [
        messages.meProjectsIntro,
        ...projects.map(
          (project) => `- ${project.name}: ${project.description || messages.projectNoDescription}`
        )
      ];
    }

    const project = findProjectMatch(normalized, content.projects || []);
    if (project) {
      state.me.lastProject = project.name || null;
      return buildProjectResponse(project, normalized);
    }

    if (state.me.lastProject) {
      const last = (content.projects || []).find(
        (proj) => normalizeText(proj.name || "") === normalizeText(state.me.lastProject || "")
      );
      if (last) {
        return buildProjectResponse(last, normalized);
      }
    }

    const available = (content.projects || []).map((project) => project.name).filter(Boolean);
    if (available.length) {
      return [
        messages.meNoMatchIntro,
        ...available.map((name) => `- ${name}`)
      ];
    }
    return [messages.meUnknown];
  }

  function buildProjectResponse(project, normalizedMessage) {
    const messages = getMessages();
    const wantLinks = hasAny(normalizedMessage, [
      "link",
      "links",
      "github",
      "repo",
      "repositorio",
      "repositório"
    ]);
    const wantStack = hasAny(normalizedMessage, [
      "stack",
      "tecnologia",
      "tecnologias",
      "tech",
      "framework",
      "linguagem"
    ]);
    const wantLessons = hasAny(normalizedMessage, [
      "licao",
      "licoes",
      "lesson",
      "lessons",
      "desafio",
      "desafios",
      "challenge",
      "challenges",
      "dificuldade",
      "dificuldades"
    ]);
    const wantDetails = hasAny(normalizedMessage, [
      "detalhe",
      "detalhes",
      "sobre",
      "objetivo",
      "faz",
      "funciona",
      "descricao",
      "descrição",
      "details",
      "about",
      "objective",
      "does",
      "description"
    ]);

    const lines = [];
    const name = project.name || messages.projectDefaultName;
    const description =
      project.details || project.description || messages.projectNoDetails;
    const stack = Array.isArray(project.stack) && project.stack.length ? project.stack.join(", ") : null;
    const lessons = formatProjectLessons(project, messages);
    const links = Array.isArray(project.links) ? project.links : [];

    if (wantLinks && links.length) {
      lines.push(`${name} - ${messages.projectLinksLabel}: ${links.join(" | ")}`);
      if (wantDetails) {
        lines.push(description);
      }
      if (wantLessons && lessons) {
        lines.push(`${messages.projectLessonsLabel}: ${lessons}`);
      }
      return lines;
    }

    if (wantStack) {
      lines.push(`${name} - ${messages.projectStackLabel}: ${stack || messages.projectNoStack}`);
      if (wantDetails) {
        lines.push(description);
      }
      if (wantLessons && lessons) {
        lines.push(`${messages.projectLessonsLabel}: ${lessons}`);
      }
      if (wantLinks && links.length) {
        lines.push(`${messages.projectLinksLabel}: ${links.join(" | ")}`);
      }
      return lines;
    }

    lines.push(`${name}: ${description}`);
    if (stack) {
      lines.push(`${messages.projectStackLabel}: ${stack}`);
    }
    if (wantLessons && lessons) {
      lines.push(`${messages.projectLessonsLabel}: ${lessons}`);
    }
    if (wantLinks && links.length) {
      lines.push(`${messages.projectLinksLabel}: ${links.join(" | ")}`);
    }
    return lines;
  }

  function findProjectMatch(normalizedMessage, projects) {
    if (!projects || projects.length === 0) return null;
    const messageTokens = new Set(tokenize(normalizedMessage));
    let best = null;
    let bestScore = 0;

    projects.forEach((project) => {
      const candidates = [project.name, ...(project.aliases || []), ...(project.tags || [])].filter(Boolean);
      candidates.forEach((candidate) => {
        const normalized = normalizeText(candidate);
        if (!normalized) return;
        if (normalizedMessage.includes(normalized)) {
          const score = normalized.length + 10;
          if (score > bestScore) {
            bestScore = score;
            best = project;
          }
          return;
        }
        const tokens = tokenize(normalized);
        const matchCount = tokens.reduce((count, token) => count + (messageTokens.has(token) ? 1 : 0), 0);
        if (matchCount > bestScore) {
          bestScore = matchCount;
          best = project;
        }
      });
    });

    return bestScore > 0 ? best : null;
  }

  function prefixAgentLines(lines) {
    if (!Array.isArray(lines) || lines.length === 0) return [];
    const output = ["\u001b[36mMatheus AI\u001b[0m"];

    lines.forEach((line) => {
      const text = String(line == null ? "" : line);
      if (!text.trim()) {
        output.push("");
        return;
      }
      output.push(`  ${text}`);
    });

    return output;
  }

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function tokenize(text) {
    return normalizeText(text)
      .split(/[^a-z0-9]+/g)
      .filter(Boolean);
  }

  function hasAny(text, candidates) {
    return candidates.some((candidate) => text.includes(normalizeText(candidate)));
  }

  function formatProjects(projects) {
    const messages = getMessages();
    if (!projects.length) {
      return [messages.noProjectsListed];
    }
    const lines = [];
    projects.forEach((project, index) => {
      lines.push(`${index + 1}. ${project.name}`);
      if (project.description) {
        lines.push(`   ${project.description}`);
      } else if (messages.projectNoDescription) {
        lines.push(`   ${messages.projectNoDescription}`);
      }
      const lessons = formatProjectLessons(project, messages);
      if (lessons) {
        lines.push(`   ${messages.projectLessonsLabel}: ${lessons}`);
      }
      if (Array.isArray(project.links)) {
        project.links.forEach((link) => lines.push(`   ${link}`));
      }
    });
    return lines;
  }

  function formatEducationLines(lines) {
    if (!Array.isArray(lines) || lines.length === 0) return [];
    return lines.map((entry, index) => colorizeEducationLine(entry, index));
  }

  function colorizeEducationLine(entry, index) {
    const { institution, years } = normalizeEducationEntry(entry);
    const colors = [32, 34, 31];
    const baseColor = colors[index] ?? 37;
    const left = institution ? ansiColor(baseColor, institution) : "";
    const right = years ? ansiColor(35, years) : "";
    if (left && right) {
      return `${left} | ${right}`;
    }
    return left || right || String(entry || "");
  }

  function normalizeEducationEntry(entry) {
    if (entry && typeof entry === "object") {
      return {
        institution: entry.institution || entry.name || "",
        years: entry.years || entry.period || "",
        logo: entry.logo || entry.image || entry.cover || ""
      };
    }
    const { institution, years } = splitEducationLine(entry);
    return { institution, years, logo: "" };
  }

  function splitEducationLine(line) {
    const raw = String(line || "");
    const parts = raw.split("|");
    if (parts.length >= 2) {
      const years = parts.pop().trim();
      const institution = parts.join("|").trim();
      return { institution, years };
    }
    return { institution: raw.trim(), years: "" };
  }

  function ansiColor(code, text) {
    return `\u001b[${code}m${text}\u001b[0m`;
  }

  function formatNeofetch() {
    const content = getContent();
    const labels = getMessages().neofetch || {};
    const uptime = Math.floor(performance.now() / 1000);
    return [
      `${labels.os || "OS"}: ${labels.osValue || "Portfolio Terminal v1.0"}`,
      `${labels.host || "Host"}: ${content?.meta?.machine || "saragoca"}`,
      `${labels.kernel || "Kernel"}: ${labels.kernelValue || "JavaScript ES6+"}`,
      `${labels.shell || "Shell"}: ${labels.shellValue || "Custom shell"}`,
      `${labels.theme || "Theme"}: ${state.theme}`,
      `${labels.terminal || "Terminal"}: ${state.mode}`,
      `${labels.uptime || "Uptime"}: ${uptime}s`
    ];
  }

  function formatCowsay(args) {
    const message = args.length ? args.join(" ") : "Moo!";
    const border = "_".repeat(message.length + 2);
    const underline = "-".repeat(message.length + 2);
    return [
      ` ${border}`,
      `< ${message} >`,
      ` ${underline}`,
      "        \\   ^__^",
      "         \\  (oo)\\_______",
      "            (__)\\       )\\/\\",
      "                ||----w |",
      "                ||     ||"
    ];
  }

  function handleThemeCommand(args) {
    const messages = getMessages();
    if (!args || args.length === 0) {
      const available = THEMES.join(" | ");
      const current = state.theme;
      return {
        lines: [
          formatTemplate(messages.themeCurrent, { theme: current }),
          formatTemplate(messages.themeAvailable, { themes: available })
        ]
      };
    }
    const choice = args[0].toLowerCase();
    const success = setTheme(choice);
    if (!success) {
      return {
        lines: [
          formatTemplate(messages.themeInvalid, { theme: choice }),
          formatTemplate(messages.themeUsage, { themes: THEMES.join(" | ") })
        ]
      };
    }
    return { lines: [formatTemplate(messages.themeChanged, { theme: choice })] };
  }

  function handleTypingCommand(args) {
    const messages = getMessages();
    if (!args || args.length === 0) {
      return {
        lines: [
          formatTemplate(messages.typingCurrent || "Current typing speed: {{speed}}", {
            speed: state.options.typingSpeed
          }),
          messages.typingUsage || "Use: typing [1-18]"
        ]
      };
    }
    const nextSpeed = Math.round(Number(args[0]));
    if (!Number.isFinite(nextSpeed) || nextSpeed < 1 || nextSpeed > 18) {
      return { lines: [messages.typingUsage || "Use: typing [1-18]"] };
    }
    state.options.typingSpeed = nextSpeed;
    writeStoredValue(STORAGE_KEYS.typingSpeed, String(nextSpeed));
    return {
      lines: [
        formatTemplate(messages.typingChanged || "Typing speed set to: {{speed}}", {
          speed: state.options.typingSpeed
        })
      ]
    };
  }

  function handleMotionCommand(args) {
    const messages = getMessages();
    const action = String(args?.[0] || "status").trim().toLowerCase();
    if (action === "status") {
      return {
        lines: [
          state.options.reducedMotion
            ? messages.motionStatusReduced || "Reduced motion: enabled"
            : messages.motionStatusFull || "Reduced motion: disabled"
        ]
      };
    }
    if (action === "on" || action === "reduce" || action === "low") {
      applyReducedMotion(true, { persist: true });
      return { lines: [messages.motionChangedReduced || "Reduced motion enabled."] };
    }
    if (action === "off" || action === "full" || action === "normal") {
      applyReducedMotion(false, { persist: true });
      return { lines: [messages.motionChangedFull || "Reduced motion disabled."] };
    }
    return { lines: [messages.motionUsage || "Use: motion [on|off|status]"] };
  }

  function handlePetCommand(args) {
    const messages = getMessages();
    const action = String(args?.[0] || "").trim().toLowerCase();
    const isPt = state.language === "pt";

    if (!action || action === "on") {
      if (state.pet.active) {
        return { lines: [messages.petAlreadyActive || "Mascote ja ativo."] };
      }
      setPetActive(true);
      return { lines: [messages.petActivated || "Mascote ativado."] };
    }

    if (action === "off" || action === "hide") {
      if (PET_ALWAYS_ACTIVE) {
        return { lines: [messages.petAlwaysOn || "Mascote fixo: sempre ativo."] };
      }
      if (!state.pet.active) {
        return { lines: [messages.petAlreadyInactive || "Mascote ja oculto."] };
      }
      setPetActive(false);
      return { lines: [messages.petDeactivated || "Mascote ocultado."] };
    }

    if (action === "status") {
      return { lines: [messages.petStatusOn || "Mascote: ativo"] };
    }

    if (action === "sheet" || action === "sprites") {
      const header = isPt ? "Sprite sheet do gatinho:" : "Kitten sprite sheet:";
      const lines = [header];
      Object.entries(PET_ASCII_SPRITE_SHEET).forEach(([name, sprite]) => {
        const frames = Array.isArray(sprite.frames) ? sprite.frames.length : 0;
        const fps = Number.isFinite(sprite.fps) ? sprite.fps : 0;
        const loop = sprite.loop ? "on" : "off";
        lines.push(`- ${name}: frames=${frames}, fps=${fps}, loop=${loop}`);
      });
      return { lines };
    }

    return { lines: [isPt ? "Use: pet | pet on | pet status | pet sheet" : "Use: pet | pet on | pet status | pet sheet"] };
  }

  function applyAction(action, origin) {
    switch (action) {
      case "cls":
        clearOutput();
        break;
      case "reload":
        resetState("cli");
        initTerminal();
        break;
      case "exit":
        state.sessionActive = false;
        dom.terminalInput.value = "";
        dom.terminalInput.setAttribute("disabled", "disabled");
        break;
      case "gui":
        setMode("gui");
        break;
      case "terminal":
        setMode("cli");
        break;
      default:
        break;
    }

    if (origin === "cli") {
      scrollToBottom();
    }
  }

  function resetState(nextMode = INITIAL_MODE) {
    state.sessionActive = true;
    state.commandQueue = Promise.resolve();
    state.history = [];
    state.historyIndex = -1;
    state.me.active = false;
    state.me.history = [];
    state.me.lastProject = null;
    state.shell.cwd = "~";
    dom.terminalInput.removeAttribute("disabled");
    setCommandBusy(false);
    closeCommandMenu();
    setMode(nextMode);
  }

  function setMode(mode) {
    const previousMode = state.mode;
    state.mode = mode;
    writeStoredValue(STORAGE_KEYS.mode, mode);
    if (mode === "gui") {
      hideMode(dom.terminal);
      showMode(dom.gui);
      closeCommandMenu();
      if (state.pendingWindowCommand) {
        const pending = state.pendingWindowCommand;
        state.pendingWindowCommand = null;
        openGuiWindow(pending);
      }
    } else {
      hideMode(dom.gui);
      showMode(dom.terminal);
      dom.startMenu.classList.add("hidden");
      focusInput();
    }
    const messages = getMessages();
    const ui = getUi();
    const modeLabel = ui.modeLabels?.[mode] || mode;
    announceToScreenReader(formatTemplate(messages.a11yMode, { mode: modeLabel }));
    if (state.pet.active && previousMode !== mode) {
      reactPet(mode === "gui" ? "modeGui" : "modeCli", { persistMs: PET_PERSIST_MS.modeSwitch });
    }
  }

  function toggleStartMenu(event) {
    event.stopPropagation();
    const willOpen = dom.startMenu.classList.contains("hidden");
    dom.startMenu.classList.toggle("hidden");
    if (willOpen) {
      const firstItem = getStartMenuItems()[0];
      focusStartMenuItem(firstItem);
    }
  }

  function showMode(element) {
    if (!element) return;
    if (element._hideTimeout) {
      clearTimeout(element._hideTimeout);
      element._hideTimeout = null;
    }
    element.classList.remove("hidden");
    element.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      element.classList.remove("mode-hidden");
    });
  }

  function hideMode(element) {
    if (!element) return;
    element.classList.add("mode-hidden");
    element.setAttribute("aria-hidden", "true");
    if (element._hideTimeout) {
      clearTimeout(element._hideTimeout);
    }
    element._hideTimeout = setTimeout(() => {
      element.classList.add("hidden");
    }, TRANSITION_MS);
  }

  function reactPetForGuiIcon(command, phase = "open") {
    const persistMs = phase === "select" ? PET_PERSIST_MS.guiSelect : PET_PERSIST_MS.guiOpen;
    reactPet("guiIcon", {
      meta: { command, phase },
      persistMs,
      skipBubble: phase === "select",
      forceBubble: phase === "open"
    });
  }

  function runGuiCommand(command, origin = "gui") {
    if (command === "terminal") {
      applyAction("terminal", origin);
      return;
    }
    if (GUI_WINDOW_COMMANDS.includes(command)) {
      openGuiWindow(command);
    }
  }

  function handleStartMenuClick(event) {
    const item = event.target.closest("li");
    if (!item) return;
    const command = item.dataset.command;
    dom.startMenu.classList.add("hidden");
    reactPetForGuiIcon(command, "open");
    runGuiCommand(command, "gui");
  }

  function focusStartMenuItem(item) {
    if (!item) return;
    item.focus({ preventScroll: true });
  }

  function getStartMenuItems() {
    return Array.from(dom.startMenu?.querySelectorAll("li[data-command]") || []);
  }

  function handleStartMenuKeydown(event) {
    const items = getStartMenuItems();
    if (!items.length) return;
    const current = event.target.closest("li[data-command]");
    const currentIndex = Math.max(0, items.indexOf(current));

    if (event.key === "Escape") {
      event.preventDefault();
      dom.startMenu.classList.add("hidden");
      dom.startButton?.focus({ preventScroll: true });
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusStartMenuItem(items[(currentIndex + 1) % items.length]);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusStartMenuItem(items[(currentIndex - 1 + items.length) % items.length]);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusStartMenuItem(items[0]);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusStartMenuItem(items[items.length - 1]);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      if (!current) return;
      event.preventDefault();
      dom.startMenu.classList.add("hidden");
      reactPetForGuiIcon(current.dataset.command, "open");
      runGuiCommand(current.dataset.command, "gui");
    }
  }

  function getDesktopIcons() {
    return Array.from(dom.desktop?.querySelectorAll(".desktop-icon") || []);
  }

  function scoreDesktopCandidate(currentRect, candidateRect, direction) {
    const dx = candidateRect.left - currentRect.left;
    const dy = candidateRect.top - currentRect.top;
    const axisGapX = Math.abs(dx);
    const axisGapY = Math.abs(dy);

    if (direction === "ArrowLeft" && dx >= -4) return Number.POSITIVE_INFINITY;
    if (direction === "ArrowRight" && dx <= 4) return Number.POSITIVE_INFINITY;
    if (direction === "ArrowUp" && dy >= -4) return Number.POSITIVE_INFINITY;
    if (direction === "ArrowDown" && dy <= 4) return Number.POSITIVE_INFINITY;

    const major = direction === "ArrowLeft" || direction === "ArrowRight" ? axisGapX : axisGapY;
    const minor = direction === "ArrowLeft" || direction === "ArrowRight" ? axisGapY : axisGapX;
    return major * 100 + minor;
  }

  function focusNextDesktopIcon(currentIcon, direction) {
    const icons = getDesktopIcons();
    if (!icons.length) return;
    const currentRect = currentIcon.getBoundingClientRect();
    let bestIcon = null;
    let bestScore = Number.POSITIVE_INFINITY;

    icons.forEach((icon) => {
      if (icon === currentIcon) return;
      const score = scoreDesktopCandidate(currentRect, icon.getBoundingClientRect(), direction);
      if (score < bestScore) {
        bestScore = score;
        bestIcon = icon;
      }
    });

    if (!bestIcon) return;
    selectDesktopIcon(bestIcon);
  }

  function selectDesktopIcon(icon) {
    if (selectedDesktopIcon && selectedDesktopIcon !== icon) {
      selectedDesktopIcon.classList.remove("selected");
    }
    selectedDesktopIcon = icon;
    if (selectedDesktopIcon) {
      selectedDesktopIcon.classList.add("selected");
      selectedDesktopIcon.focus({ preventScroll: true });
    }
  }

  function clearDesktopSelection() {
    if (!selectedDesktopIcon) return;
    selectedDesktopIcon.classList.remove("selected");
    selectedDesktopIcon = null;
  }

  function openDesktopCommand(command) {
    runGuiCommand(command, "gui");
  }

  function handleDesktopClick(event) {
    const icon = event.target.closest(".desktop-icon");
    if (!icon) {
      clearDesktopSelection();
      return;
    }
    selectDesktopIcon(icon);
    const command = icon.dataset.command;
    reactPetForGuiIcon(command, "select");
  }

  function handleDesktopDblClick(event) {
    const icon = event.target.closest(".desktop-icon");
    if (!icon) return;
    const command = icon.dataset.command;
    reactPetForGuiIcon(command, "open");
    openDesktopCommand(command);
  }

  function handleDesktopKeydown(event) {
    const icon = event.target.closest(".desktop-icon");
    if (!icon) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      focusNextDesktopIcon(icon, event.key);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const command = icon.dataset.command;
      reactPetForGuiIcon(command, "open");
      openDesktopCommand(command);
    }
  }

  function openGuiWindow(command) {
    const title = getWindowTitle(command);
    windowManager.createWindow({
      title,
      commandKey: command,
      contentFactory: () => buildGuiContent(command)
    });
  }

  function handleDocumentClick(event) {
    if (!dom.startMenu.classList.contains("hidden")) {
      const isStart = dom.startMenu.contains(event.target) || dom.startButton.contains(event.target);
      if (!isStart) {
        dom.startMenu.classList.add("hidden");
      }
    }

    if (state.commandMenuOpen) {
      const panel = dom.commandMenu.querySelector(".command-menu-panel");
      if (event.target === dom.commandMenu || !panel.contains(event.target)) {
        closeCommandMenu();
      }
    }

    if (!event.target.closest(".desktop-icon")) {
      clearDesktopSelection();
    }
  }

  function clearOutput() {
    dom.terminalOutput.innerHTML = "";
  }

  function shouldTypeLines(lines) {
    return shouldTypeLinesByVolume(lines);
  }

  function appendOutputLines(lines, options = {}) {
    if (!lines || lines.length === 0) return Promise.resolve();
    const shouldType = options.typing === true || (state.options.typing && options.typing !== false);
    if (shouldType) {
      const speed = typeof options.speed === "number" ? options.speed : state.options.typingSpeed;
      return typeLines(lines, speed);
    } else {
      lines.forEach((line) => appendOutputLine(line));
      return Promise.resolve();
    }
  }

  async function typeLines(lines, speed) {
    for (const line of lines) {
      await typeLine(line, speed);
    }
  }

  function typeLine(line, speed) {
    return new Promise((resolve) => {
      const lineEl = document.createElement("div");
      lineEl.className = "terminal-line";
      dom.terminalOutput.append(lineEl);
      trimTerminalOutput();
      scrollToBottom();

      const safeLine = line == null ? "" : String(line);
      const plain = removeAnsi(safeLine);
      if (!plain.length) {
        renderLineContent(lineEl, safeLine);
        resolve();
        return;
      }

      let i = 0;
      const { chunk, tickMs } = getTypingRenderProfile({
        lineLength: plain.length,
        speed: Number(speed) || state.options.typingSpeed || 12,
        reducedMotion: state.options.reducedMotion
      });
      const interval = setInterval(() => {
        i += chunk;
        lineEl.textContent = plain.slice(0, i);
        scrollToBottom();
        if (i >= plain.length) {
          clearInterval(interval);
          lineEl.textContent = "";
          renderLineContent(lineEl, safeLine);
          resolve();
        }
      }, tickMs);
    });
  }

  function appendOutputLine(line, type) {
    const lineEl = document.createElement("div");
    lineEl.className = "terminal-line";
    if (type === "error") {
      lineEl.classList.add("error");
      lineEl.textContent = line;
    } else {
      if (type) {
        lineEl.classList.add(type);
      }
      renderLineContent(lineEl, line);
    }
    dom.terminalOutput.append(lineEl);
    trimTerminalOutput();
    scrollToBottom();
  }

  function renderLines(container, lines, options = {}) {
    if (!lines || lines.length === 0) {
      container.textContent = getUi().noContent;
      return;
    }
    lines.forEach((line) => {
      const lineEl = document.createElement("div");
      lineEl.className = "terminal-line";
      renderLineContent(lineEl, line);
      container.append(lineEl);
    });
  }

  function renderLineContent(lineEl, line) {
    const safeLine = line == null ? "" : String(line);
    const segments = parseAnsi(safeLine);
    segments.forEach((segment) => {
      const span = document.createElement("span");
      if (segment.className) {
        span.classList.add(segment.className);
      }
      linkify(segment.text, span);
      lineEl.append(span);
    });
  }

  function parseAnsi(text) {
    ANSI_REGEX.lastIndex = 0;
    const segments = [];
    let lastIndex = 0;
    let currentClass = null;
    let match;

    while ((match = ANSI_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: text.slice(lastIndex, match.index), className: currentClass });
      }
      currentClass = ansiClassFromCode(match[1]);
      lastIndex = ANSI_REGEX.lastIndex;
    }

    if (lastIndex < text.length) {
      segments.push({ text: text.slice(lastIndex), className: currentClass });
    }

    if (segments.length === 0) {
      segments.push({ text, className: null });
    }

    return segments;
  }

  function ansiClassFromCode(code) {
    switch (Number(code)) {
      case 0:
        return null;
      case 30:
        return "ansi-black";
      case 31:
        return "ansi-red";
      case 32:
        return "ansi-green";
      case 33:
        return "ansi-yellow";
      case 34:
        return "ansi-blue";
      case 35:
        return "ansi-magenta";
      case 36:
        return "ansi-cyan";
      case 37:
        return "ansi-white";
      case 90:
        return "ansi-bright-black";
      default:
        return null;
    }
  }

  function removeAnsi(text) {
    ANSI_REGEX.lastIndex = 0;
    return text.replace(ANSI_REGEX, "");
  }

  function linkify(text, container) {
    LINK_REGEX.lastIndex = 0;
    let lastIndex = 0;
    let match;

    while ((match = LINK_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        container.append(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      const token = match[0];
      const isEmail = token.includes("@") && !token.startsWith("http");
      const type = classifyLink(token, isEmail);
      const anchor = document.createElement("a");
      anchor.classList.add("link");
      applyLinkClasses(anchor, token, isEmail, type);

      const icon = buildLinkIcon(type);
      anchor.append(icon, document.createTextNode(token));
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      container.append(anchor);
      lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
      container.append(document.createTextNode(text.slice(lastIndex)));
    }
  }

  function classifyLink(token, isEmail) {
    if (isEmail) return "email";
    const lower = token.toLowerCase();
    if (lower.includes("github.com")) return "github";
    if (lower.includes("linkedin.com")) return "linkedin";
    if (lower.includes("instagram.com")) return "instagram";
    if (lower.includes("codeforces.com")) return "codeforces";
    if (lower.includes("beecrowd.com")) return "beecrowd";
    return "link";
  }

  function applyLinkClasses(anchor, token, isEmail, type) {
    if (isEmail) {
      anchor.href = `mailto:${token}`;
      anchor.classList.add("link-email");
    } else {
      anchor.href = token;
    }

    if (type === "github") anchor.classList.add("link-github");
    if (type === "linkedin") anchor.classList.add("link-linkedin");
    if (type === "instagram") anchor.classList.add("link-instagram");
    if (type === "codeforces") anchor.classList.add("link-codeforces");
    if (type === "email") anchor.classList.add("link-email");
  }

  function buildLinkIcon(type) {
    const icon = document.createElement("span");
    icon.className = `link-icon link-icon-${type}`;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = linkIconLabel(type);
    return icon;
  }

  function linkIconLabel(type) {
    switch (type) {
      case "github":
        return "GH";
      case "linkedin":
        return "IN";
      case "instagram":
        return "IG";
      case "codeforces":
        return "CF";
      case "email":
        return "@";
      case "beecrowd":
        return "BC";
      default:
        return "LN";
    }
  }

  function updateThemeColor(theme) {
    const color = THEME_COLOR_MAP[theme] || THEME_COLOR_MAP.dark;
    const meta = dom.themeColorMeta || document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", color);
    }
  }

  function setTheme(theme, options = {}) {
    const normalized = String(theme || "").toLowerCase();
    const themeClass = normalized === "secret" ? "theme-secret" : `theme-${normalized}`;
    const allowed = normalized === "secret" ? state.secretUnlocked : THEMES.includes(normalized);
    if (!allowed) return false;
    const previousTheme = state.theme;
    document.body.classList.remove(...THEME_CLASSES);
    document.body.classList.add(themeClass);
    state.theme = normalized;
    updateThemeColor(normalized);
    updateMatrixState();
    if (options.persist !== false) {
      writeStoredValue(STORAGE_KEYS.theme, normalized);
    }
    if (state.pet.active && previousTheme !== normalized) {
      reactPet("themeChange", { meta: { theme: normalized }, persistMs: PET_PERSIST_MS.themeChange });
    }
    return true;
  }

  function applyGuiMono(enabled, options = {}) {
    state.guiMono = Boolean(enabled);
    document.body.classList.toggle("gui-mono", state.guiMono);
    if (options.persist) {
      writeStoredValue(STORAGE_KEYS.guiMono, state.guiMono ? "1" : "0");
    }
    updateMonoToggle();
  }

  function applyReducedMotion(enabled, options = {}) {
    state.options.reducedMotion = Boolean(enabled);
    document.body.classList.toggle("reduced-motion", state.options.reducedMotion);
    if (options.persist) {
      writeStoredValue(STORAGE_KEYS.reducedMotion, state.options.reducedMotion ? "1" : "0");
    }
  }

  function restoreUserPreferences() {
    const storedTheme = String(readStoredValue(STORAGE_KEYS.theme) || "").toLowerCase();
    if (storedTheme && (THEMES.includes(storedTheme) || (storedTheme === "secret" && state.secretUnlocked))) {
      state.theme = storedTheme;
    }

    // Sempre iniciar em GUI, ignorando modo persistido de sessões anteriores.
    state.mode = INITIAL_MODE;
    removeStoredValue(STORAGE_KEYS.mode);

    const storedTypingSpeed = toFiniteNumber(readStoredValue(STORAGE_KEYS.typingSpeed), state.options.typingSpeed);
    state.options.typingSpeed = Math.min(18, Math.max(1, Math.round(storedTypingSpeed)));

    const storedGuiMono = normalizeStoredBoolean(readStoredValue(STORAGE_KEYS.guiMono));
    if (storedGuiMono != null) {
      applyGuiMono(storedGuiMono, { persist: false });
    }

    const systemReducedMotion =
      Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const storedReducedMotion = normalizeStoredBoolean(readStoredValue(STORAGE_KEYS.reducedMotion));
    applyReducedMotion(storedReducedMotion == null ? systemReducedMotion : storedReducedMotion, {
      persist: false
    });

    const storedPetActive = normalizeStoredBoolean(readStoredValue(STORAGE_KEYS.petActive));
    if (storedPetActive != null) {
      state.pet.active = PET_ALWAYS_ACTIVE ? true : storedPetActive;
    }
  }

  function updateMonoToggle() { }

  function updateMatrixState() {
    const shouldEnable = isAsciiTheme();
    if (shouldEnable) {
      enableMatrix();
    } else {
      disableMatrix();
    }
  }

  function enableMatrix() {
    if (state.matrix.active) return;
    const canvas = document.createElement("canvas");
    canvas.className = "matrix-canvas";
    const host = document.getElementById("app") || document.body;
    host.prepend(canvas);
    state.matrix.canvas = canvas;
    state.matrix.ctx = canvas.getContext("2d");
    state.matrix.active = true;
    state.matrix.lastTs = 0;
    state.matrix.lastRenderAt = 0;
    state.matrix.smoothedDt = 1;
    state.matrix.performanceTier = state.options.reducedMotion ? "low" : "high";
    state.matrix.fireBursts = [];
    state.matrix.fireTelemetry = createFireTelemetryState();
    resizeMatrix();
    runMatrix();
    window.addEventListener("resize", resizeMatrix);
  }

  function disableMatrix() {
    if (!state.matrix.active) return;
    cancelAnimationFrame(state.matrix.animationId);
    state.matrix.animationId = null;
    if (state.matrix.canvas) {
      state.matrix.canvas.remove();
    }
    state.matrix.active = false;
    state.matrix.canvas = null;
    state.matrix.ctx = null;
    state.matrix.drops = [];
    state.matrix.speeds = [];
    state.matrix.offsets = [];
    state.matrix.lastTs = 0;
    state.matrix.lastRenderAt = 0;
    state.matrix.smoothedDt = 1;
    state.matrix.performanceTier = "high";
    state.matrix.fireHeat = [];
    state.matrix.fireCols = 0;
    state.matrix.fireRows = 0;
    state.matrix.fireBursts = [];
    state.matrix.fireTelemetry = createFireTelemetryState();
    window.__FIRE_TELEMETRY__ = null;
    window.removeEventListener("resize", resizeMatrix);
  }

  function resizeMatrix() {
    if (!state.matrix.canvas || !state.matrix.ctx) return;
    const hostRect = (document.getElementById("app") || document.body).getBoundingClientRect();
    const width = Math.max(1, Math.round(hostRect.width || window.innerWidth));
    const height = Math.max(1, Math.round(hostRect.height || window.innerHeight));
    const dpr = window.devicePixelRatio || 1;
    state.matrix.canvas.width = width * dpr;
    state.matrix.canvas.height = height * dpr;
    state.matrix.canvas.style.width = `${width}px`;
    state.matrix.canvas.style.height = `${height}px`;
    state.matrix.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.matrix.width = width;
    state.matrix.height = height;
    const preset = getMatrixPreset();
    if (state.theme === "fire") {
      const qualityConfig = getMatrixQualityConfig(
        state.matrix.performanceTier,
        state.options.reducedMotion,
        state.theme
      );
      const fireColumnWidth = getFireColumnWidth(preset, qualityConfig);
      ensureFireGrid(state.matrix, width, height, fireColumnWidth);
    } else {
      fillMatrixColumns(height, preset.columnWidth, preset);
    }
  }

  function runMatrix() {
    const ctx = state.matrix.ctx;
    if (!ctx) return;
    const preset = getMatrixPreset();
    if (!isAsciiTheme()) {
      disableMatrix();
      return;
    }

    const now = performance.now();
    if (!state.matrix.lastTs) {
      state.matrix.lastTs = now;
    }
    const dt = clamp((now - state.matrix.lastTs) / 16.67, 0.45, 2.2);
    state.matrix.lastTs = now;
    const performanceState = updateMatrixPerformanceState(state.matrix, dt, state.options.reducedMotion);
    state.matrix.smoothedDt = performanceState.smoothedDt;
    let nextTier = performanceState.performanceTier;
    if (state.theme === "fire") {
      nextTier = resolveFirePerformanceTier({
        telemetry: state.matrix.fireTelemetry,
        currentTier: nextTier,
        reducedMotion: state.options.reducedMotion,
        now
      });
    }
    state.matrix.performanceTier = nextTier;
    const qualityConfig = getMatrixQualityConfig(
      state.matrix.performanceTier,
      state.options.reducedMotion,
      state.theme
    );
    if (!shouldRenderMatrixFrame(now, state.matrix.lastRenderAt, qualityConfig.frameIntervalMs)) {
      state.matrix.animationId = requestAnimationFrame(runMatrix);
      return;
    }
    state.matrix.lastRenderAt = now;
    const motionFactor = state.options.reducedMotion ? 0.38 : 1;

    const width = state.matrix.width || window.innerWidth;
    const height = state.matrix.height || window.innerHeight;
    if (state.theme === "fire") {
      const telemetry = runDoomFireFrame({
        matrixState: state.matrix,
        ctx,
        now,
        dt,
        motionFactor,
        width,
        height,
        preset,
        qualityConfig,
        reducedMotion: state.options.reducedMotion
      });
      state.matrix.performanceTier = resolveFirePerformanceTier({
        telemetry,
        currentTier: state.matrix.performanceTier,
        reducedMotion: state.options.reducedMotion,
        now
      });
      window.__FIRE_TELEMETRY__ = getFireTelemetrySnapshot(state.matrix, state.matrix.performanceTier);
      state.matrix.animationId = requestAnimationFrame(runMatrix);
      return;
    }
    window.__FIRE_TELEMETRY__ = null;

    ctx.fillStyle = preset.trail;
    ctx.fillRect(0, 0, width, height);

    const chars = String(preset.chars || "01");
    const charsLen = chars.length;
    const columnWidth = Math.max(
      10,
      Math.round((Number(preset.columnWidth) || 14) * (qualityConfig.columnScale || 1))
    );
    const drawStride = Math.max(1, Number(qualityConfig.drawStride) || 1);
    ctx.font = `${preset.fontSize}px monospace`;
    ctx.textBaseline = "top";
    ctx.shadowBlur = state.options.reducedMotion ? 0 : Number(qualityConfig.shadowBlur ?? 8);
    ctx.shadowColor = preset.glow;

    const expectedColumns = Math.max(1, Math.floor(width / columnWidth));
    if (state.matrix.drops.length !== expectedColumns || state.matrix.columns !== expectedColumns) {
      fillMatrixColumns(height, columnWidth, preset);
    }
    state.matrix.drops.forEach((drop, index) => {
      const charIndex = (Math.floor(drop + state.matrix.offsets[index] + Math.random() * 2) + index) % charsLen;
      const text = chars.charAt(charIndex);
      const x = index * columnWidth;
      const y = drop * columnWidth;
      if (state.theme === "secret") {
        const pulse = (Math.sin(now * 0.003 + index * 0.4) + 1) * 0.5;
        ctx.fillStyle = pulse > 0.64 ? preset.colorAlt : preset.color;
      } else {
        ctx.fillStyle = preset.color;
      }
      if (index % drawStride === 0) {
        ctx.fillText(text, x, y);
      }
      if (y > height + columnWidth * 2 && Math.random() > preset.resetChance) {
        state.matrix.drops[index] = Math.random() * 4;
        state.matrix.offsets[index] = randomCharIndex(charsLen);
        state.matrix.speeds[index] = preset.baseSpeed + Math.random() * Math.max(0.01, preset.speedVariance);
      } else {
        state.matrix.drops[index] = drop + state.matrix.speeds[index] * dt * motionFactor;
      }
    });
    ctx.shadowBlur = 0;

    state.matrix.animationId = requestAnimationFrame(runMatrix);
  }

  function startClock() {
    const update = () => {
      const now = new Date();
      if (!dom.taskbarClock) return;
      dom.taskbarClock.textContent = now.toLocaleTimeString(state.locale || "pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      });
    };
    update();
    if (state.clockInterval) {
      clearInterval(state.clockInterval);
    }
    state.clockInterval = setInterval(update, 1000);
  }

  function ensureAudio() {
    if (!audioState.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioState.context = new AudioContext();
    }
    if (audioState.context.state === "suspended") {
      audioState.context.resume();
    }
  }

  function playClick() {
    if (!audioState.context) return;
    const now = audioState.context.currentTime;
    if (now - audioState.lastTime < 0.02) return;
    audioState.lastTime = now;
    const osc = audioState.context.createOscillator();
    const gain = audioState.context.createGain();
    osc.type = "square";
    osc.frequency.value = 900;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(audioState.context.destination);
    osc.start(now);
    osc.stop(now + 0.02);
  }

  function shouldPlayKeyClick(event) {
    if (event.repeat) return false;
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    if (event.key.length === 1) return true;
    return event.key === "Enter" || event.key === "Backspace";
  }

  function highlightLinesWithAnsi(lines, keywords) {
    if (!keywords || keywords.length === 0) return lines;
    return lines.map((line) => highlightTextWithAnsi(String(line), keywords));
  }

  function highlightTextWithAnsi(text, keywords) {
    const segments = splitByKeywords(text, keywords);
    return segments
      .map((segment) =>
        segment.highlight ? `\u001b[35m${segment.text}\u001b[0m` : segment.text
      )
      .join("");
  }

  function splitByKeywords(text, keywords) {
    if (!keywords || keywords.length === 0) {
      return [{ text, highlight: false }];
    }
    const ordered = [...keywords].sort((a, b) => b.length - a.length);
    const pattern = ordered.map(escapeRegExp).join("|");
    const regex = new RegExp(`(^|[^\\w])(${pattern})(?=$|[^\\w])`, "gi");

    const segments = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const prefix = match[1] || "";
      const start = match.index + prefix.length;
      const end = start + match[2].length;
      if (start > lastIndex) {
        segments.push({ text: text.slice(lastIndex, start), highlight: false });
      }
      segments.push({ text: text.slice(start, end), highlight: true });
      lastIndex = end;
    }
    if (lastIndex < text.length) {
      segments.push({ text: text.slice(lastIndex), highlight: false });
    }
    return segments;
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function buildGuiContent(commandKey) {
    const content = getContent();
    const messages = getMessages();
    const wrapper = document.createElement("div");
    wrapper.className = "gui-content";

    switch (commandKey) {
      case "about":
        appendAboutContent(wrapper, content);
        break;
      case "social":
        wrapper.classList.add("gui-social");
        appendRowsFromLines(wrapper, content.social);
        break;
      case "resume":
        appendResumeContent(wrapper, content.resume);
        break;
      case "email":
        appendRowsFromLines(wrapper, content.email);
        break;
      case "projects":
        wrapper.classList.add("gui-projects");
        appendProjectCards(wrapper, content.projects || []);
        break;
      case "education":
        appendEducationContent(wrapper, content.education);
        break;
      case "algorithms":
        {
          const shell = document.createElement("div");
          shell.className = "algo-viewer";
          shell.textContent = messages.algoStatusReady || "Pronto para iniciar.";
          shell.__windowMeta = {
            size: { width: 520, height: 420 },
            onClose: () => {
              shell.__cleanup?.();
            }
          };
          wrapper.append(shell);
          loadAlgorithmViewer(shell);
        }
        break;
      case "cnn":
        {
          const shell = document.createElement("div");
          shell.className = "cnn-demo";
          shell.textContent = messages.cnnStatusLoading || "Carregando modelo...";
          shell.__windowMeta = {
            size: { width: 620, height: 520 }
          };
          wrapper.append(shell);
          loadCnnDemo(shell);
        }
        break;
      case "snake":
        {
          const shell = document.createElement("div");
          shell.className = "snake-game";
          shell.textContent = messages.snakeHint || "Loading Snake...";
          shell.__windowMeta = {
            size: { width: 360, height: 420 },
            onClose: () => {
              shell.__cleanup?.();
            },
            onFocus: () => {
              shell.__focus?.();
            }
          };
          wrapper.append(shell);
          loadSnakeGame(shell);
        }
        break;
      default:
        wrapper.textContent = getUi().noContent;
        break;
    }

    return wrapper;
  }

  function loadCnnDemo(container) {
    import(`./modules/cnnDemo.js?v=${APP_VERSION}`)
      .then((mod) => {
        mod.mountCnnDemo(container, { getMessages, createGuiButton });
      })
      .catch(() => {
        container.textContent = getMessages().cnnStatusError || "Erro ao carregar o modelo.";
        showErrorBanner(container.textContent, 2600);
      });
  }

  function loadAlgorithmViewer(container) {
    import(`./modules/algorithmViewer.js?v=${APP_VERSION}`)
      .then((mod) => {
        container.textContent = "";
        mod.mountAlgorithmViewer(container, { getMessages, createGuiButton });
      })
      .catch((error) => {
        const fallback =
          state.language === "pt"
            ? "Erro ao carregar visualizador de algoritmos."
            : "Failed to load algorithm viewer.";
        container.textContent = fallback;
        showErrorBanner(fallback, 2600);
        logClientError("loadAlgorithmViewer", error);
      });
  }

  function loadSnakeGame(container) {
    import(`./modules/snakeGame.js?v=${APP_VERSION}`)
      .then((mod) => {
        container.textContent = "";
        mod.mountSnakeGame(container, {
          getMessages,
          createGuiButton,
          formatTemplate,
          isGuiMode: () => state.mode === "gui"
        });
      })
      .catch((error) => {
        const fallback = state.language === "pt" ? "Erro ao carregar Snake." : "Failed to load Snake.";
        container.textContent = fallback;
        showErrorBanner(fallback, 2600);
        logClientError("loadSnakeGame", error);
      });
  }

  function canPrewarmGuiModules() {
    const nav = navigator;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn?.saveData) return false;
    const effectiveType = String(conn?.effectiveType || "").toLowerCase();
    if (["slow-2g", "2g", "3g"].includes(effectiveType)) return false;
    const deviceMemory = Number(nav.deviceMemory || 4);
    return deviceMemory >= 4;
  }

  function prewarmGuiModules() {
    if (!canPrewarmGuiModules()) return;
    const defer = window.requestIdleCallback
      ? (cb) => window.requestIdleCallback(cb, { timeout: 2400 })
      : (cb) => setTimeout(cb, 1000);
    defer(() => {
      import(`./modules/algorithmViewer.js?v=${APP_VERSION}`).catch(() => null);
      setTimeout(() => {
        import(`./modules/snakeGame.js?v=${APP_VERSION}`).catch(() => null);
      }, 600);
      setTimeout(() => {
        import(`./modules/cnnDemo.js?v=${APP_VERSION}`).catch(() => null);
      }, 1200);
    });
  }

  function createGuiButton(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gui-button";
    button.textContent = label;
    if (onClick) {
      button.addEventListener("click", onClick);
    }
    return button;
  }

  function appendAboutContent(wrapper, content) {
    const meta = content.meta || {};
    const keywords = content.aboutKeywords || [];
    const header = document.createElement("div");
    header.className = "about-header";
    const photo = document.createElement("img");
    photo.className = "about-photo";
    photo.src = "assets/Matheus.webp";
    photo.alt = meta.name ? `Foto de ${meta.name}` : "Foto de perfil";
    header.append(photo);

    if (meta.name || meta.role || meta.location) {
      const info = document.createElement("div");
      info.className = "about-info";
      const name = document.createElement("div");
      name.className = "about-name";
      name.textContent = meta.name || "";
      const role = document.createElement("div");
      role.className = "about-role";
      role.textContent = [meta.role, meta.location].filter(Boolean).join(" • ");
      info.append(name, role);
      header.append(info);
    }

    wrapper.append(header);

    (content.about || []).forEach((line) => {
      const p = document.createElement("p");
      appendHighlightedText(p, String(line), keywords);
      wrapper.append(p);
    });
  }

  function appendRowsFromLines(wrapper, lines = []) {
    if (!lines.length) {
      const empty = document.createElement("div");
      empty.textContent = getUi().noContent;
      wrapper.append(empty);
      return;
    }

    lines.forEach((line) => {
      const text = String(line);
      const match = text.match(/^([^:]+):\s*(.+)$/);
      if (!match) {
        const p = document.createElement("p");
        linkify(text, p);
        wrapper.append(p);
        return;
      }

      const row = document.createElement("div");
      row.className = "gui-row";
      const label = document.createElement("div");
      label.className = "gui-row-label";
      label.textContent = match[1];
      const value = document.createElement("div");
      linkify(match[2], value);
      row.append(label, value);
      wrapper.append(row);
    });
  }

  function appendResumeContent(wrapper, lines = []) {
    if (!lines.length) {
      const empty = document.createElement("div");
      empty.textContent = getUi().noContent;
      wrapper.append(empty);
      return;
    }

    const resumeUrl = findFirstUrl(lines);
    if (!resumeUrl) {
      appendRowsFromLines(wrapper, lines);
      return;
    }

    const normalizedUrl = normalizeResumeUrl(resumeUrl);
    const embedUrl = buildResumeEmbedUrl(normalizedUrl);
    const frame = document.createElement("iframe");
    frame.className = "resume-frame";
    frame.src = embedUrl;
    frame.title = "Curriculo";
    frame.loading = "lazy";
    frame.setAttribute("referrerpolicy", "no-referrer");
    wrapper.append(frame);

    const linkWrap = document.createElement("div");
    linkWrap.className = "resume-link";
    const a = document.createElement("a");
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.classList.add("link");
    const type = classifyLink(resumeUrl, false);
    applyLinkClasses(a, resumeUrl, false, type);
    a.append(buildLinkIcon(type), document.createTextNode(resumeUrl));
    linkWrap.append(a);
    wrapper.append(linkWrap);
  }

  function findFirstUrl(lines) {
    if (!Array.isArray(lines)) return "";
    for (const line of lines) {
      const text = String(line || "");
      LINK_REGEX.lastIndex = 0;
      const match = LINK_REGEX.exec(text);
      if (match && match[0]) {
        return match[0];
      }
    }
    return "";
  }

  function normalizeResumeUrl(url) {
    if (!url) return "";
    const driveMatch = url.match(
      /^https?:\/\/drive\.google\.com\/file\/d\/([^/]+)\/(view|preview).*$/
    );
    if (driveMatch) {
      const fileId = driveMatch[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    const match = url.match(
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/
    );
    if (match) {
      const [, owner, repo, branch, path] = match;
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    }
    return url;
  }

  function buildResumeEmbedUrl(url) {
    if (!url) return "";
    if (url.includes("drive.google.com/file/d/") && url.includes("/preview")) {
      return url;
    }
    if (url.includes("docs.google.com/gview")) return url;
    return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
  }

  function appendEducationContent(wrapper, lines = []) {
    if (!lines.length) {
      const empty = document.createElement("div");
      empty.textContent = getUi().noContent;
      wrapper.append(empty);
      return;
    }

    lines.forEach((entry, index) => {
      const { institution, years, logo } = normalizeEducationEntry(entry);
      const row = document.createElement("div");
      const colorIndex = (index % 3) + 1;
      row.className = `edu-item edu-item-${colorIndex}`;

      if (logo) {
        const img = document.createElement("img");
        img.className = "edu-logo";
        img.src = logo;
        img.alt = institution ? `Logo ${institution}` : "Logo da instituicao";
        img.loading = "lazy";
        row.append(img);
      }

      const textWrap = document.createElement("div");
      textWrap.className = "edu-text";

      const nameSpan = document.createElement("span");
      nameSpan.className = "edu-name";
      nameSpan.textContent = institution || String(entry || "");
      textWrap.append(nameSpan);

      if (years) {
        const sep = document.createElement("span");
        sep.className = "edu-sep";
        sep.textContent = " | ";
        textWrap.append(sep);

        const yearsSpan = document.createElement("span");
        yearsSpan.className = "edu-years";
        yearsSpan.textContent = years;
        textWrap.append(yearsSpan);
      }

      row.append(textWrap);
      wrapper.append(row);
    });
  }

  function appendProjectCards(wrapper, projects) {
    const ui = getUi();
    const messages = getMessages();
    if (!projects.length) {
      const empty = document.createElement("div");
      empty.textContent = ui.noProjects;
      wrapper.append(empty);
      return;
    }

    const curated = projects.slice(0, 6);
    curated.forEach((project, index) => {
      const card = document.createElement("div");
      card.className = "gui-card project-card";

      if (project.cover) {
        const cover = document.createElement("img");
        cover.className = "project-cover";
        cover.src = project.cover;
        cover.alt = project.name ? `Capa do projeto ${project.name}` : "Capa do projeto";
        cover.loading = "lazy";
        card.append(cover);
      }

      const header = document.createElement("div");
      header.className = "project-header";
      const title = document.createElement("h4");
      title.textContent = project.name || messages.projectDefaultName;
      const badge = document.createElement("span");
      badge.className = "project-index";
      badge.textContent = String(index + 1).padStart(2, "0");
      header.append(title, badge);
      card.append(header);

      if (project.description) {
        const desc = document.createElement("p");
        desc.className = "project-desc";
        desc.textContent = project.description;
        card.append(desc);
      }

      if (project.details && project.details !== project.description) {
        const details = document.createElement("p");
        details.className = "project-details";
        details.textContent = project.details;
        card.append(details);
      }

      if (Array.isArray(project.stack) && project.stack.length) {
        const tags = document.createElement("div");
        tags.className = "project-tags";
        project.stack.forEach((item) => {
          const tag = document.createElement("span");
          tag.className = "project-tag";
          tag.textContent = item;
          tags.append(tag);
        });
        card.append(tags);
      }

      const lessons = formatProjectLessons(project, messages);
      if (lessons) {
        const lessonEl = document.createElement("div");
        lessonEl.className = "project-lessons";
        const label = document.createElement("span");
        label.className = "project-lessons-label";
        label.textContent = `${messages.projectLessonsLabel}:`;
        const value = document.createElement("span");
        value.textContent = ` ${lessons}`;
        lessonEl.append(label, value);
        card.append(lessonEl);
      }

      if (Array.isArray(project.links) && project.links.length) {
        const links = document.createElement("div");
        links.className = "gui-links project-links";
        project.links.forEach((link) => {
          const a = document.createElement("a");
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.classList.add("link");
          const isEmail = link.includes("@") && !link.startsWith("http");
          const type = classifyLink(link, isEmail);
          applyLinkClasses(a, link, isEmail, type);
          a.append(buildLinkIcon(type), document.createTextNode(link));
          links.append(a);
        });
        card.append(links);
      }

      wrapper.append(card);
    });
  }

  function appendHighlightedText(container, text, keywords) {
    const segments = splitByKeywords(text, keywords);
    segments.forEach((segment) => {
      if (segment.highlight) {
        const span = document.createElement("span");
        span.className = "keyword-magenta";
        span.textContent = segment.text;
        container.append(span);
      } else {
        linkify(segment.text, container);
      }
    });
  }

  function scrollToBottom() {
    dom.terminalOutput.scrollTop = dom.terminalOutput.scrollHeight;
    dom.terminal.scrollTop = dom.terminal.scrollHeight;
  }

  function trimTerminalOutput(maxLines = TERMINAL_MAX_LINES) {
    if (!dom.terminalOutput) return;
    const overflow = dom.terminalOutput.children.length - maxLines;
    if (overflow <= 0) return;
    for (let i = 0; i < overflow; i += 1) {
      dom.terminalOutput.firstElementChild?.remove();
    }
  }

  function cleanupServiceWorkerForLocalDev() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister()))
      )
      .catch(() => null);

    if (!("caches" in window)) return;
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(SW_CACHE_PREFIX))
            .map((key) => caches.delete(key))
        )
      )
      .catch(() => null);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    const isLocalHost =
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.hostname === "::1";
    if (isLocalHost) {
      cleanupServiceWorkerForLocalDev();
      return;
    }
    if (location.protocol !== "https:") return;

    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register(`./service-worker.js?v=${APP_VERSION}`, { scope: "./" })
      .then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch((error) => {
        // Falha silenciosa: o aplicativo deve continuar em execução mesmo se o registro do software falhar.
        logClientError("registerServiceWorker", error);
      });
  }

  async function init() {
    cacheDom();
    ensurePetMascot();
    bindEvents();
    initCustomCursor();
    state.language = resolveInitialLanguage();
    state.locale = getLocaleForLanguage(state.language);
    restoreUserPreferences();
    registerServiceWorker();
    await loadContent();
    applyLanguage(state.language, { persist: false, announce: false });
    setTheme(state.theme, { persist: false });
    initTerminal();
    setPetActive(state.pet.active || PET_ALWAYS_ACTIVE);
    prewarmGuiModules();
  }

  init();
})();
