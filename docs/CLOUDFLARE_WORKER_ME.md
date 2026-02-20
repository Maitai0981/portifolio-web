# Cloudflare Worker (Gratis) para comando `me`

Este projeto foi preparado para usar um backend serverless gratuito via Cloudflare Worker.

## Arquivos adicionados

- `wrangler.jsonc`
- `worker/src/index.ts`

## O que o Worker faz

- Endpoint `POST /me`
- Busca repositorios no GitHub do usuario em `GITHUB_USERNAME`
- Busca README dos repos mais relevantes para a pergunta
- Usa Llama 3 via Workers AI (`@cf/meta/llama-3.1-8b-instruct`)
- Retorna:
  - `answer` (texto da resposta)
  - `sources` (repos usados)

## Variaveis no Cloudflare (Dashboard > Worker > Settings > Variables)

### Vars

- `GITHUB_USERNAME` (ex: `Maitai0981`)
- `ALLOWED_ORIGIN` (ex: `https://maitai0981.github.io`)

### Secrets

- `GITHUB_TOKEN` (token de leitura do GitHub)

## Deploy via CLI (local)

```bash
npm run worker:deploy
```

## Deploy via Git integration (Cloudflare)

No projeto de Worker no Cloudflare:

- Build command: `npm run build` (opcional, para validar site)
- Deploy command: `npx wrangler deploy`

Importante: agora existe `wrangler.jsonc` no root, entao `wrangler deploy` encontra o entrypoint em `worker/src/index.ts`.

## Integracao no frontend

No `index.html`, configure:

```html
<meta name="me-api-url" content="https://SEU-WORKER.workers.dev" />
```

O `main.js` adiciona automaticamente `/me` ao final da URL.

## Teste rapido

Saude:

```bash
curl https://SEU-WORKER.workers.dev/health
```

Pergunta:

```bash
curl -X POST https://SEU-WORKER.workers.dev/me \
  -H "Content-Type: application/json" \
  -d "{\"question\":\"me fale dos meus projetos de IA\",\"lang\":\"pt\"}"
```

## Observacoes

- Se o modelo/servico falhar, o Worker responde com fallback baseado em repositorios.
- O frontend tambem possui fallback local (sem travar o comando `me`).
