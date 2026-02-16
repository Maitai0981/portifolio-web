import {
  buildCommandIndex,
  getPrefixMatches,
  searchCommands,
  suggestCommands
} from "./modules/commandSearch.js";

(() => {
  const INITIAL_MODE = "gui";

  const state = {
    mode: INITIAL_MODE,
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
      typingSpeed: 8
    },
    content: null,
    matrix: {
      active: false,
      canvas: null,
      ctx: null,
      animationId: null,
      columns: 0,
      drops: [],
      width: 0,
      height: 0
    },
    pet: {
      active: false,
      root: null,
      bubble: null,
      art: null,
      hideBubbleTimer: null,
      idleTimer: null,
      reactionTimer: null,
      animationTimer: null,
      currentType: "neutral",
      frameIndex: 0,
      lookDirection: "center",
      lastPointerX: window.innerWidth * 0.5,
      lastPointerY: window.innerHeight * 0.5
    }
  };

  const dom = {
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

  const LINK_REGEX = /((https?:\/\/[^\s]+)|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}))/gi;
  const ANSI_REGEX = /\u001b\[(\d+)m/g;

  const GUI_WINDOW_COMMANDS = [
    "about",
    "social",
    "projects",
    "education",
    "resume",
    "email",
    "algorithms",
    "cnn",
    "snake",
    "terminal"
  ];
  const THEMES = ["dark", "light", "hacker", "retro"];
  const THEME_CLASSES = ["theme-dark", "theme-light", "theme-hacker", "theme-retro", "theme-secret"];
  const THEME_COLOR_MAP = Object.freeze({
    dark: "#0b0d10",
    light: "#f5f6f8",
    hacker: "#020b06",
    retro: "#190f0a",
    secret: "#05030f"
  });
  const PET_TIMING = Object.freeze({
    bubbleMs: 2000,
    idleMs: 12000,
    neutralMs: 1500,
    defaultPersistMs: 1600,
    animationClassMs: 260,
    pointerDeadzonePx: 44
  });
  const PET_PERSIST_MS = Object.freeze({
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
  const PET_REACTION_CLASS_BY_TYPE = Object.freeze({
    click: "is-react-click",
    key: "is-react-key",
    command: "is-react-command",
    reload: "is-react-command",
    modeGui: "is-react-command",
    modeCli: "is-react-command",
    wake: "is-react-command",
    guiIcon: "is-react-command",
    themeChange: "is-react-command",
    error: "is-react-error"
  });
  const COMMANDS = [
    "help",
    "lang",
    "me",
    "about",
    "social",
    "projects",
    "education",
    "resume",
    "curriculum",
    "email",
    "banner",
    "date",
    "neofetch",
    "cowsay",
    "sudo",
    "history",
    "ls",
    "cd",
    "cat",
    "clear",
    "cls",
    "reload",
    "exit",
    "gui",
    "exit-gui",
    "terminal",
    "theme",
    "pet",
    "grep",
    "find",
    "algorithms",
    "cnn",
    "snake"
  ];

  const commandIndex = buildCommandIndex(COMMANDS);

  const FAST_TYPING_SPEED = 2;

  const PET_ASCII_SPRITE_SHEET = {
    neutral: {
      fps: 2,
      loop: true,
      frames: [
        { face: "•ᴥ•", body: "/|_|\\", status: "..." },
        { face: "•ᴥ•", body: "/|_|\\", status: "on-line" },
        { face: "◕ᴥ◕", body: "/|_|\\", status: "aguardando" }
      ]
    },
    wake: {
      fps: 8,
      loop: false,
      frames: [
        { face: "•ᴥ•", body: "/|_|\\", status: "booting..." },
        { face: "ᵔᴥᵔ", body: "/|_|\\", status: "pronto" },
        { face: "•̀ᴥ•́", body: "/|_|\\", status: "monitorando" }
      ]
    },
    click: {
      fps: 10,
      loop: false,
      frames: [
        { face: "⊙ᴥ⊙", body: "/|_|\\", status: "! clique !" },
        { face: "ಠᴥಠ", body: "/|_|\\", status: "te vi" },
        { face: "◉ᴥ◉", body: "/|_|\\", status: "confirmado" }
      ]
    },
    key: {
      fps: 12,
      loop: false,
      frames: [
        { face: "•̀ᴥ•́", body: "/|_|\\", status: "⌨..." },
        { face: "◉ᴥ◉", body: "/|_|\\", status: "digitando" },
        { face: "•̀ᴥ•́", body: "/|_|\\", status: "input lido" }
      ]
    },
    idle: {
      fps: 3,
      loop: true,
      frames: [
        { face: "˘ᴥ˘", body: "/|_|\\", status: "z z z" },
        { face: "-ᴥ-", body: "/|_|\\", status: "economia" },
        { face: "˘ᴥ˘", body: "/|_|\\", status: "..." }
      ]
    },
    command: {
      fps: 8,
      loop: false,
      frames: [
        { face: "•ᴥ•", body: "/|_|\\", status: "processando" },
        { face: "＾ᴥ＾", body: "/|_|\\", status: "ok!" },
        { face: "ᵔᴥᵔ", body: "/|_|\\", status: "concluido" }
      ]
    },
    error: {
      fps: 6,
      loop: false,
      frames: [
        { face: "xᴥx", body: "/|_|\\", status: "erro" },
        { face: "ಠᴥಠ", body: "/|_|\\", status: "vamos de novo" },
        { face: "•ᴥ•", body: "/|_|\\", status: "aguardando" }
      ]
    },
    reload: {
      fps: 7,
      loop: false,
      frames: [
        { face: "↻ᴥ↻", body: "/|_|\\", status: "recarregando" },
        { face: "◉ᴥ◉", body: "/|_|\\", status: "limpando estado" },
        { face: "•ᴥ•", body: "/|_|\\", status: "pronto" }
      ]
    },
    modeGui: {
      fps: 7,
      loop: false,
      frames: [
        { face: "◕ᴥ◕", body: "/|_|\\", status: "▣ GUI" },
        { face: "＾ᴥ＾", body: "/|_|\\", status: "janela aberta" }
      ]
    },
    modeCli: {
      fps: 7,
      loop: false,
      frames: [
        { face: "•ᴥ•", body: "/|_|\\", status: "▤ CLI" },
        { face: "•̀ᴥ•́", body: "/|_|\\", status: "prompt pronto" }
      ]
    },
    guiIcon: {
      fps: 10,
      loop: false,
      frames: [
        { face: "◉ᴥ◉", body: "/|_|\\", status: "icone detectado" },
        { face: "＾ᴥ＾", body: "/|_|\\", status: "GUI em acao" },
        { face: "•ᴥ•", body: "/|_|\\", status: "ok" }
      ]
    },
    themeChange: {
      fps: 8,
      loop: false,
      frames: [
        { face: "◕ᴥ◕", body: "/|_|\\", status: "tema..." },
        { face: "＾ᴥ＾", body: "/|_|\\", status: "sincronizado" },
        { face: "•ᴥ•", body: "/|_|\\", status: "aplicado" }
      ]
    }
  };

  const TRANSITION_MS = 120;
  const APP_VERSION = window.__APP_VERSION__ || "dev";
  const SUPPORTED_LANGS = ["pt", "en"];

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
        petActivated: "Mascote ativado. Digite `pet off` para esconder.",
        petDeactivated: "Mascote ocultado.",
        petAlreadyActive: "O mascote ja esta ativo.",
        petAlreadyInactive: "O mascote ja esta oculto.",
        petStatusOn: "Mascote: ativo",
        petStatusOff: "Mascote: oculto",
        petUsage: "Use: pet | pet on | pet off | pet status",
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
        petActivated: "Mascot activated. Type `pet off` to hide it.",
        petDeactivated: "Mascot hidden.",
        petAlreadyActive: "Mascot is already active.",
        petAlreadyInactive: "Mascot is already hidden.",
        petStatusOn: "Mascot: active",
        petStatusOff: "Mascot: hidden",
        petUsage: "Use: pet | pet on | pet off | pet status",
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
    const stored = normalizeLanguage(localStorage.getItem("portfolioLang"));
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
      ls: ["LS listou tudo. Inventario completo, nivel RPG de terminal."],
      cd: ["CD trocou pasta. Passeio de diretorio sem coleira."],
      cat: ["cat leu arquivo. Eu apoio todo comando com nome de gato."],
      clear: ["Tela limpa. Faxina digital feita com a pata esquerda."],
      cls: ["CLS passado. Chao brilhando, sem poeira de stack trace."],
      reload: ["Reload dado. Reiniciei sem perder minhas 7 vidas de processo."],
      exit: ["Exit? Volta logo, o terminal fica triste sem plateia."],
      gui: ["GUI ativada. Agora com janelas e zero corrente de ar."],
      "exit-gui": ["Saiu da GUI. De volta ao raiz, onde o prompt canta."],
      terminal: ["Terminal aberto. Bem-vindo ao habitat natural dos comandos."],
      theme: ["Tema trocado. Agora sim: fashion week do terminal."],
      pet: ["Chamou o pet? Presente! Com trocadilho e pelo virtual."],
      grep: ["Grep caçando texto. Farejo melhor que bloodhound de regex."],
      find: ["Find em acao. Missao busca e captura concluida."],
      algorithms: ["Algoritmos abertos. Complexidade baixa, carisma alto."],
      cnn: ["CNN carregada. Rede neural ativada, neurio felino curioso."],
      snake: ["Snake aberto. Cobrinha no palco e eu na torcida."],
      default: ["Comando executado. Mais um passo rumo ao dominio mundial do prompt."]
    };

    const jokesEn = {
      help: ["Need help? Even cats read docs when the box has no lid."],
      cat: ["`cat` command approved by the cat mascot authority."],
      grep: ["Pattern hunt started. My whiskers detect regex vibes."],
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
      grep: ["Regex rebelde detectada. Respira e fecha os parenteses."],
      find: ["Nao achei nada. Talvez esteja na pasta do universo paralelo."],
      cd: ["Esse caminho ta mais perdido que cursor sem foco."],
      default: ["Deu erro, mas relaxa: bug tambem e uma feature em treinamento."]
    };
    const errorsEn = {
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
      secret: "secreto"
    };
    const namesEn = {
      dark: "dark",
      light: "light",
      hacker: "hacker",
      retro: "retro",
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
      secret: [`Tema ${label} aplicado. Nivel lendario desbloqueado.`],
      default: [`Tema ${label} aplicado. Casaco novo, mesmo mascote.`]
    };
    const jokesEn = {
      dark: [`${label} theme on. Stealth cat mode engaged.`],
      light: [`${label} theme on. Even my whiskers are brighter.`],
      hacker: [`${label} theme on. Encrypting purr sequence.`],
      retro: [`${label} theme on. Vintage vibes, modern claws.`],
      secret: [`${label} theme on. Legendary mode unlocked.`],
      default: [`${label} theme on. New style, same cat.`]
    };
    const table = isPt ? jokesPt : jokesEn;
    return table[key] || table.default;
  }

  function getPetPhrases(type, meta = {}) {
    const isPt = state.language === "pt";
    const command = String(meta.command || "").toLowerCase();
    const commandText = command ? `\`${command}\`` : isPt ? "esse comando" : "that command";
    const theme = String(meta.theme || state.theme || "").toLowerCase();
    const phrases = {
      wake: isPt
        ? ["Oi! Eu sou seu pet ASCII.", "Ativado. Agora eu reajo a tudo.", "Pronto para acompanhar comandos."]
        : ["Hi! I'm your ASCII pet.", "Activated. I react to everything now.", "Ready to follow commands."],
      click: isPt
        ? ["Clique detectado.", "Ei, senti esse clique.", "To de olho no mouse."]
        : ["Click detected.", "Hey, I felt that click.", "Mouse movement noticed."],
      key: isPt
        ? ["Digitando rapido, hein?", "Input recebido.", "Esse teclado nao para."]
        : ["Typing fast, huh?", "Input received.", "That keyboard never stops."],
      idle: isPt
        ? ["Tudo bem por ai?", "Ainda estou aqui.", "Posso ajudar com outro comando?"]
        : ["Everything okay there?", "I'm still here.", "Need another command?"],
      command: isPt
        ? getPetCommandJokes(command, true)
        : getPetCommandJokes(command, false),
      error: isPt
        ? [`Falhou em ${commandText}.`, ...getPetErrorJokes(command, true)]
        : [`Failed at ${commandText}.`, ...getPetErrorJokes(command, false)],
      reload: isPt
        ? ["Recarregando sessao e mantendo CLI.", "Limpando estado.", "Pronto, terminal renovado."]
        : ["Reloading session and keeping CLI.", "Clearing state.", "Done, refreshed terminal."],
      modeGui: isPt
        ? ["Entrando na GUI.", "Modo grafico ativado.", "GUI aberta."]
        : ["Entering GUI.", "Graphic mode enabled.", "GUI opened."],
      modeCli: isPt
        ? ["Voltando para o terminal.", "CLI ativada.", "Prompt pronto."]
        : ["Back to terminal.", "CLI enabled.", "Prompt ready."],
      guiIcon: isPt
        ? getPetGuiIconJokes(command, true, meta.phase || "open")
        : getPetGuiIconJokes(command, false, meta.phase || "open"),
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
    }
    stopPetAnimation();
    renderPetAscii();

    const frameCount = sprite.frames?.length || 0;
    if (frameCount <= 1) return;

    const fps = Number.isFinite(sprite.fps) && sprite.fps > 0 ? sprite.fps : 6;
    const intervalMs = Math.max(80, Math.round(1000 / fps));
    state.pet.animationTimer = setInterval(() => {
      const currentSprite = getPetSprite(state.pet.currentType);
      const lastFrame = Math.max(0, (currentSprite.frames?.length || 1) - 1);

      if (currentSprite.loop) {
        state.pet.frameIndex = (state.pet.frameIndex + 1) % (lastFrame + 1);
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
    stopPetAnimation();
  }

  function showPetBubble(text, duration = PET_TIMING.bubbleMs) {
    if (!state.pet.bubble) return;
    clearTimeout(state.pet.hideBubbleTimer);
    state.pet.bubble.textContent = text;
    state.pet.bubble.classList.add("is-visible");
    state.pet.hideBubbleTimer = setTimeout(() => {
      state.pet.bubble.classList.remove("is-visible");
      state.pet.hideBubbleTimer = null;
    }, duration);
  }

  function resetPetIdleTimer() {
    if (!state.pet.active) return;
    clearTimeout(state.pet.idleTimer);
    state.pet.idleTimer = setTimeout(() => {
      reactPet("idle", { persistMs: PET_PERSIST_MS.idle });
    }, PET_TIMING.idleMs);
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

  function reactPet(type, options = {}) {
    if (!state.pet.active || !state.pet.root) return;
    const messages = getPetPhrases(type, options.meta || {});
    if (messages.length) {
      showPetBubble(getRandomItem(messages), options.bubbleDuration || PET_TIMING.bubbleMs);
    }
    state.pet.root.classList.remove("is-react-click", "is-react-key", "is-react-command", "is-react-error");
    const animationClass = getPetReactionClass(type);
    if (animationClass) {
      state.pet.root.classList.add(animationClass);
      setTimeout(() => {
        state.pet.root?.classList.remove(animationClass);
      }, PET_TIMING.animationClassMs);
    }
    startPetAnimation(type, { restart: true });
    schedulePetNeutral(options.persistMs || PET_TIMING.defaultPersistMs);
    resetPetIdleTimer();
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
    const enabled = Boolean(active);
    if (enabled === state.pet.active) return false;
    state.pet.active = enabled;
    clearPetTimers();

    if (!state.pet.root) return true;
    if (enabled) {
      state.pet.root.classList.remove("hidden");
      state.pet.root.classList.add("is-active");
      state.pet.root.setAttribute("aria-hidden", "false");
      state.pet.lookDirection = resolvePetLookDirection(state.pet.lastPointerX);
      startPetAnimation("neutral", { restart: true });
      reactPet("wake", { persistMs: PET_PERSIST_MS.wake });
    } else {
      state.pet.root.classList.add("hidden");
      state.pet.root.classList.remove("is-active", "is-react-click", "is-react-key", "is-react-command", "is-react-error");
      state.pet.root.setAttribute("aria-hidden", "true");
      if (state.pet.bubble) {
        state.pet.bubble.classList.remove("is-visible");
      }
      state.pet.currentType = "neutral";
      state.pet.frameIndex = 0;
      renderPetAscii();
    }
    return true;
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

  function handlePetClick() {
    reactPet("click", { persistMs: PET_PERSIST_MS.click });
  }

  function handlePetKeydown(event) {
    if (!state.pet.active) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length === 1 || event.key === "Enter" || event.key === "Backspace") {
      reactPet("key", { persistMs: PET_PERSIST_MS.key });
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
      localStorage.setItem("portfolioLang", normalized);
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
      const response = await fetch(`./data.json?v=${APP_VERSION}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load data.json");
      }
      state.content = await response.json();
    } catch (error) {
      state.content = buildFallbackContent();
      appendOutputLine(messages.loadError, "error");
      announceToScreenReader(messages.loadError);
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
    scrollToBottom();
  }

  async function executeCommand(rawInput, origin) {
    const { command, args } = parseInput(rawInput);
    if (!command) return;
    const result = getCommandResult(command, args);

    if (result.error) {
      appendOutputLine(result.error, "error");
      reactPet("error", { meta: { command }, persistMs: PET_PERSIST_MS.error });
      if (result.lines && result.lines.length > 0) {
        await appendOutputLines(result.lines, {
          typing: shouldTypeLines(result.lines),
          speed: FAST_TYPING_SPEED
        });
      }
      return;
    }

    if (result.lines && result.lines.length > 0) {
      await appendOutputLines(result.lines, {
        typing: shouldTypeLines(result.lines),
        speed: FAST_TYPING_SPEED
      });
    }

    if (command !== "theme" && !["reload", "gui", "terminal"].includes(result.action || "")) {
      reactPet("command", { meta: { command }, persistMs: PET_PERSIST_MS.command });
    }

    if (result.action) {
      if (result.action === "reload") {
        reactPet("reload", { persistMs: PET_PERSIST_MS.reload });
      }
      applyAction(result.action, origin);
    }
  }

  function parseInput(input) {
    const parts = input.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { command: "", args: [] };
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    return { command, args };
  }

  function getCommandResult(command, args) {
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
        return handleMeCommand(args);
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
      case "ls":
        return handleLsCommand(args);
      case "cd":
        return handleCdCommand(args);
      case "cat":
        return handleCatCommand(args);
      case "grep":
      case "find":
        return handleSearchCommand(args);
      case "theme":
        return handleThemeCommand(args);
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

  function handleMeCommand(args) {
    const messages = getMessages();
    const message = args.join(" ").trim();
    if (!message) {
      state.me.active = true;
      return {
        lines: prefixAgentLines(messages.meIntro || [])
      };
    }

    if (isMeExit(message)) {
      state.me.active = false;
      state.me.lastProject = null;
      return { lines: prefixAgentLines([messages.meExit]) };
    }

    state.me.active = true;
    state.me.history.push({ role: "user", text: message });
    const response = buildMeResponse(message);
    state.me.history.push({ role: "assistant", text: response.join("\n") });
    return { lines: prefixAgentLines(response) };
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
    return lines.map((line) => `\u001b[36mMatheus AI:\u001b[0m ${line}`);
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
      if (!state.pet.active) {
        return { lines: [messages.petAlreadyInactive || "Mascote ja oculto."] };
      }
      setPetActive(false);
      return { lines: [messages.petDeactivated || "Mascote ocultado."] };
    }

    if (action === "status") {
      return {
        lines: [state.pet.active ? messages.petStatusOn || "Mascote: ativo" : messages.petStatusOff || "Mascote: oculto"]
      };
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

    return { lines: [isPt ? "Use: pet | pet on | pet off | pet status | pet sheet" : "Use: pet | pet on | pet off | pet status | pet sheet"] };
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
    dom.startMenu.classList.toggle("hidden");
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
    reactPet("guiIcon", { meta: { command, phase }, persistMs });
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
    if (!lines || lines.length === 0) return false;
    const totalChars = lines.reduce((sum, line) => sum + String(line || "").length, 0);
    return lines.length >= 5 || totalChars >= 240;
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
      scrollToBottom();

      const safeLine = line == null ? "" : String(line);
      const plain = removeAnsi(safeLine);
      let i = 0;
      const interval = setInterval(() => {
        i += 1;
        lineEl.textContent = plain.slice(0, i);
        scrollToBottom();
        if (i >= plain.length) {
          clearInterval(interval);
          lineEl.textContent = "";
          renderLineContent(lineEl, safeLine);
          resolve();
        }
      }, speed);
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

  function setTheme(theme) {
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
    if (state.pet.active && previousTheme !== normalized) {
      reactPet("themeChange", { meta: { theme: normalized }, persistMs: PET_PERSIST_MS.themeChange });
    }
    return true;
  }

  function applyGuiMono(enabled, options = {}) {
    state.guiMono = Boolean(enabled);
    document.body.classList.toggle("gui-mono", state.guiMono);
    if (options.persist) {
      localStorage.setItem("portfolioGuiMono", state.guiMono ? "1" : "0");
    }
    updateMonoToggle();
  }

  function restoreGuiPreferences() {
    const stored = localStorage.getItem("portfolioGuiMono");
    if (stored != null) {
      applyGuiMono(stored === "1");
    }
  }

  function updateMonoToggle() { }

  function updateMatrixState() {
    const shouldEnable = state.theme === "hacker" || state.theme === "secret";
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
    dom.terminal.prepend(canvas);
    state.matrix.canvas = canvas;
    state.matrix.ctx = canvas.getContext("2d");
    state.matrix.active = true;
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
    window.removeEventListener("resize", resizeMatrix);
  }

  function resizeMatrix() {
    if (!state.matrix.canvas || !state.matrix.ctx) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    state.matrix.canvas.width = width * dpr;
    state.matrix.canvas.height = height * dpr;
    state.matrix.canvas.style.width = `${width}px`;
    state.matrix.canvas.style.height = `${height}px`;
    state.matrix.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.matrix.width = width;
    state.matrix.height = height;
    const columnWidth = 14;
    const columns = Math.max(1, Math.floor(width / columnWidth));
    state.matrix.columns = columns;
    state.matrix.drops = Array.from({ length: columns }, () => Math.random() * (height / columnWidth));
  }

  function runMatrix() {
    const ctx = state.matrix.ctx;
    if (!ctx) return;
    const width = state.matrix.width || window.innerWidth;
    const height = state.matrix.height || window.innerHeight;
    ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
    ctx.fillRect(0, 0, width, height);

    const chars = "01アイウエオカキクケコサシスセソタチツテト";
    ctx.fillStyle = state.theme === "secret" ? "#66f2ff" : "#38ff84";
    ctx.font = "12px monospace";

    const columnWidth = 14;
    state.matrix.drops.forEach((drop, index) => {
      const text = chars.charAt(Math.floor(Math.random() * chars.length));
      const x = index * columnWidth;
      const y = drop * columnWidth;
      ctx.fillText(text, x, y);
      if (y > height && Math.random() > 0.975) {
        state.matrix.drops[index] = 0;
      } else {
        state.matrix.drops[index] = drop + 1;
      }
    });

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
        wrapper.append(createAlgorithmViewer());
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
        wrapper.append(createSnakeGame());
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

  function createAlgorithmViewer() {
    const messages = getMessages();
    const wrapper = document.createElement("div");
    wrapper.className = "algo-viewer";

    const hint = document.createElement("div");
    hint.className = "algo-hint";
    hint.textContent = messages.algoHint;
    wrapper.append(hint);

    const controls = document.createElement("div");
    controls.className = "algo-controls";

    const algoSelect = document.createElement("select");
    algoSelect.className = "gui-select";
    algoSelect.setAttribute("aria-label", messages.algoSelectLabel || "Select algorithm");
    [
      { value: "bubble", label: messages.algoBubbleLabel },
      { value: "selection", label: messages.algoSelectionLabel },
      { value: "merge", label: messages.algoMergeLabel },
      { value: "quick", label: messages.algoQuickLabel },
      { value: "heap", label: messages.algoHeapLabel },
      { value: "dijkstra", label: messages.algoDijkstraLabel }
    ].forEach((algo) => {
      const option = document.createElement("option");
      option.value = algo.value;
      option.textContent = algo.label;
      algoSelect.append(option);
    });

    const randomBtn = createGuiButton(messages.algoRandom, () => randomize());
    const runBtn = createGuiButton(messages.algoRun, () => toggleRun());
    const stepBtn = createGuiButton(messages.algoStep, () => stepOnce());

    controls.append(algoSelect, randomBtn, runBtn, stepBtn);
    wrapper.append(controls);

    const view = document.createElement("div");
    view.className = "algo-view";

    const bars = document.createElement("div");
    bars.className = "algo-bars";

    const graph = document.createElement("div");
    graph.className = "algo-graph";

    view.append(bars, graph);
    wrapper.append(view);

    const status = document.createElement("div");
    status.className = "algo-status";
    status.textContent = messages.algoStatusReady;
    wrapper.append(status);

    const BAR_COUNT = 18;
    const graphData = buildDijkstraGraph();
    const graphElements = buildGraphSvg(graphData, graph);
    let values = buildRandomValues();
    let steps = [];
    let stepIndex = 0;
    let running = false;
    let intervalId = null;

    function buildRandomValues() {
      return Array.from({ length: BAR_COUNT }, () => Math.floor(20 + Math.random() * 80));
    }

    function isGraphAlgo(algo) {
      return algo === "dijkstra";
    }

    function buildDijkstraGraph() {
      return {
        nodes: [
          { id: "A", x: 40, y: 40 },
          { id: "B", x: 140, y: 20 },
          { id: "C", x: 240, y: 50 },
          { id: "D", x: 70, y: 130 },
          { id: "E", x: 170, y: 120 },
          { id: "F", x: 260, y: 140 }
        ],
        edges: [
          { from: "A", to: "B", weight: 4 },
          { from: "A", to: "D", weight: 2 },
          { from: "B", to: "C", weight: 6 },
          { from: "B", to: "E", weight: 5 },
          { from: "D", to: "E", weight: 1 },
          { from: "E", to: "C", weight: 2 },
          { from: "D", to: "F", weight: 7 },
          { from: "E", to: "F", weight: 3 }
        ]
      };
    }

    function getEdgeKey(from, to) {
      return [from, to].sort().join("-");
    }

    function buildDistanceLabels(distances) {
      const labels = {};
      graphNodeIds.forEach((id) => {
        const value = distances?.[id];
        labels[id] = Number.isFinite(value) ? String(value) : "INF";
      });
      return labels;
    }

    function buildGraphSvg(data, container) {
      container.innerHTML = "";
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", "0 0 300 180");
      svg.setAttribute("aria-hidden", "true");
      svg.classList.add("algo-graph-svg");

      const nodeMap = new Map(data.nodes.map((node) => [node.id, node]));
      const edgeEls = new Map();
      const nodeEls = new Map();
      const distEls = new Map();

      data.edges.forEach((edge) => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return;
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", from.x);
        line.setAttribute("y1", from.y);
        line.setAttribute("x2", to.x);
        line.setAttribute("y2", to.y);
        line.classList.add("algo-edge");
        const key = getEdgeKey(edge.from, edge.to);
        line.dataset.edge = key;
        edgeEls.set(key, line);
        svg.append(line);

        const weight = document.createElementNS(svgNS, "text");
        weight.setAttribute("x", (from.x + to.x) / 2);
        weight.setAttribute("y", (from.y + to.y) / 2 - 4);
        weight.classList.add("algo-edge-weight");
        weight.textContent = edge.weight;
        svg.append(weight);
      });

      data.nodes.forEach((node) => {
        const group = document.createElementNS(svgNS, "g");
        group.classList.add("algo-node");
        group.dataset.node = node.id;

        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", node.x);
        circle.setAttribute("cy", node.y);
        circle.setAttribute("r", "14");
        group.append(circle);

        const label = document.createElementNS(svgNS, "text");
        label.setAttribute("x", node.x);
        label.setAttribute("y", node.y + 4);
        label.classList.add("algo-node-label");
        label.textContent = node.id;
        group.append(label);

        const dist = document.createElementNS(svgNS, "text");
        dist.setAttribute("x", node.x);
        dist.setAttribute("y", node.y + 26);
        dist.classList.add("algo-node-distance");
        dist.textContent = "INF";
        group.append(dist);

        nodeEls.set(node.id, group);
        distEls.set(node.id, dist);
        svg.append(group);
      });

      container.append(svg);
      return { svg, nodeEls, distEls, edgeEls };
    }

    function buildSteps() {
      const algo = algoSelect.value;
      if (algo === "selection") {
        return buildSelectionSteps(values);
      }
      if (algo === "merge") {
        return buildMergeSteps(values);
      }
      if (algo === "quick") {
        return buildQuickSteps(values);
      }
      if (algo === "heap") {
        return buildHeapSteps(values);
      }
      if (algo === "dijkstra") {
        return buildDijkstraSteps(graphData);
      }
      return buildBubbleSteps(values);
    }

    function buildBubbleSteps(source) {
      const arr = source.slice();
      const output = [];
      for (let i = 0; i < arr.length; i += 1) {
        for (let j = 0; j < arr.length - i - 1; j += 1) {
          output.push({ values: arr.slice(), highlight: [j, j + 1], swap: false });
          if (arr[j] > arr[j + 1]) {
            const temp = arr[j];
            arr[j] = arr[j + 1];
            arr[j + 1] = temp;
            output.push({ values: arr.slice(), highlight: [j, j + 1], swap: true });
          }
        }
      }
      return output;
    }

    function buildSelectionSteps(source) {
      const arr = source.slice();
      const output = [];
      for (let i = 0; i < arr.length - 1; i += 1) {
        let minIndex = i;
        for (let j = i + 1; j < arr.length; j += 1) {
          output.push({ values: arr.slice(), highlight: [minIndex, j], swap: false });
          if (arr[j] < arr[minIndex]) {
            minIndex = j;
          }
        }
        if (minIndex !== i) {
          const temp = arr[i];
          arr[i] = arr[minIndex];
          arr[minIndex] = temp;
          output.push({ values: arr.slice(), highlight: [i, minIndex], swap: true });
        }
      }
      return output;
    }

    function buildMergeSteps(source) {
      const arr = source.slice();
      const temp = source.slice();
      const output = [];

      function mergeSort(start, end) {
        if (end - start <= 1) return;
        const mid = Math.floor((start + end) / 2);
        mergeSort(start, mid);
        mergeSort(mid, end);
        let i = start;
        let j = mid;
        let k = start;
        while (i < mid || j < end) {
          if (j >= end || (i < mid && arr[i] <= arr[j])) {
            temp[k] = arr[i];
            i += 1;
          } else {
            temp[k] = arr[j];
            j += 1;
          }
          output.push({ values: temp.slice(), highlight: [k], swap: false });
          k += 1;
        }
        for (let idx = start; idx < end; idx += 1) {
          arr[idx] = temp[idx];
          output.push({ values: arr.slice(), highlight: [idx], swap: true });
        }
      }

      mergeSort(0, arr.length);
      return output;
    }

    function buildQuickSteps(source) {
      const arr = source.slice();
      const output = [];

      function swap(i, j) {
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }

      function partition(low, high) {
        const pivotValue = arr[high];
        let i = low;
        for (let j = low; j < high; j += 1) {
          output.push({
            values: arr.slice(),
            highlight: [j, high],
            pivot: high,
            swap: false
          });
          if (arr[j] < pivotValue) {
            if (i !== j) {
              swap(i, j);
              output.push({
                values: arr.slice(),
                highlight: [i, j],
                pivot: high,
                swap: true
              });
            }
            i += 1;
          }
        }
        if (i !== high) {
          swap(i, high);
          output.push({
            values: arr.slice(),
            highlight: [i, high],
            pivot: i,
            swap: true
          });
        }
        return i;
      }

      function quickSort(low, high) {
        if (low >= high) return;
        const pivotIndex = partition(low, high);
        quickSort(low, pivotIndex - 1);
        quickSort(pivotIndex + 1, high);
      }

      quickSort(0, arr.length - 1);
      return output;
    }

    function buildHeapSteps(source) {
      const arr = source.slice();
      const output = [];
      const size = arr.length;

      function swap(i, j) {
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }

      function heapify(heapSize, rootIndex) {
        let largest = rootIndex;
        const left = rootIndex * 2 + 1;
        const right = rootIndex * 2 + 2;

        if (left < heapSize) {
          output.push({
            values: arr.slice(),
            highlight: [rootIndex, left],
            swap: false
          });
          if (arr[left] > arr[largest]) {
            largest = left;
          }
        }

        if (right < heapSize) {
          output.push({
            values: arr.slice(),
            highlight: [rootIndex, right],
            swap: false
          });
          if (arr[right] > arr[largest]) {
            largest = right;
          }
        }

        if (largest !== rootIndex) {
          swap(rootIndex, largest);
          output.push({
            values: arr.slice(),
            highlight: [rootIndex, largest],
            swap: true
          });
          heapify(heapSize, largest);
        }
      }

      for (let i = Math.floor(size / 2) - 1; i >= 0; i -= 1) {
        heapify(size, i);
      }

      for (let end = size - 1; end > 0; end -= 1) {
        swap(0, end);
        output.push({
          values: arr.slice(),
          highlight: [0, end],
          swap: true
        });
        heapify(end, 0);
      }

      return output;
    }

    function buildDijkstraSteps(data) {
      const nodes = data.nodes.map((node) => node.id);
      const adjacency = new Map(nodes.map((id) => [id, []]));
      data.edges.forEach((edge) => {
        adjacency.get(edge.from)?.push({ node: edge.to, weight: edge.weight });
        adjacency.get(edge.to)?.push({ node: edge.from, weight: edge.weight });
      });

      const distances = {};
      nodes.forEach((id) => {
        distances[id] = Number.POSITIVE_INFINITY;
      });
      const start = nodes[0];
      distances[start] = 0;

      const visited = new Set();
      const output = [];

      while (visited.size < nodes.length) {
        let current = null;
        let best = Number.POSITIVE_INFINITY;
        nodes.forEach((id) => {
          if (!visited.has(id) && distances[id] < best) {
            best = distances[id];
            current = id;
          }
        });
        if (!current) break;
        output.push({
          type: "graph",
          current,
          visited: Array.from(visited),
          distances: { ...distances }
        });
        visited.add(current);
        const neighbors = adjacency.get(current) || [];
        neighbors.forEach((neighbor) => {
          if (visited.has(neighbor.node)) return;
          const candidate = distances[current] + neighbor.weight;
          if (candidate < distances[neighbor.node]) {
            distances[neighbor.node] = candidate;
            output.push({
              type: "graph",
              current,
              edge: { from: current, to: neighbor.node },
              visited: Array.from(visited),
              distances: { ...distances }
            });
          }
        });
      }

      output.push({
        type: "graph",
        current: null,
        visited: Array.from(visited),
        distances: { ...distances },
        done: true
      });

      return output;
    }

    function ensureBars() {
      if (bars.children.length === BAR_COUNT) return;
      bars.innerHTML = "";
      for (let i = 0; i < BAR_COUNT; i += 1) {
        const bar = document.createElement("div");
        bar.className = "algo-bar";
        bars.append(bar);
      }
    }

    function renderBars(step) {
      ensureBars();
      const highlights = step?.highlight || [];
      const isSwap = step?.swap;
      const pivotIndex = Number.isInteger(step?.pivot) ? step.pivot : null;
      Array.from(bars.children).forEach((bar, index) => {
        bar.style.height = `${values[index]}%`;
        bar.classList.toggle("active", highlights.includes(index));
        bar.classList.toggle("swap", isSwap && highlights.includes(index));
        bar.classList.toggle("pivot", pivotIndex === index);
      });
    }

    function renderGraphBase() {
      renderGraph({
        current: null,
        visited: [],
        distances: buildInitialDistances(graphData)
      });
    }

    function renderGraph(step) {
      if (!graphElements) return;
      const visited = new Set(step?.visited || []);
      const current = step?.current;
      const labels =
        step?.labels ||
        buildDistanceLabels(step?.distances || buildInitialDistances(graphData));
      graphElements.nodeEls.forEach((group, id) => {
        group.classList.toggle("visited", visited.has(id));
        group.classList.toggle("current", current === id);
        const distEl = graphElements.distEls.get(id);
        if (distEl) {
          distEl.textContent = labels[id] ?? "";
        }
      });

      graphElements.edgeEls.forEach((line) => line.classList.remove("active", "selected"));
      const selectedEdges = step?.selectedEdges || [];
      selectedEdges.forEach((edge) => {
        const key = getEdgeKey(edge.from, edge.to);
        const edgeEl = graphElements.edgeEls.get(key);
        if (edgeEl) edgeEl.classList.add("selected");
      });
      if (step?.edge) {
        const key = getEdgeKey(step.edge.from, step.edge.to);
        const edgeEl = graphElements.edgeEls.get(key);
        if (edgeEl) edgeEl.classList.add("active");
      }
    }

    function buildInitialDistances(data) {
      const distances = {};
      data.nodes.forEach((node, index) => {
        distances[node.id] = index === 0 ? 0 : Number.POSITIVE_INFINITY;
      });
      return distances;
    }

    function prepareView() {
      const graphMode = isGraphAlgo(algoSelect.value);
      bars.style.display = graphMode ? "none" : "flex";
      graph.style.display = graphMode ? "block" : "none";
      randomBtn.textContent = graphMode ? messages.algoReset : messages.algoRandom;
    }

    function updateRunLabel() {
      runBtn.textContent = running ? messages.algoPause : messages.algoRun;
    }

    function updateStatus(text) {
      status.textContent = text;
    }

    function resetSteps() {
      steps = [];
      stepIndex = 0;
      updateStatus(messages.algoStatusReady);
      if (isGraphAlgo(algoSelect.value)) {
        renderGraphBase();
      }
    }

    function randomize() {
      if (isGraphAlgo(algoSelect.value)) {
        running = false;
        clearInterval(intervalId);
        intervalId = null;
        resetSteps();
        updateRunLabel();
        return;
      }
      values = buildRandomValues();
      running = false;
      clearInterval(intervalId);
      intervalId = null;
      resetSteps();
      updateRunLabel();
      renderBars();
    }

    function applyStep() {
      const step = steps[stepIndex];
      if (!step) return false;
      if (isGraphAlgo(algoSelect.value)) {
        renderGraph(step);
      } else {
        values = step.values.slice();
        renderBars(step);
      }
      stepIndex += 1;
      return stepIndex < steps.length;
    }

    function stepOnce() {
      if (!steps.length || stepIndex >= steps.length) {
        steps = buildSteps();
        stepIndex = 0;
      }
      if (!applyStep()) {
        updateStatus(messages.algoStatusDone);
      } else {
        updateStatus(messages.algoStatusRunning);
      }
    }

    function startRun() {
      if (!steps.length || stepIndex >= steps.length) {
        steps = buildSteps();
        stepIndex = 0;
      }
      if (!steps.length) {
        updateStatus(messages.algoStatusDone);
        return;
      }
      running = true;
      updateRunLabel();
      updateStatus(messages.algoStatusRunning);
      intervalId = setInterval(() => {
        const hasMore = applyStep();
        if (!hasMore) {
          stopRun();
          updateStatus(messages.algoStatusDone);
        }
      }, 140);
    }

    function stopRun() {
      running = false;
      clearInterval(intervalId);
      intervalId = null;
      updateRunLabel();
    }

    function toggleRun() {
      if (running) {
        stopRun();
        updateStatus(messages.algoStatusReady);
        return;
      }
      startRun();
    }

    algoSelect.addEventListener("change", () => {
      stopRun();
      resetSteps();
      prepareView();
      if (!isGraphAlgo(algoSelect.value)) {
        renderBars();
      }
    });

    prepareView();
    renderBars();
    updateRunLabel();

    wrapper.__windowMeta = {
      size: { width: 520, height: 420 },
      onClose: () => {
        clearInterval(intervalId);
      }
    };

    return wrapper;
  }

  function createSnakeGame() {
    const messages = getMessages();
    const wrapper = document.createElement("div");
    wrapper.className = "snake-game";
    wrapper.tabIndex = 0;

    const hint = document.createElement("div");
    hint.className = "snake-hint";
    hint.textContent = messages.snakeHint;
    wrapper.append(hint);

    const controls = document.createElement("div");
    controls.className = "snake-controls";

    const startBtn = createGuiButton(messages.snakeStart, () => toggleRun());
    const restartBtn = createGuiButton(messages.snakeRestart, () => resetGame());
    controls.append(startBtn, restartBtn);
    wrapper.append(controls);

    const score = document.createElement("div");
    score.className = "snake-score";
    wrapper.append(score);

    const status = document.createElement("div");
    status.className = "snake-status";
    wrapper.append(status);

    const canvas = document.createElement("canvas");
    canvas.className = "snake-canvas";
    const gridSize = 16;
    const cellSize = 16;
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;
    wrapper.append(canvas);

    const ctx = canvas.getContext("2d");
    let snake = [];
    let direction = { x: 1, y: 0 };
    let pendingDirection = { x: 1, y: 0 };
    let food = null;
    let scoreValue = 0;
    let running = false;
    let intervalId = null;
    let gameOver = false;
    let touchStart = null;
    let touchMoved = false;
    const SWIPE_THRESHOLD = 14;

    function updateScore() {
      score.textContent = formatTemplate(messages.snakeScore, { score: scoreValue });
    }

    function setStatus(text) {
      status.textContent = text;
    }

    function buildInitialSnake() {
      return [
        { x: 8, y: 8 },
        { x: 7, y: 8 },
        { x: 6, y: 8 }
      ];
    }

    function spawnFood() {
      let candidate = null;
      let attempts = 0;
      do {
        candidate = {
          x: Math.floor(Math.random() * gridSize),
          y: Math.floor(Math.random() * gridSize)
        };
        attempts += 1;
      } while (snake.some((segment) => segment.x === candidate.x && segment.y === candidate.y) && attempts < 200);
      return candidate;
    }

    function resetGame() {
      stopRun();
      snake = buildInitialSnake();
      direction = { x: 1, y: 0 };
      pendingDirection = { x: 1, y: 0 };
      food = spawnFood();
      scoreValue = 0;
      gameOver = false;
      updateScore();
      setStatus("");
      render();
      updateStartLabel();
    }

    function updateStartLabel() {
      if (gameOver) {
        startBtn.textContent = messages.snakeStart;
        return;
      }
      startBtn.textContent = running ? messages.snakePause : messages.snakeStart;
    }

    function stopRun() {
      running = false;
      clearInterval(intervalId);
      intervalId = null;
      updateStartLabel();
    }

    function startRun() {
      if (gameOver) {
        resetGame();
      }
      running = true;
      updateStartLabel();
      setStatus("");
      intervalId = setInterval(step, 140);
    }

    function toggleRun() {
      if (running) {
        stopRun();
        return;
      }
      startRun();
    }

    function step() {
      direction = pendingDirection;
      const head = { ...snake[0] };
      head.x += direction.x;
      head.y += direction.y;

      if (head.x < 0 || head.y < 0 || head.x >= gridSize || head.y >= gridSize) {
        endGame();
        return;
      }
      if (snake.some((segment) => segment.x === head.x && segment.y === head.y)) {
        endGame();
        return;
      }

      snake.unshift(head);
      if (food && head.x === food.x && head.y === food.y) {
        scoreValue += 1;
        food = spawnFood();
        updateScore();
      } else {
        snake.pop();
      }
      render();
    }

    function endGame() {
      gameOver = true;
      stopRun();
      setStatus(messages.snakeGameOver);
    }

    function renderGrid() {
      ctx.fillStyle = "#f2f2f2";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#d0d0d0";
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridSize; i += 1) {
        const pos = i * cellSize;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(canvas.width, pos);
        ctx.stroke();
      }
    }

    function render() {
      renderGrid();
      ctx.fillStyle = "#1f7a1f";
      snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? "#0c5a0c" : "#1f7a1f";
        ctx.fillRect(segment.x * cellSize + 1, segment.y * cellSize + 1, cellSize - 2, cellSize - 2);
      });
      if (food) {
        ctx.fillStyle = "#b33a3a";
        ctx.fillRect(food.x * cellSize + 2, food.y * cellSize + 2, cellSize - 4, cellSize - 4);
      }
    }

    function handleKey(event) {
      if (state.mode !== "gui") return;
      if (!wrapper.contains(document.activeElement)) return;
      const key = event.key.toLowerCase();
      if (key === " " || key === "spacebar") {
        event.preventDefault();
        toggleRun();
        return;
      }
      const next = {
        arrowup: { x: 0, y: -1 },
        w: { x: 0, y: -1 },
        arrowdown: { x: 0, y: 1 },
        s: { x: 0, y: 1 },
        arrowleft: { x: -1, y: 0 },
        a: { x: -1, y: 0 },
        arrowright: { x: 1, y: 0 },
        d: { x: 1, y: 0 }
      }[key];
      if (!next) return;
      event.preventDefault();
      if (next.x === -direction.x && next.y === -direction.y) return;
      pendingDirection = next;
    }

    function handleTouchStart(event) {
      if (state.mode !== "gui") return;
      const touch = event.touches?.[0];
      if (!touch) return;
      touchStart = { x: touch.clientX, y: touch.clientY };
      touchMoved = false;
    }

    function handleTouchMove(event) {
      if (!touchStart) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
      event.preventDefault();
      touchMoved = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        const next = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
        if (!(next.x === -direction.x && next.y === -direction.y)) {
          pendingDirection = next;
        }
      } else {
        const next = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
        if (!(next.x === -direction.x && next.y === -direction.y)) {
          pendingDirection = next;
        }
      }
      touchStart = null;
    }

    function handleTouchEnd() {
      if (!touchStart) return;
      if (!touchMoved) {
        toggleRun();
      }
      touchStart = null;
    }

    wrapper.addEventListener("pointerdown", () => wrapper.focus({ preventScroll: true }));
    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKey);

    resetGame();

    wrapper.__windowMeta = {
      size: { width: 360, height: 420 },
      onClose: () => {
        clearInterval(intervalId);
        window.removeEventListener("keydown", handleKey);
        canvas.removeEventListener("touchstart", handleTouchStart);
        canvas.removeEventListener("touchmove", handleTouchMove);
        canvas.removeEventListener("touchend", handleTouchEnd);
      },
      onFocus: () => {
        wrapper.focus({ preventScroll: true });
      }
    };

    return wrapper;
  }

  function appendAboutContent(wrapper, content) {
    const meta = content.meta || {};
    const keywords = content.aboutKeywords || [];
    const header = document.createElement("div");
    header.className = "about-header";
    const photo = document.createElement("img");
    photo.className = "about-photo";
    photo.src = "assets/Matheus.jpg";
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
      return `https://github.com/Maitai0981/Curriculo/blob/main/Matheus_Sarago%C3%A7a_curr%C3%ADculo.pdf`;
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

  function unregisterServiceWorkers() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    if ("caches" in window) {
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
    }
  }

  async function init() {
    cacheDom();
    ensurePetMascot();
    bindEvents();
    initCustomCursor();
    state.language = resolveInitialLanguage();
    state.locale = getLocaleForLanguage(state.language);
    unregisterServiceWorkers();
    await loadContent();
    applyLanguage(state.language, { persist: false, announce: false });
    setTheme(state.theme);
    restoreGuiPreferences();
    initTerminal();
  }

  init();
})();
