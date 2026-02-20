# Portfolio Terminal + GUI

Portfolio em formato SPA que alterna entre um terminal interativo e uma interface inspirada no Windows 95.

## Funcionalidades

- Terminal com comandos para navegar pelas seções.
- Interface gráfica com ícones e janelas temáticas.
- Servidor HTTP simples para servir arquivos estáticos.

## Como rodar localmente

Pré-requisito: Node.js instalado.

```bash
npm install
npm run dev
```

O servidor sobe em `http://localhost:8080` (ou na porta definida em `PORT`).

## Build de producao

```bash
npm run build
```

O build gera a pasta `dist/` com assets minificados para deploy estatico.

## Deploy no GitHub Pages

- O workflow `.github/workflows/pages.yml` faz deploy automatico ao dar push na branch `main`.
- A publicacao usa o conteudo de `dist/`.
- Arquivos de suporte ao Pages:
  - `404.html` para fallback de rotas SPA.
  - `.nojekyll` para desativar processamento Jekyll.
  - `robots.txt` e `sitemap.xml` para indexacao.

## Estrutura do projeto

- `index.html`: estrutura principal da aplicação.
- `styles.css`: estilos globais da interface.
- `main.js`: lógica de interação do terminal e da GUI (ES Modules).
- `assets/`: imagens e ícones.
- `data.json`: conteúdo usado nas seções.
- `server.js`: servidor HTTP simples.
- `scripts/build.mjs`: pipeline de build e minificacao para producao.

## Scripts disponíveis

- `npm run dev`: inicia o servidor local.
- `npm start`: equivalente ao `dev`.
