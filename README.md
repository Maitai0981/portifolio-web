# Matheus Saragoca — Interactive Portfolio

> A single-page portfolio with a dual interface: an Ubuntu-style browser terminal and a Windows 95-inspired GUI. Built entirely with vanilla JavaScript — no frameworks.

**Live:** https://maitai0981.github.io/portifolio-web/

---

## Overview

This portfolio presents professional and academic content through two interactive modes:

| Mode | Description |
|------|-------------|
| **GUI** | Windows 95-style desktop with draggable windows, taskbar, Start menu, and desktop icons |
| **Terminal** | Ubuntu-like CLI with command history, fuzzy search, tab-completion, and ANSI color output |

Both modes share the same application state and content source (`data.json`), and the user can switch between them at any time via the `gui` / `terminal` commands or the desktop Terminal icon.

---

## Features

### Terminal
- **25+ commands** — `help`, `about`, `projects`, `education`, `social`, `me`, `algorithms`, `cnn`, `snake`, `theme`, `neofetch`, `cowsay`, `sudo`, and more
- **Fuzzy command search** — Trie-based prefix matching + Levenshtein distance for typo correction
- **Command Menu** — palette-style overlay (Ctrl+K) with live search and keyboard navigation
- **Typing animation** — configurable speed, volume-aware (auto-disables for large output)
- **ANSI rendering** — color codes and hyperlink detection
- **Command history** — persistent across sessions (up to 220 entries via `localStorage`)
- **Bilingual** — `lang pt` / `lang en` switches all content at runtime

### GUI (Windows 95)
- Desktop icons, double-click to open windows
- Draggable, resizable windows with z-index management
- Start menu with full app list
- Taskbar with open window buttons, availability badge, and live clock
- Windows: About, Social, Projects, Education, Curriculum, Email, Algorithms, CNN Demo, Snake, Terminal

### Interactive Apps
| App | Command | Description |
|-----|---------|-------------|
| **Algorithm Viewer** | `algorithms` | Step-by-step visualization of Bubble, Selection, Merge, Quick, Heap Sort, and Dijkstra |
| **CNN Demo** | `cnn` | In-browser image classification using a pre-trained TensorFlow.js model |
| **Snake Game** | `snake` | Keyboard-controlled Snake with score tracking |

### Visual Effects
- **Matrix Rain** — ASCII canvas animation, theme-aware (characters and palette vary per theme)
- **Doom Fire** — Palettized fire simulation on canvas, adaptive to device performance tier
- **Desktop Pet** — ASCII sprite companion that reacts to clicks, keystrokes, command streaks, and errors

### Themes
| Theme | Matrix Style |
|-------|-------------|
| `dark` | — |
| `light` | — |
| `hacker` | Binary/symbol rain, green palette |
| `retro` | — |
| `fire` | ASCII fire rain, orange palette + Doom Fire background |
| `secret` | Block/hex rain, cyan/pink palette *(unlock required)* |

---

## Architecture

