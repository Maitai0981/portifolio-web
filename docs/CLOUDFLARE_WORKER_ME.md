# Cloudflare Worker (Gratis) para comando `me`

Este projeto foi preparado para usar um backend serverless gratuito via Cloudflare Worker.

## Arquivos adicionados

- `config/wrangler.jsonc`
- `worker/src/index.ts`

## O que o Worker faz

- Endpoint `POST /me`
- Endpoint `POST /inspector-auth` (valida senha do `me-inspector`)
- Endpoint `GET /metrics` (metrica basica de requests/erros/latencia)
- Busca repositorios no GitHub do usuario em `GITHUB_USERNAME`
- Busca README dos repos mais relevantes para a pergunta
- Usa Llama 3 via Workers AI (`@cf/meta/llama-3.1-8b-instruct`)
- Retorna:
  - `answer` (texto da resposta)
  - `sources` (repos usados)
  - `meta.schema` (contrato `me.v1`)

## Variaveis no Cloudflare (Dashboard > Worker > Settings > Variables)

### Vars

- `GITHUB_USERNAME` (ex: `Maitai0981`)
- `ALLOWED_ORIGIN` (uma ou mais origens separadas por virgula, ex: `https://maitai0981.github.io,http://localhost:8080`)

### Secrets

- `GITHUB_TOKEN` (token de leitura do GitHub)
- `INSPECTOR_PASSWORD_HASH` (hash SHA-256 da senha do `me-inspector`)
- `METRICS_KEY` (opcional, chave para proteger `GET /metrics`)

Exemplo para gerar hash SHA-256 da senha:

```bash
node -e "const c=require('crypto'); const s='SUA-SENHA-FORTE'; console.log(c.createHash('sha256').update(s).digest('hex'));"
```

## Deploy via CLI (local)

```bash
npm --prefix config run worker:deploy
```

## Deploy via Git integration (Cloudflare)

No projeto de Worker no Cloudflare:

- Build command: `npm --prefix config run build` (opcional, para validar site)
- Deploy command: `npx wrangler deploy --config ./config/wrangler.jsonc`

Importante: o arquivo de configuracao agora fica em `config/wrangler.jsonc`.

Se o Cloudflare mostrar aviso de `Worker name mismatch`, alinhe o campo `name` no `config/wrangler.jsonc` com o nome esperado pelo projeto de Build conectado (neste repo: `portifolio-web`).

## Integracao no frontend

No `app/index.html`, configure:

```html
<meta name="me-api-url" content="https://SEU-WORKER.workers.dev" />
```

O `app/main.js` adiciona automaticamente `/me` ao final da URL.

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

Autenticacao do inspector:

```bash
curl -X POST https://SEU-WORKER.workers.dev/inspector-auth \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"SUA-SENHA-FORTE\"}"
```

Metricas:

```bash
curl https://SEU-WORKER.workers.dev/metrics -H "x-metrics-key: SUA_CHAVE"
```

## Observacoes

- Se o modelo/servico falhar, o Worker responde com fallback baseado em repositorios.
- O frontend tambem possui fallback local (sem travar o comando `me`).
