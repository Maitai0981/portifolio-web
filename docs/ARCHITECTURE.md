# Arquitetura

## Visao geral

Aplicacao SPA com entrada em `app/index.html`.

O entrypoint `app/main.js` agora e fino e delega toda a inicializacao para:
- `app/modules/app/bootstrap.js`

O bootstrap segue composição funcional:
- `app/modules/app/runtime/runtime.js` (criação de contexto + runtime)
- `app/modules/app/runtime/dependencies.js` (injeção de dependências)
- `app/modules/app/runtime/legacyRuntime.js` (motor existente encapsulado)

Isso reduz acoplamento no arquivo raiz e centraliza a orquestracao em um modulo de aplicacao dedicado.

Modos de interface:
- CLI (terminal);
- GUI (desktop retro).

## Estrutura por camadas

- `app/main.js`
  - composicao da aplicacao (apenas bootstrap)
- `app/modules/app/`
  - orquestracao do runtime e ciclo de vida
  - runtime funcional com composição + injeção
- `app/modules/core/`
  - estado base, preferencias e presets de tema
- `app/modules/features/`
  - dominios funcionais (terminal, pet, gui, effects)
- `app/modules/*.js`
  - utilitarios e features independentes (busca de comandos, demos, jogos)
- `app/styles.css` + `app/styles/`
  - estilo em camadas (`base`, `components`, `themes`, `effects`)
- `config/`
  - configuracoes do workspace (`package.json`, `playwright`, `wrangler`, `lighthouse`)
- `worker/src/`
  - backend edge para endpoint `me`

## Fluxo de inicializacao

1. `app/index.html` carrega metadados, CSS e `app/main.js`.
2. `app/main.js` executa `initPortfolioApp()`.
3. `app/modules/app/bootstrap.js`:
   - cria estado e refs de DOM;
   - registra eventos;
   - carrega `app/data.json`;
   - aplica idioma/tema/preferencias;
   - inicia terminal, GUI e pet;
   - registra Service Worker em producao.

## Barrels e contratos

Para reduzir imports diretos e padronizar domínios:
- `app/modules/core/index.js`
- `app/modules/features/gui/index.js`
- `app/modules/features/pet/index.js`
- `app/modules/features/terminal/index.js`
- `app/modules/features/effects/index.js`

Esses arquivos funcionam como contratos publicos de cada camada.

## Conteudo e i18n

`app/data.json` concentra:
- metadata;
- traducoes (`pt` e `en`);
- secoes de conteudo;
- lista de projetos/educacao/social;
- help e commandHelp.

Se `app/data.json` falhar, o bootstrap aplica fallback local minimo para manter o app operacional.

## Service Worker

Arquivo: `app/service-worker.js`.

Estrategias:
- `networkFirst` para navegacao e dados;
- `staleWhileRevalidate` para assets estaticos.

Detalhes:
- versionamento de cache por prefixo;
- limpeza de caches antigos;
- fallback para `index.html` offline;
- desregistro automatico em `localhost`.

## Build e deploy

- Build: `scripts/build.mjs`
  - limpa `dist/`;
  - copia arquivos do `app/` definidos em `COPY_LIST`;
  - injeta versao de build;
  - minifica JS/CSS com `esbuild`.

- Deploy:
  - GitHub Pages via `.github/workflows/pages.yml`;
  - Cloudflare Worker via `config/wrangler.jsonc` e `worker/src/index.ts`.
