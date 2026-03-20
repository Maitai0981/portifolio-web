# Mapa de Projeto

Guia rapido para acessar cada parte do repositorio sem precisar procurar arquivo por arquivo.

## Entrypoints

- `app/index.html`: shell da SPA, meta tags, SEO e boot client.
- `app/main.js`: entrypoint minimo.
- `app/modules/app/bootstrap.js`: composição funcional de inicialização.
- `app/modules/app/runtime/runtime.js`: fábrica de runtime/contexto.
- `app/modules/app/runtime/dependencies.js`: injeção de dependências.
- `app/modules/app/runtime/legacyRuntime.js`: motor legado encapsulado.

## Camada Core

- `app/modules/core/appState.js`: estado inicial e refs de DOM.
- `app/modules/core/themeConfig.js`: temas, presets ASCII, cores.
- `app/modules/core/index.js`: ponto unico de exportacao do core.

## Camada Features

- `app/modules/features/gui/`: configuracoes e contrato da GUI.
- `app/modules/features/terminal/`: comandos, typing e comportamento CLI.
- `app/modules/features/pet/`: config do pet e sprite sheet.
- `app/modules/features/effects/`: matrix adaptive e Doom Fire.
- `app/modules/features/index.js`: ponto unico de exportacao das features.

## Utilitarios de Dominio

- `app/modules/commandSearch.js`: indice, busca e sugestao de comandos.
- `app/modules/algorithmViewer.js`: visualizador de algoritmos.
- `app/modules/cnnDemo.js`: demo da CNN.
- `app/modules/snakeGame.js`: jogo Snake.
- `app/modules/index.js`: facade de acesso do diretorio `modules/`.

## Estilos

- `app/styles.css`: entrypoint de estilos por camadas.
- `app/styles/base.css`: base global.
- `app/styles/components.css`: componentes visuais.
- `app/styles/themes.css`: overrides de tema.
- `app/styles/effects.css`: efeitos visuais e performance hints.

## Backend Edge

- `worker/src/index.ts`: API `/me` no Cloudflare Worker.
- `config/wrangler.jsonc`: configuracao do Worker.

## Dados e Conteudo

- `app/data.json`: i18n, texto, projetos, educacao e metadados.
- `app/assets/`: imagens, sprites, covers e modelo.

## Testes

- `tests/*.test.mjs`: unitarios e contrato.
- `tests/e2e/*.spec.mjs`: fluxos reais de UI e snapshots.

## Scripts

- `scripts/build.mjs`: build/minificacao para `dist/`.
- `scripts/lint.mjs`: lint de JS/TS + checks HTML.
- `scripts/project-map.mjs`: imprime mapa de acesso no terminal.
- `scripts/soak-tests.mjs`: carga/fuzz.

## Comandos de acesso rapido

```bash
npm run project:map
npm run lint
npm test
npm run test:e2e
npm run build
```
