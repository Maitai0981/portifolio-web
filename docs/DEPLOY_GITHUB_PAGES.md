# Deploy no GitHub Pages

## Requisitos

- Repositorio no GitHub.
- Branch principal `main`.
- Aba `Pages` configurada para `GitHub Actions`.

## Workflow

Arquivo: `.github/workflows/pages.yml`.

Trigger:
- push em `main`;
- `workflow_dispatch`.

Etapas:
1. Checkout.
2. Setup Node 20.
3. `npm ci` em `config/`.
4. `npm run build` em `config/`.
5. Upload de `dist/`.
6. Deploy com `actions/deploy-pages`.

## Arquivos obrigatorios de suporte

- `.nojekyll`
- `app/404.html`
- `app/robots.txt`
- `app/sitemap.xml`

## SPA fallback

Como funciona:
- Pages retorna `app/404.html` em rota desconhecida.
- `app/404.html` redireciona para `/?p=<rota-original>`.
- `app/index.html` le `p`, restaura a URL e continua o boot da SPA.

## Publicacao local para validar

```bash
npm --prefix config install
npm --prefix config run build
npm --prefix config run dev
```

Validar:
- navegacao em `/portifolio-web/`;
- recarregar pagina em rotas internas;
- conferir assets em `dist/`.

## Checklist antes do push

- `npm --prefix config run build` sem erro;
- links principais funcionando;
- `app/data.json` valido;
- `app/index.html` com `__APP_VERSION__` atualizado;
- sem arquivos locais desnecessarios no commit.