```
portifolio-web/
├── index.html              # Entry point — markup for terminal, GUI, command menu
├── main.js                 # Application orchestrator (IIFE, ~5 400 lines)
├── styles.css              # CSS layer entry point (@import of all layers)
├── data.json               # All content and translations (pt / en)
├── service-worker.js       # Offline cache via Cache API
├── manifest.webmanifest    # PWA manifest
│
├── modules/
│   ├── core/
│   │   ├── appState.js     # Central mutable state object (createAppState / createDomRefs)
│   │   └── themeConfig.js  # Theme names, CSS classes, canvas presets, color map
│   │
│   ├── features/
│   │   ├── terminal/
│   │   │   ├── config.js   # COMMANDS list, TERMINAL_MAX_LINES, HISTORY_MAX_ITEMS
│   │   │   └── typing.js   # Typing speed profiles, volume-aware rendering decisions
│   │   ├── gui/
│   │   │   └── config.js   # GUI_WINDOW_COMMANDS — which commands open windows
│   │   ├── effects/
│   │   │   ├── matrixAdaptive.js  # Performance-tier logic for Matrix Rain
│   │   │   └── doomFire.js        # Doom Fire palette, grid, burst queue, telemetry
│   │   └── pet/
│   │       ├── config.js          # Pet timing constants, reaction priorities
│   │       └── spriteSheet.js     # ASCII sprite frames per reaction type
│   │
│   ├── commandSearch.js    # buildCommandIndex / getPrefixMatches / searchCommands / suggestCommands
│   ├── trie.js             # Prefix trie for O(k) command lookup
│   ├── levenshtein.js      # Edit distance for fuzzy matching
│   ├── algorithmViewer.js  # Sorting/graph algorithm visualizer (DOM-based)
│   ├── cnnDemo.js          # TensorFlow.js image classifier
│   └── snakeGame.js        # Canvas-based Snake game
│
├── styles/
│   ├── base.css            # CSS layer: resets, layout, terminal, fonts
│   ├── components.css      # CSS layer: GUI windows, cards, buttons, taskbar
│   ├── themes.css          # CSS layer: CSS custom properties per theme
│   └── effects.css         # CSS layer: matrix, fire, pet, animations
│
├── assets/
│   ├── Matheus.webp        # Profile photo (OG image)
│   ├── sprite.png / sprite_94.webp   # Icon sprite sheet
│   ├── covers/             # SVG project cover images
│   ├── edu/                # Education institution logos
│   └── web_model/          # TensorFlow.js model (model.json + weights)
│
├── scripts/
│   ├── build.mjs           # esbuild pipeline: copy, minify JS/CSS, inject version
│   ├── lint.mjs            # Static linting script
│   └── soak-tests.mjs      # Long-running performance/stability tests
│
├── tests/
│   ├── core-modules.test.mjs         # Unit tests — appState, themeConfig
│   ├── command-search.test.mjs       # Unit tests — Trie, Levenshtein, search API
│   ├── performance-adaptive.test.mjs # Unit tests — matrix/fire adaptive logic
│   ├── content-static.test.mjs       # Unit tests — data.json schema validation
│   ├── service-worker-static.test.mjs
│   ├── worker-api.test.mjs           # Unit tests — Cloudflare Worker API
│   └── e2e/
│       ├── app.e2e.spec.mjs          # Playwright functional E2E tests
│       └── visual.e2e.spec.mjs       # Playwright visual regression snapshots
│
└── dist/                   # Build output — deployed to GitHub Pages
```

### State Management

All runtime state lives in a single plain object created by `createAppState()` (`modules/core/appState.js`). There is no reactive framework; `main.js` mutates state directly and calls render functions as needed. Persistent preferences (theme, language, typing speed, reduced motion) are serialized to `localStorage` under namespaced keys.

### Command Search Pipeline

```
User input
    │
    ▼
buildCommandIndex(COMMANDS)        ← called once at startup
    │  Trie + normalized command list
    ▼
getPrefixMatches(index, prefix)    ← O(k) prefix lookup via Trie
    │
    ▼  (fallback when no prefix match)
searchCommands(index, query)       ← Levenshtein fuzzy match
    │                                 len ≤ 4 → d≤1 | len ≤ 7 → d≤2 | else → d≤3
    ▼
suggestCommands(index, query)      ← up to 6 ranked suggestions ("did you mean?")
```

### CSS Layer Order

```css
@layer base, components, themes, effects;
```

Lower layers can be overridden without specificity conflicts. Theme variables are declared per `[data-theme]` attribute; effects are isolated to the highest layer to prevent bleed-through.

### Performance Tiers

The Matrix Rain and Doom Fire effects self-regulate based on measured frame time:

| Tier | Condition |
|------|-----------|
| `high` | smoothedDt ≤ 1.2 |
| `medium` | smoothedDt ≤ 1.65 |
| `low` | smoothedDt > 1.65 or `prefers-reduced-motion` |

Frame interval, column scale, and draw stride adjust per tier to maintain smooth animation on low-end devices.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Vanilla JavaScript (ES Modules, ES2020 target) |
| Styling | CSS (4-layer architecture — base / components / themes / effects) |
| ML / AI | TensorFlow.js (in-browser CNN inference) |
| Build | esbuild (JS + CSS minification, version injection) |
| Testing | Node.js built-in test runner (unit) + Playwright (E2E + visual regression) |
| Backend | Cloudflare Workers (AI chat endpoint — `me` command) |
| Hosting | GitHub Pages |
| PWA | Service Worker + Web App Manifest |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18

### Install

```bash
npm install
```

### Development server

```bash
npm run dev
```

