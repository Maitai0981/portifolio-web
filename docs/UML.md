# UML — Portfolio Web (Matheus Saragoca)

Diagramas UML completos do projeto, escritos em [Mermaid](https://mermaid.js.org/).

---

## 1. Diagrama de Casos de Uso

```mermaid
%%{init: {"theme": "dark"}}%%
flowchart LR
    User(["👤 Usuário"])

    subgraph Terminal["Modo Terminal (CLI)"]
        UC1["Executar comandos"]
        UC2["Navegar histórico"]
        UC3["Autocomplete (Tab)"]
        UC4["Buscar comandos (Ctrl+K)"]
        UC5["Mudar idioma"]
        UC6["Mudar tema"]
        UC7["Ajustar velocidade de digitação"]
        UC8["Ativar/desativar mascote"]
        UC9["Conversar com AI (me)"]
    end

    subgraph GUI["Modo GUI (Windows 95)"]
        UC10["Abrir janelas"]
        UC11["Arrastar janelas"]
        UC12["Menu Iniciar"]
        UC13["Minimizar/Fechar janelas"]
    end

    subgraph Apps["Aplicações Interativas"]
        UC14["Visualizar algoritmos de ordenação"]
        UC15["Demo CNN — classificar dígitos"]
        UC16["Jogar Snake"]
    end

    subgraph System["Sistema"]
        UC17["Alternar GUI ↔ CLI"]
        UC18["Registrar Service Worker (PWA)"]
        UC19["Persistir preferências (localStorage)"]
    end

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10
    User --> UC11
    User --> UC12
    User --> UC13
    User --> UC14
    User --> UC15
    User --> UC16
    User --> UC17

    UC1 --> UC17
    UC9 -.->|"Cloudflare Workers AI"| UC9
    UC18 -.->|"Cache offline"| UC18
    UC5 --> UC19
    UC6 --> UC19
    UC7 --> UC19
    UC8 --> UC19
```

---

## 2. Diagrama de Componentes (Arquitetura)

```mermaid
%%{init: {"theme": "dark"}}%%
graph TB
    subgraph Entry["Ponto de Entrada"]
        HTML["index.html"]
        SW["service-worker.js"]
        MANIFEST["manifest.webmanifest"]
    end

    subgraph Core["Núcleo (main.js)"]
        INIT["Inicialização IIFE"]
        EVT["Event Listeners"]
        CMD["Processador de Comandos"]
        UI["Renderizador de UI"]
    end

    subgraph Modules["Módulos"]
        subgraph CoreMod["core/"]
            STATE["appState.js\n(Estado Central)"]
            THEME["themeConfig.js\n(Temas e Presets)"]
        end
        subgraph Features["features/"]
            TCFG["terminal/config.js"]
            TTYP["terminal/typing.js"]
            GCFG["gui/config.js"]
            PCFG["pet/config.js"]
            PSPR["pet/spriteSheet.js"]
            MTRX["effects/matrixAdaptive.js"]
            FIRE["effects/doomFire.js"]
        end
        subgraph DataStr["estruturas/"]
            SRCH["commandSearch.js"]
            TRIE["trie.js"]
            LEVM["levenshtein.js"]
        end
        subgraph InterApps["apps interativos/"]
            ALGO["algorithmViewer.js"]
            CNN["cnnDemo.js"]
            SNAKE["snakeGame.js"]
        end
    end

    subgraph Assets["Assets"]
        DATAJSON["data.json\n(conteúdo + traduções)"]
        COVERS["assets/covers/*.svg"]
        EDU["assets/edu/*.png"]
        MODEL["assets/web_model/\n(TensorFlow SavedModel)"]
        SPRITE["assets/sprite_94.webp"]
    end

    subgraph External["Externos"]
        CF["Cloudflare Workers\n(/me endpoint + AI)"]
        TF["TensorFlow.js\n(CDN)"]
    end

    HTML --> INIT
    HTML --> SW
    INIT --> STATE
    INIT --> EVT
    EVT --> CMD
    CMD --> UI
    STATE --> THEME
    CMD --> TCFG
    CMD --> TTYP
    CMD --> GCFG
    CMD --> PCFG
    CMD --> PSPR
    CMD --> MTRX
    CMD --> FIRE
    CMD --> SRCH
    SRCH --> TRIE
    SRCH --> LEVM
    CMD --> ALGO
    CMD --> CNN
    CMD --> SNAKE
    INIT --> DATAJSON
    CNN --> MODEL
    CNN --> TF
    CMD -.->|"fetch /me"| CF
    ALGO --> COVERS
    EDU --> UI
    SPRITE --> PCFG
```

---

## 3. Diagrama de Classes (Módulos Principais)

```mermaid
%%{init: {"theme": "dark"}}%%
classDiagram
    class AppState {
        +String mode
        +Boolean sessionActive
        +String[] commandQueue
        +String[] history
        +Number historyIndex
        +String theme
        +String lang
        +Number typingSpeed
        +Boolean reducedMotion
        +Boolean petActive
        +Object content
        +createAppState(options) AppState
        +createDomRefs() DomRefs
    }

    class ThemeConfig {
        +String[] THEMES
        +String[] THEME_CLASSES
        +Object THEME_COLOR_MAP
        +getAsciiThemePreset(theme) Object
        +isAsciiThemeEnabled(theme) Boolean
    }

    class CommandSearch {
        +buildCommandIndex(commands) Index
        +getPrefixMatches(index, prefix) String[]
        +searchCommands(index, query) Result[]
        +suggestCommands(index, query) String[]
    }

    class Trie {
        -Object root
        +insert(word, data)
        +search(prefix) Node[]
        +getAll() String[]
    }

    class Levenshtein {
        +distance(a, b) Number
        +similarity(a, b) Number
    }

    class MatrixAdaptive {
        +getMatrixQualityConfig(tier) Config
        +shouldRenderMatrixFrame(state) Boolean
        +updateMatrixPerformanceState(state, fps) State
    }

    class DoomFire {
        +ensureFireGrid(state, w, h) Grid
        +runDoomFireFrame(grid, params) Grid
        +queueFireBurst(state) State
        +getFireColumnWidth(vw) Number
        +resolveFirePerformanceTier(fps) Tier
        +createFireTelemetryState() State
        +getFireTelemetrySnapshot(state) Snapshot
    }

    class PetConfig {
        +Boolean PET_ALWAYS_ACTIVE
        +Number PET_PERSIST_MS
        +Number PET_REACTION_COOLDOWN_MS
        +Number PET_KEY_BURST_WINDOW_MS
        +Number PET_QUEUE_MAX
        +Number PET_QUEUE_STEP_MS
        +Object PET_TIMING
        +Object PET_REACTION_CLASS_BY_TYPE
        +Number[] PET_REACTION_PRIORITY
    }

    class PetSpriteSheet {
        +Object PET_ASCII_SPRITE_SHEET
        +getSprite(name) String
        +listSprites() String[]
    }

    class AlgorithmViewer {
        +init(container, i18n) void
        +runBubbleSort(arr) Steps[]
        +runSelectionSort(arr) Steps[]
        +runMergeSort(arr) Steps[]
        +runQuickSort(arr) Steps[]
        +runHeapSort(arr) Steps[]
        +runDijkstra(graph, src) Steps[]
        +visualize(steps, canvas) void
        +pause() void
        +step() void
        +reset() void
    }

    class CnnDemo {
        +init(container, i18n) void
        +loadModel(path) Promise
        +predict(canvas) Number
        +clear() void
        +getLatency() Number
    }

    class SnakeGame {
        +init(container, i18n) void
        +start() void
        +pause() void
        +restart() void
        +handleKey(key) void
        +handleSwipe(direction) void
        +getScore() Number
    }

    class TerminalConfig {
        +String[] COMMANDS
        +Number HISTORY_MAX_ITEMS
        +Number TERMINAL_MAX_LINES
    }

    class TypingConfig {
        +getTypingRenderProfile(speed) Profile
        +shouldTypeLinesByVolume(lines, speed) Boolean
    }

    class GuiConfig {
        +String[] GUI_WINDOW_COMMANDS
    }

    AppState --> ThemeConfig : usa
    CommandSearch --> Trie : usa
    CommandSearch --> Levenshtein : usa
    AppState --> TerminalConfig : referencia
    AppState --> PetConfig : referencia
    AppState --> PetSpriteSheet : referencia
    AppState --> MatrixAdaptive : referencia
    AppState --> DoomFire : referencia
    AppState --> GuiConfig : referencia
    AlgorithmViewer ..> AppState : injeta i18n
    CnnDemo ..> AppState : injeta i18n
    SnakeGame ..> AppState : injeta i18n
    TypingConfig --> TerminalConfig : usa
```

---

## 4. Diagrama de Máquina de Estados (App)

```mermaid
%%{init: {"theme": "dark"}}%%
stateDiagram-v2
    [*] --> Inicializando

    Inicializando --> CarregandoDados : DOM pronto
    CarregandoDados --> AplicandoPrefs : data.json carregado
    CarregandoDados --> AplicandoPrefs : falha → usa DEFAULT_I18N
    AplicandoPrefs --> ModoGUI : INITIAL_MODE = "gui"\nou localStorage.portfolioMode = "gui"
    AplicandoPrefs --> ModoCLI : localStorage.portfolioMode = "cli"

    state ModoGUI {
        [*] --> Desktop
        Desktop --> JanelaAberta : clique ícone / menu Iniciar
        JanelaAberta --> JanelaAberta : abre nova janela
        JanelaAberta --> Desktop : fecha janela
        Desktop --> TerminalInJanela : comando "terminal"
        TerminalInJanela --> Desktop : fecha terminal

        state JanelaAberta {
            [*] --> Conteudo
            Conteudo --> Algoritmos : janela = "algorithms"
            Conteudo --> CNN : janela = "cnn"
            Conteudo --> Snake : janela = "snake"
        }
    }

    state ModoCLI {
        [*] --> AguardandoInput
        AguardandoInput --> ProcessandoComando : Enter
        ProcessandoComando --> AnimandoOutput : comando válido
        ProcessandoComando --> ExibindoErro : comando inválido
        AnimandoOutput --> AguardandoInput : animação concluída
        ExibindoErro --> AguardandoInput
        AguardandoInput --> Autocomplete : Tab
        Autocomplete --> AguardandoInput
        AguardandoInput --> MenuComandos : Ctrl+K
        MenuComandos --> ProcessandoComando : seleciona comando
        MenuComandos --> AguardandoInput : Esc
    }

    ModoGUI --> ModoCLI : comando "terminal"\nou Alt+G
    ModoCLI --> ModoGUI : comando "gui"\nou Alt+G

    state TemaAtivo {
        dark
        light
        hacker
        retro
        fire
        secret
    }

    ModoGUI --> TemaAtivo : tema persiste
    ModoCLI --> TemaAtivo : tema persiste
```

---

## 5. Diagrama de Sequência — Execução de Comando no Terminal

```mermaid
%%{init: {"theme": "dark"}}%%
sequenceDiagram
    actor User as Usuário
    participant Input as terminal-input
    participant Main as main.js
    participant State as AppState
    participant I18N as data.json (i18n)
    participant Output as terminal-output

    User->>Input: digita comando + Enter
    Input->>Main: evento keydown (Enter)
    Main->>Main: parseCommand(raw)
    Main->>State: history.push(command)
    Main->>Main: routeCommand(cmd, args)

    alt Comando simples (about, social, etc.)
        Main->>I18N: getContent(cmd, lang)
        I18N-->>Main: linhas de texto
        Main->>Output: printLines(lines, typing=true)
        Output-->>User: texto animado linha a linha
    else Comando de modo (gui)
        Main->>State: setMode("gui")
        Main->>Main: switchToGui()
        Main-->>User: transição para GUI
    else Comando me (AI)
        Main->>Main: handleMeCommand(args)
        Main->>Output: printLine("...")
        Main-)CF: fetch /me (async, timeout)
        CF-->>Main: resposta JSON
        Main->>Output: printLines(response)
    else Comando inválido
        Main->>I18N: messages.commandNotFound
        Main->>Output: printError(msg)
        Main->>Pet: triggerReaction("error")
    end

    Main->>Pet: triggerReaction("command")
```

---

## 6. Diagrama de Sequência — Alternância de Modo GUI ↔ CLI

```mermaid
%%{init: {"theme": "dark"}}%%
sequenceDiagram
    actor User as Usuário
    participant DOM as DOM
    participant Main as main.js
    participant State as AppState
    participant Storage as localStorage

    User->>DOM: clica ícone Terminal (GUI)\nou digita "terminal" (CLI)\nou Alt+G
    DOM->>Main: evento (click / keydown / command)

    alt GUI → CLI
        Main->>State: mode = "cli"
        Main->>Storage: set portfolioMode = "cli"
        Main->>DOM: #gui.classList.add("mode-hidden")
        Main->>DOM: #terminal.classList.remove("mode-hidden")
        Main->>DOM: terminal-input.focus()
        Main->>Main: printBanner()
    else CLI → GUI
        Main->>State: mode = "gui"
        Main->>Storage: set portfolioMode = "gui"
        Main->>DOM: #terminal.classList.add("mode-hidden")
        Main->>DOM: #gui.classList.remove("mode-hidden")
        Main->>Main: stopMatrixIfRunning()
        Main->>Main: updateTaskbar()
    end
```

---

## 7. Diagrama de Sequência — Comando `me` (AI Assistant)

```mermaid
%%{init: {"theme": "dark"}}%%
sequenceDiagram
    actor User as Usuário
    participant Terminal as Terminal
    participant Main as main.js (handleMe)
    participant CF as Cloudflare Worker
    participant AI as Workers AI (Llama 3)

    User->>Terminal: me <pergunta>
    Terminal->>Main: handleMeCommand(["<pergunta>"])

    alt Sessão inativa
        Main->>Terminal: printMeIntro()
        Main->>Main: activateMeSession()
    end

    Main->>Main: buildMeContext(history, i18n)
    Main->>Terminal: printLine("...")

    loop Tentativas (máx 3)
        Main-)CF: POST /me { message, history, context }
        Note over Main,CF: timeout: 5s → 9s → 14s
        alt Sucesso
            CF->>AI: prompt contextualizado
            AI-->>CF: resposta gerada
            CF-->>Main: { answer, sources }
            Main->>Terminal: printLines(answer)
            Main->>Terminal: printSources(sources)
        else Timeout / Erro retentável (5xx)
            Main->>Main: aguarda e retenta
        else Falha definitiva
            Main->>Main: useFallbackLocalContext()
            Main->>Terminal: printLocalAnswer()
        end
    end
```

---

## 8. Diagrama de Sequência — Inicialização da Aplicação

```mermaid
%%{init: {"theme": "dark"}}%%
sequenceDiagram
    participant Browser as Navegador
    participant HTML as index.html
    participant SW as service-worker.js
    participant Main as main.js
    participant State as AppState
    participant JSON as data.json
    participant Storage as localStorage

    Browser->>HTML: carrega página
    HTML->>HTML: restaura rota (404 redirect SPA)
    HTML->>SW: navigator.serviceWorker.register()
    SW-->>Browser: estratégias de cache ativas

    HTML->>Main: import (ES module)
    Main->>State: createAppState({ initialMode: "gui" })
    Main->>State: createDomRefs()
    Main->>Main: buildCommandIndex(COMMANDS)

    Main->>JSON: fetch("data.json")
    alt Sucesso
        JSON-->>Main: traduções + conteúdo
        Main->>State: content = data
    else Falha
        Main->>State: content = DEFAULT_I18N
    end

    Main->>Storage: ler portfolioLang
    alt lang salvo
        Main->>State: lang = savedLang
    else
        Main->>State: lang = "pt"
    end

    Main->>Storage: ler portfolioTheme
    Main->>State: aplicar tema
    Main->>Storage: ler portfolioMode
    Main->>State: aplicar modo (gui/cli)
    Main->>Storage: ler portfolioPetActive
    Main->>State: petActive = savedValue

    Main->>Main: setupEventListeners()
    Main->>Main: updateUiText()

    alt Modo GUI
        Main->>Main: showGui()
        Main->>Main: initTaskbarClock()
    else Modo CLI
        Main->>Main: showTerminal()
        Main->>Main: printBanner()
    end
```

---

## 9. Diagrama de Sequência — Visualizador de Algoritmos

```mermaid
%%{init: {"theme": "dark"}}%%
sequenceDiagram
    actor User as Usuário
    participant GUI as Janela GUI
    participant AlgoViewer as algorithmViewer.js
    participant Canvas as Canvas API

    User->>GUI: abre janela "Algorithms"
    GUI->>AlgoViewer: init(container, i18n)
    AlgoViewer->>Canvas: cria canvas
    AlgoViewer->>GUI: renderiza controles (select, botões)
    AlgoViewer->>AlgoViewer: geraArrayAleatorio()
    AlgoViewer->>Canvas: desenha barras iniciais

    User->>GUI: seleciona algoritmo (ex: Merge Sort)
    User->>GUI: clica "Executar"
    GUI->>AlgoViewer: run(algorithm)
    AlgoViewer->>AlgoViewer: gera passos de animação

    loop Para cada passo
        AlgoViewer->>Canvas: highlight(indices, colors)
        AlgoViewer->>Canvas: swap/merge barras
        AlgoViewer->>GUI: atualiza status
        Note over AlgoViewer: aguarda delay (speed)
    end

    AlgoViewer->>GUI: status = "Execução concluída"
    AlgoViewer->>Canvas: barras em verde (sorted)

    opt Usuário pausa
        User->>GUI: clica "Pausar"
        GUI->>AlgoViewer: pause()
        User->>GUI: clica "Passo"
        GUI->>AlgoViewer: step()
    end
```

---

## 10. Diagrama de Atividades — Processamento de Tema

```mermaid
%%{init: {"theme": "dark"}}%%
flowchart TD
    A([Usuário executa: theme X]) --> B{X é tema válido?}
    B -- Não --> C[exibe erro + temas disponíveis]
    C --> Z([fim])
    B -- Sim --> D[remove classes de tema antigas do body]
    D --> E[adiciona body.theme-X]
    E --> F{Tema tem efeitos ASCII?}
    F -- Sim --> G[ativa overlay ASCII\nscan-lines + vignette]
    F -- Não --> H[desativa overlay ASCII]
    G --> I{Tema é 'fire'?}
    H --> I
    I -- Sim --> J[inicia DoomFire canvas]
    I -- Não --> K{Tema é 'hacker' ou 'secret'?}
    K -- Sim --> L[inicia Matrix Rain canvas]
    K -- Não --> M[para Matrix Rain se ativa]
    J --> N[salva tema no localStorage]
    L --> N
    M --> N
    N --> O[atualiza meta theme-color]
    O --> P[exibe mensagem: Tema alterado para X]
    P --> Z
```

---

## 11. Diagrama de Atividades — Sistema de Mascote (Pet)

```mermaid
%%{init: {"theme": "dark"}}%%
flowchart TD
    A([Evento detectado]) --> B{Pet está ativo?}
    B -- Não --> Z([ignora])
    B -- Sim --> C{Tipo de evento}

    C -- "keystroke" --> D{Burst de teclas?}
    D -- Sim --> E[reação: typing]
    D -- Não --> Z

    C -- "command" --> F[reação: command]
    C -- "error" --> G[reação: error]
    C -- "click" --> H[reação: click]

    E --> I{Cooldown ativo?}
    F --> I
    G --> I
    H --> I

    I -- Sim --> Z
    I -- Não --> J[seleciona sprite aleatório\ndo tipo de reação]
    J --> K[exibe bubble com texto]
    K --> L[aplica animação CSS]
    L --> M[agenda limpeza após PET_PERSIST_MS]
    M --> N{Fila de reações?}
    N -- Sim --> O[executa próxima reação\napós PET_QUEUE_STEP_MS]
    N -- Não --> Z
    O --> J
```

---

## 12. Diagrama de Dados — Fluxo de Conteúdo

```mermaid
%%{init: {"theme": "dark"}}%%
flowchart LR
    subgraph Source["Fonte de Dados"]
        DJ["data.json"]
    end

    subgraph Loading["Carregamento"]
        FETCH["fetch(data.json)"]
        FALLBACK["DEFAULT_I18N\n(embutido em main.js)"]
    end

    subgraph State["Estado"]
        CONTENT["state.content\n{pt: {...}, en: {...}}"]
        LANG["state.lang\n'pt' | 'en'"]
    end

    subgraph Rendering["Renderização"]
        TERM["Terminal Output\n(printLines)"]
        GUI_W["Janelas GUI\n(renderWindow)"]
        TASKBAR["Taskbar\n(updateUiText)"]
        MENU["Start Menu\n(updateUiText)"]
        ICONS["Desktop Icons\n(updateUiText)"]
    end

    DJ -->|"fetch OK"| FETCH
    FETCH --> CONTENT
    FETCH -->|"falha"| FALLBACK
    FALLBACK --> CONTENT
    LANG --> CONTENT

    CONTENT -->|"content[lang].about"| TERM
    CONTENT -->|"content[lang].projects"| TERM
    CONTENT -->|"content[lang].education"| TERM
    CONTENT -->|"content[lang].social"| TERM
    CONTENT -->|"content[lang].projects"| GUI_W
    CONTENT -->|"content[lang].education"| GUI_W
    CONTENT -->|"content[lang].ui.labels"| ICONS
    CONTENT -->|"content[lang].ui.labels"| MENU
    CONTENT -->|"content[lang].ui.availabilityBadge"| TASKBAR
```

---

## 13. Diagrama de Implantação (Deployment)

```mermaid
%%{init: {"theme": "dark"}}%%
graph TB
    subgraph Dev["Desenvolvimento Local"]
        DEV["server.js\n(Node.js HTTP, porta 8080)"]
        SRC["Código-fonte\n(main.js, styles/, modules/)"]
    end

    subgraph Build["Pipeline de Build"]
        ESBUILD["esbuild\n(minify + bundle)"]
        DIST["dist/\n(arquivos otimizados)"]
    end

    subgraph CI["CI/CD — GitHub Actions"]
        GHA[".github/workflows/pages.yml\nnpm ci → build → deploy"]
    end

    subgraph Hosting["Hospedagem"]
        GHP["GitHub Pages\nmaitai0981.github.io/portifolio-web"]
        SW_CACHE["Service Worker\n(Cache: core + runtime)"]
    end

    subgraph Backend["Backend Serverless"]
        CF_W["Cloudflare Worker\nportifolio-web.matheussaragoca2017.workers.dev"]
        AI_W["Workers AI\n(Llama 3 — Cloudflare)"]
    end

    subgraph Client["Navegador do Usuário"]
        BROWSER["Aplicação SPA\n(vanilla JS + Canvas + TF.js)"]
    end

    SRC --> ESBUILD
    ESBUILD --> DIST
    DIST --> GHA
    GHA --> GHP
    GHP --> SW_CACHE
    SW_CACHE --> BROWSER
    BROWSER -.->|"fetch /me"| CF_W
    CF_W -.->|"Workers AI API"| AI_W
    AI_W -.->|"resposta gerada"| CF_W
    CF_W -.->|"JSON response"| BROWSER
```

---

## Legenda de Diagramas

| # | Diagrama | Tipo UML |
|---|----------|----------|
| 1 | Casos de Uso | Use Case |
| 2 | Arquitetura de Componentes | Component |
| 3 | Módulos e Relacionamentos | Class |
| 4 | Estados da Aplicação | State Machine |
| 5 | Execução de Comando no Terminal | Sequence |
| 6 | Alternância de Modo GUI ↔ CLI | Sequence |
| 7 | Comando `me` (AI Assistant) | Sequence |
| 8 | Inicialização da Aplicação | Sequence |
| 9 | Visualizador de Algoritmos | Sequence |
| 10 | Processamento de Tema | Activity |
| 11 | Sistema de Mascote | Activity |
| 12 | Fluxo de Dados | Data Flow |
| 13 | Implantação | Deployment |
