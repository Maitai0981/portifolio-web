# Portfolio Terminal + GUI

Portfolio SPA com dois modos de interacao:
- terminal estilo CLI;
- GUI retro inspirada no Windows 95.

## Preview

### GUI

![Preview GUI](docs/images/preview-gui.png)

### CLI

![Preview CLI](docs/images/preview-cli.png)

## Objetivo

Entregar uma experiencia interativa de apresentacao profissional com foco em:
- navegacao por comandos;
- janelas e componentes visuais;
- deploy estatico no GitHub Pages;
- suporte offline parcial com Service Worker.

## Stack

- HTML + CSS + JavaScript (ES Modules).
- Node.js apenas para servidor local e build.
- `esbuild` para minificacao no build de producao.
- GitHub Actions para deploy automatico no GitHub Pages.

## Como rodar localmente

Pre-requisito:
- Node.js 20+ (recomendado).

Comandos:

```bash
npm install
npm run dev
```

Servidor local:
- URL padrao: `http://localhost:8080`
- Porta customizada: definir `PORT` no ambiente.

## Scripts

- `npm run dev`: sobe o servidor local (`server.js`).
- `npm start`: alias de `npm run dev`.
- `npm run build`: gera `dist/` com arquivos minificados para deploy estatico.
- `npm run lint`: validacoes de JS/TS + checks basicos de HTML.
- `npm run worker:dev`: executa o Worker localmente (Cloudflare).
- `npm run worker:deploy`: publica o Worker no Cloudflare.
- `npm run worker:tail`: acompanha logs do Worker.

## Build de producao

```bash
npm run build
```

Saida:
- pasta `dist/` pronta para publicacao;
- JS/CSS minificados;
- arquivos estaticos copiados automaticamente.

Pipeline de build:
- arquivo: `scripts/build.mjs`
- copia arquivos principais;
- percorre `dist/` e minifica `.js` e `.css`.

## Deploy no GitHub Pages

Workflow:
- arquivo: `.github/workflows/pages.yml`
- gatilho: push em `main` e execucao manual.

Fluxo:
- instala dependencias com `npm ci`;
- executa `npm run build`;
- publica `dist/` via `actions/deploy-pages`.

Arquivos de suporte ao Pages:
- `404.html`: fallback de rota para SPA;
- `.nojekyll`: desativa processamento Jekyll;
- `robots.txt` e `sitemap.xml`: indexacao.

## Estrutura principal

- `index.html`: bootstrap da aplicacao, meta tags, SEO social, schema JSON-LD.
- `main.js`: estado global, comandos, GUI, i18n, registro de SW.
- `styles.css`: tema terminal + GUI.
- `data.json`: conteudo textual (pt/en), projetos e metadados.
- `modules/`: modulos auxiliares (`trie`, `levenshtein`, `commandSearch`, `cnnDemo`, `algorithmViewer`, `snakeGame`).
- `service-worker.js`: cache e fallback offline.
- `wrangler.jsonc`: configuracao do Cloudflare Worker (backend do comando `me`).
- `worker/src/index.ts`: API `/me` com GitHub + Llama 3 (Workers AI).
- `manifest.webmanifest`: metadados PWA.
- `server.js`: servidor HTTP local sem dependencias externas.
- `assets/`: imagens, sprites, capas e modelo CNN.

## Comportamento de cache e Service Worker

- Em producao (HTTPS): Service Worker e registrado.
- Em localhost: Service Worker e removido automaticamente para evitar cache sujo durante desenvolvimento.
- Estrategia principal:
  - navegacao/documento e JSON: `networkFirst` com fallback para `index.html`;
  - estaticos: `staleWhileRevalidate`.

## SEO e indexacao

- `canonical`, `og:*`, `twitter:*` e `theme-color` configurados.
- `sitemap.xml` e `robots.txt` incluidos.
- JSON-LD (`Person`) no `index.html`.

## Roteamento SPA no Pages

- `404.html` redireciona para `/?p=...`.
- `index.html` restaura a rota original no carregamento.
- rotas sem extensao tambem recebem barra final para manter consistencia de caminho.

## Conteudo do portfolio

Fonte unica:
- `data.json`

Para atualizar portfolio:
- edite `translations.pt` e `translations.en`;
- atualize links, projetos, educacao e resume no JSON;
- valide com `npm run build`.

## Troubleshooting rapido

- Erro `refresh.js` com `ws://localhost:8081`:
  - nao pertence ao projeto;
  - normalmente vem de extensao de live reload/preview.
- Mudanca nao aparece no browser:
  - faca hard reload (`Ctrl+F5`);
  - limpe SW/caches no DevTools se necessario.
- Deploy nao atualizou:
  - confira run do workflow em `Actions`;
  - confirme que o Pages usa source `GitHub Actions`.

## Documentacao detalhada

- `docs/ARCHITECTURE.md`
- `docs/DEPLOY_GITHUB_PAGES.md`
- `docs/TROUBLESHOOTING.md`
- `docs/CLOUDFLARE_WORKER_ME.md`
