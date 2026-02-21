# Arquitetura

## Visao geral

Aplicacao SPA com entrada em `index.html` e orquestracao principal em `main.js`.

Modos de interface:
- CLI (terminal);
- GUI (janelas estilo retro).

## Fluxo de inicializacao

1. `index.html` carrega metadados, CSS e `main.js`.
2. `main.js` monta referencias de DOM e eventos.
3. Conteudo e carregado de `data.json`.
4. Idioma, tema e preferencias sao aplicados.
5. Em producao, Service Worker e registrado.

## Camadas principais

- Apresentacao:
  - `index.html`
  - `styles.css`
- Aplicacao (orquestracao):
  - `main.js`
- Core (estado e configuracao):
  - `modules/core/appState.js`
  - `modules/core/themeConfig.js`
- Features:
  - `modules/commandSearch.js`
  - `modules/algorithmViewer.js`
  - `modules/cnnDemo.js`
  - `modules/snakeGame.js`
- Dados:
  - `data.json`

## Estado e eventos

`main.js` mantém apenas a coordenacao do estado.

Estado-base e referencias de DOM foram extraidos para `modules/core/appState.js`:
- modo atual (`cli`/`gui`);
- historico de comandos;
- idioma;
- tema;
- estado de janelas;
- preferencias persistidas em `localStorage`.

Configuracoes de tema e presets de animacao ASCII foram extraidos para `modules/core/themeConfig.js`.

Eventos principais:
- teclado no terminal;
- clique/duplo clique em icones desktop;
- atalhos globais;
- interacoes de janela.

## Conteudo e i18n

`data.json` contem:
- `meta`;
- traducoes `pt` e `en`;
- textos de secoes;
- projetos;
- educacao;
- links sociais;
- help e commandHelp.

Fallback local:
- se `data.json` falhar, `main.js` monta conteudo minimo de fallback.

## Service Worker

Arquivo: `service-worker.js`.

Estrategia:
- `networkFirst` para navegacao e JSON;
- `staleWhileRevalidate` para estaticos.

Detalhes:
- cleanup de caches antigos por prefixo;
- fallback para `index.html` em navegacao offline;
- em `localhost`, SW e removido para evitar ruido de desenvolvimento.

## Build

Arquivo: `scripts/build.mjs`.

Pipeline:
- limpa `dist/`;
- copia arquivos definidos em `COPY_LIST`;
- minifica `.js` e `.css` com `esbuild`.

## Deploy

Workflow: `.github/workflows/pages.yml`.

Resumo:
- `npm ci`;
- `npm run build`;
- upload de `dist/`;
- deploy no GitHub Pages.