Starts a local server. Open `http://localhost:<port>` in your browser.

### Build

```bash
npm run build
```

Outputs minified assets to `./dist/`. The build version is injected automatically (format: `YYYY-MM-DD-HHmmss`) into `index.html`, `styles.css`, `main.js`, and the Service Worker cache key.

### Tests

```bash
# Unit tests (Node.js built-in runner)
npm test

# End-to-end tests (Playwright)
npm run test:e2e:install   # first time only — installs Chromium
npm run test:e2e
npm run test:e2e:headed    # with visible browser window

# Soak / performance tests
npm run test:soak
```

### Cloudflare Worker (`me` command backend)

```bash
npm run worker:dev      # local dev via Wrangler
npm run worker:deploy   # deploy to Cloudflare
npm run worker:tail     # stream live logs
```

---

## Terminal Commands Reference

| Command | Description |
|---------|-------------|
| `help` | List all available commands |
| `about` | Professional summary and skill tags |
| `projects` | List projects; `projects <name>` for details |
| `education` | Academic background |
| `social` | Links (GitHub, LinkedIn, Codeforces, Beecrowd) |
| `resume` / `curriculum` | Open PDF résumé |
| `email` | Contact email |
| `me` | AI-powered conversational assistant (Cloudflare Worker) |
| `lang pt` / `lang en` | Switch interface language |
| `theme <name>` | Change theme (`dark`, `light`, `hacker`, `retro`, `fire`) |
| `typing` | Toggle typing animation |
| `motion` | Toggle reduced motion |
| `pet` | Toggle desktop pet |
| `algorithms` | Open algorithm visualizer |
| `cnn` | Open CNN image classifier demo |
| `snake` | Play Snake |
| `gui` | Switch to GUI mode |
| `terminal` | Switch to terminal mode (from GUI) |
| `neofetch` | System info display |
| `cowsay <text>` | ASCII cow with message |
| `date` | Current date and time |
| `banner` | Re-display the ASCII banner |
| `history` | Show command history |
| `clear` / `cls` | Clear terminal output |
| `sudo` | *(easter egg)* |

**Keyboard shortcuts**

| Shortcut | Action |
|----------|--------|
| `↑` / `↓` | Navigate command history |
| `Tab` | Autocomplete from suggestions |
| `Ctrl+K` | Open Command Menu |
| `Esc` | Close Command Menu / active GUI window |

---

## Projects Showcased

| Project | Stack | Description |
|---------|-------|-------------|
| **SupaSport** | React Native, Expo | Sports facility booking platform with owner and user flows |
| **PIBIC Dermatologia** | React Native, Python, TensorFlow | Mobile app for preliminary skin lesion analysis (research) |
| **Sistema de Cadastro de Alunos** | Python, Django REST Framework | Student registration CRUD API with image upload |
| **Crud BD Python** | Python | Basic database CRUD operations |
| **get-shop** | Python, FastAPI | Converts WhatsApp messages and CSV files into structured inventory records |
| **PW_100** | Python, Express.js, Next.js, MongoDB | Cryptocurrency arbitrage monitor with real-time price tracking and alerts |
| **Rodando Moto Center** | Spring Boot, React, PostgreSQL, Docker | Full-stack workshop management (clients, service orders, inventory, financials) |
| **Mundo de Libras** | HTML5, CSS3, JavaScript | Educational website for Brazilian Sign Language (Libras) |

---

## Deployment

The site is deployed to GitHub Pages from the `dist/` directory. A `.nojekyll` file disables Jekyll processing. The `404.html` redirects unknown paths back to the SPA via a query-string encoding trick, which restores the original URL on load.

The Service Worker pre-caches all static assets on install and serves them offline. Cache keys are versioned with the build version string to ensure clean updates on each deploy.

---

## Browser Support

Targets ES2020 via esbuild. Requires:

- Canvas API (Matrix Rain, Doom Fire, Snake)
- ES Modules (`type="module"`)
- CSS custom properties and `@layer`
- `localStorage` (preferences persistence)
- Service Worker (offline support — optional)

---

## Author

**Matheus Saragoca** — Software Developer  
[GitHub](https://github.com/Maitai0981) · [LinkedIn](https://www.linkedin.com/in/matheus-sarago%C3%A7a-a352342b6/) · [Codeforces](https://codeforces.com/profile/Matheus2081)
