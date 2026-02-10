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

## Estrutura do projeto

- `index.html`: estrutura principal da aplicação.
- `styles.css`: estilos globais da interface.
- `main.js`: lógica de interação do terminal e da GUI (ES Modules).
- `assets/`: imagens e ícones.
- `data.json`: conteúdo usado nas seções.
- `server.js`: servidor HTTP simples.

## Scripts disponíveis

- `npm run dev`: inicia o servidor local.
- `npm start`: equivalente ao `dev`.
