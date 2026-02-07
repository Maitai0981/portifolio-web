(() => {
  const state = {
    mode: "cli",
    sessionActive: true,
    history: [],
    historyIndex: -1,
    options: {
      typing: false,
      typingSpeed: 14
    },
    content: null
  };

  const dom = {
    terminal: null,
    terminalOutput: null,
    terminalInput: null,
    prompt: null,
    gui: null,
    desktop: null,
    startButton: null,
    startMenu: null,
    taskButtons: null
  };

  const LINK_REGEX = /((https?:\/\/[^\s]+)|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}))/gi;
  const ANSI_REGEX = /\u001b\[(\d+)m/g;

  const GUI_WINDOW_COMMANDS = ["about", "social", "projects", "resume", "email"];

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
      if (typeof contentFactory === "function") {
        content.append(contentFactory());
      } else {
        renderLines(content, lines, { typing: false });
      }

      win.append(titleBar, content);
      dom.desktop.append(win);

      const taskButton = document.createElement("button");
      taskButton.className = "task-button";
      taskButton.textContent = title;
      taskButton.dataset.id = id;
      dom.taskButtons.append(taskButton);

      const winData = {
        id,
        element: win,
        contentEl: content,
        taskButton,
        minimized: false,
        commandKey
      };
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
      this.focusWindow(id);
    },
    focusWindow(id) {
      const winData = this.windows.get(id);
      if (!winData) return;
      winData.element.style.zIndex = this.zIndex++;
      for (const data of this.windows.values()) {
        data.taskButton.classList.toggle("active", data.id === id && !data.minimized);
      }
    },
    toggleMinimize(id, force) {
      const winData = this.windows.get(id);
      if (!winData) return;
      const shouldMinimize = force !== undefined ? force : !winData.minimized;
      winData.minimized = shouldMinimize;
      winData.element.classList.toggle("minimized", shouldMinimize);
      winData.taskButton.classList.toggle("active", !shouldMinimize);
      if (!shouldMinimize) {
        this.focusWindow(id);
      }
    },
    closeWindow(id) {
      const winData = this.windows.get(id);
      if (!winData) return;
      winData.element.remove();
      winData.taskButton.remove();
      this.windows.delete(id);
    },
    enableDrag(win, handle) {
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
      };

      handle.addEventListener("mousedown", (event) => {
        dragging = true;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = win.offsetLeft;
        startTop = win.offsetTop;
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
    }
  };

  function cacheDom() {
    dom.terminal = document.getElementById("terminal");
    dom.terminalOutput = document.getElementById("terminal-output");
    dom.terminalInput = document.getElementById("terminal-input");
    dom.prompt = document.getElementById("prompt");
    dom.gui = document.getElementById("gui");
    dom.desktop = document.getElementById("desktop");
    dom.startButton = document.getElementById("start-button");
    dom.startMenu = document.getElementById("start-menu");
    dom.taskButtons = document.getElementById("task-buttons");
  }

  function bindEvents() {
    dom.terminalInput.addEventListener("keydown", handleTerminalKeydown);
    dom.startButton.addEventListener("click", toggleStartMenu);
    dom.startMenu.addEventListener("click", handleStartMenuClick);
    document.addEventListener("click", handleDocumentClick);
    dom.desktop.addEventListener("click", handleDesktopClick);
  }

  async function loadContent() {
    try {
      const response = await fetch("data.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Falha ao carregar data.json");
      }
      state.content = await response.json();
    } catch (error) {
      state.content = {
        meta: { user: "Matheus", machine: "saragoca" },
        banner: ["Falha ao carregar conteudo."],
        help: ["help"],
        about: [],
        social: [],
        projects: [],
        resume: [],
        email: []
      };
      appendOutputLine("Erro ao carregar conteudo. Usando dados fallback.", "error");
    }
  }

  function updatePrompt() {
    const user = state.content?.meta?.user || "Matheus";
    const machine = state.content?.meta?.machine || "saragoca";
    dom.prompt.textContent = `${user}@${machine}:~$`;
  }

  function initTerminal() {
    updatePrompt();
    clearOutput();
    appendOutputLines(state.content?.banner || []);
    focusInput();
  }

  function focusInput() {
    if (!state.sessionActive) return;
    dom.terminalInput.focus();
  }

  function handleTerminalKeydown(event) {
    if (!state.sessionActive) return;

    if (event.key === "Enter") {
      event.preventDefault();
      const input = dom.terminalInput.value.trim();
      if (!input) return;
      dom.terminalInput.value = "";
      state.history.push(input);
      state.historyIndex = -1;
      appendCommandEcho(input);
      executeCommand(input, "cli");
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

  function appendCommandEcho(input) {
    const line = document.createElement("div");
    line.className = "terminal-line command-echo";
    const prompt = document.createElement("span");
    prompt.textContent = dom.prompt.textContent + " ";
    line.append(prompt, document.createTextNode(input));
    dom.terminalOutput.append(line);
    scrollToBottom();
  }

  function executeCommand(rawInput, origin) {
    const { command, args } = parseInput(rawInput);
    if (!command) return;
    const result = getCommandResult(command, args);

    if (result.error) {
      appendOutputLine(result.error, "error");
      return;
    }

    if (result.lines && result.lines.length > 0) {
      appendOutputLines(result.lines, { typing: state.options.typing });
    }

    if (result.action) {
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
    const content = state.content;
    switch (command) {
      case "help":
        if (args.length > 0) {
          const topic = args[0].toLowerCase();
          const helpMap = content?.commandHelp || {};
          const entry = helpMap[topic];
          if (!entry) {
            return { lines: [`help: no help topics match \`${topic}\``] };
          }
          const lines = String(entry).split("\n");
          return { lines };
        }
        return { lines: content?.help || [] };
      case "about":
        return { lines: highlightLinesWithAnsi(content?.about || [], content?.aboutKeywords || []) };
      case "social":
        return { lines: content?.social || [] };
      case "projects":
        return { lines: formatProjects(content?.projects || []) };
      case "resume":
        return { lines: content?.resume || [] };
      case "curriculum":
        return { lines: content?.resume || [] };
      case "email":
        return { lines: content?.email || [] };
      case "banner":
        return { lines: content?.banner || [] };
      case "history":
        return { lines: formatHistory() };
      case "clear":
      case "cls":
        return { action: "cls" };
      case "reload":
        return { action: "reload" };
      case "exit":
        return { lines: ["Sessao encerrada."], action: "exit" };
      case "gui":
        return { lines: ["Alternando para modo grafico..."], action: "gui" };
      case "exit-gui":
      case "terminal":
        if (state.mode === "cli") {
          return { lines: ["Voce ja esta no terminal."] };
        }
        return { lines: ["Voltando ao terminal..."], action: "terminal" };
      default:
        return { error: `Comando nao encontrado: ${command}` };
    }
  }

  function formatHistory() {
    if (state.history.length === 0) {
      return ["Historico vazio."];
    }
    return state.history.map((entry, index) => `${index + 1}  ${entry}`);
  }

  function formatProjects(projects) {
    if (!projects.length) {
      return ["Nenhum projeto listado."];
    }
    const lines = [];
    projects.forEach((project, index) => {
      lines.push(`${index + 1}. ${project.name}`);
      if (project.description) {
        lines.push(`   ${project.description}`);
      }
      if (Array.isArray(project.links)) {
        project.links.forEach((link) => lines.push(`   ${link}`));
      }
    });
    return lines;
  }

  function applyAction(action, origin) {
    switch (action) {
      case "cls":
        clearOutput();
        break;
      case "reload":
        resetState();
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

  function resetState() {
    state.sessionActive = true;
    state.history = [];
    state.historyIndex = -1;
    dom.terminalInput.removeAttribute("disabled");
    setMode("cli");
  }

  function setMode(mode) {
    state.mode = mode;
    if (mode === "gui") {
      dom.terminal.classList.add("hidden");
      dom.gui.classList.remove("hidden");
    } else {
      dom.gui.classList.add("hidden");
      dom.terminal.classList.remove("hidden");
      dom.startMenu.classList.add("hidden");
      focusInput();
    }
  }

  function toggleStartMenu(event) {
    event.stopPropagation();
    dom.startMenu.classList.toggle("hidden");
  }

  function handleStartMenuClick(event) {
    const item = event.target.closest("li");
    if (!item) return;
    const command = item.dataset.command;
    dom.startMenu.classList.add("hidden");

    if (command === "terminal") {
      applyAction("terminal", "gui");
      return;
    }

    if (GUI_WINDOW_COMMANDS.includes(command)) {
      openGuiWindow(command);
    }
  }

  function handleDesktopClick(event) {
    const icon = event.target.closest(".desktop-icon");
    if (!icon) return;
    const command = icon.dataset.command;
    if (GUI_WINDOW_COMMANDS.includes(command)) {
      openGuiWindow(command);
    }
  }

  function openGuiWindow(command) {
    const title = command.charAt(0).toUpperCase() + command.slice(1);
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
  }

  function clearOutput() {
    dom.terminalOutput.innerHTML = "";
  }

  function appendOutputLines(lines, options = {}) {
    if (!lines || lines.length === 0) return;
    if (state.options.typing && options.typing !== false) {
      typeLines(lines);
    } else {
      lines.forEach((line) => appendOutputLine(line));
    }
  }

  async function typeLines(lines) {
    for (const line of lines) {
      await typeLine(line);
    }
  }

  function typeLine(line) {
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
      }, state.options.typingSpeed);
    });
  }

  function appendOutputLine(line, type) {
    const lineEl = document.createElement("div");
    lineEl.className = "terminal-line";
    if (type === "error") {
      lineEl.classList.add("error");
      lineEl.textContent = line;
    } else {
      renderLineContent(lineEl, line);
    }
    dom.terminalOutput.append(lineEl);
    scrollToBottom();
  }

  function renderLines(container, lines, options = {}) {
    if (!lines || lines.length === 0) {
      container.textContent = "Sem conteudo.";
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
    const content = state.content || {};
    const wrapper = document.createElement("div");
    wrapper.className = "gui-content";

    switch (commandKey) {
      case "about":
        appendAboutContent(wrapper, content);
        break;
      case "social":
        appendRowsFromLines(wrapper, content.social);
        break;
      case "resume":
        appendRowsFromLines(wrapper, content.resume);
        break;
      case "email":
        appendRowsFromLines(wrapper, content.email);
        break;
      case "projects":
        appendProjectCards(wrapper, content.projects || []);
        break;
      default:
        wrapper.textContent = "Sem conteudo.";
        break;
    }

    return wrapper;
  }

  function appendAboutContent(wrapper, content) {
    const meta = content.meta || {};
    const keywords = content.aboutKeywords || [];
    if (meta.name || meta.role || meta.location) {
      const metaLine = document.createElement("div");
      metaLine.className = "gui-row";
      const label = document.createElement("div");
      label.className = "gui-row-label";
      label.textContent = "Perfil";
      const value = document.createElement("div");
      const parts = [meta.name, meta.role, meta.location].filter(Boolean).join(" - ");
      value.textContent = parts;
      metaLine.append(label, value);
      wrapper.append(metaLine);
    }

    (content.about || []).forEach((line) => {
      const p = document.createElement("p");
      appendHighlightedText(p, String(line), keywords);
      wrapper.append(p);
    });
  }

  function appendRowsFromLines(wrapper, lines = []) {
    if (!lines.length) {
      const empty = document.createElement("div");
      empty.textContent = "Sem conteudo.";
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

  function appendProjectCards(wrapper, projects) {
    if (!projects.length) {
      const empty = document.createElement("div");
      empty.textContent = "Nenhum projeto listado.";
      wrapper.append(empty);
      return;
    }

    projects.forEach((project) => {
      const card = document.createElement("div");
      card.className = "gui-card";
      const title = document.createElement("h4");
      title.textContent = project.name || "Projeto";
      card.append(title);

      if (project.description) {
        const desc = document.createElement("p");
        desc.textContent = project.description;
        card.append(desc);
      }

      if (Array.isArray(project.links) && project.links.length) {
        const links = document.createElement("div");
        links.className = "gui-links";
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

  async function init() {
    cacheDom();
    bindEvents();
    await loadContent();
    initTerminal();
  }

  init();
})();
