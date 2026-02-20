# Troubleshooting

## `refresh.js:13 WebSocket connection to 'ws://localhost:8081/' failed`

Causa:
- script de live reload externo (extensao/preview), nao parte do projeto.

Como resolver:
1. Rodar com `npm run dev`.
2. Desativar live reload do preview/extensao.
3. Recarregar com `Ctrl+F5`.

## Alteracoes nao aparecem

Possiveis causas:
- cache do browser;
- Service Worker antigo;
- aba aberta apontando para build antigo.

Acoes:
1. Hard reload.
2. DevTools > Application > Service Workers > unregister.
3. Limpar `Cache Storage`.

Observacao:
- em `localhost`, o app remove SW e caches proprios automaticamente.

## Deploy do Pages nao atualiza

1. Verificar workflow em `Actions`.
2. Confirmar `Pages` usando `GitHub Actions`.
3. Confirmar push em `main`.
4. Abrir URL final em janela anonima para evitar cache.

## Rota interna da SPA abre 404

1. Confirmar existencia de `404.html` na raiz publicada.
2. Confirmar que `index.html` contem rotina de restauracao de `?p=`.
3. Confirmar `APP_BASE_PATH` correto em `404.html`:
   - atual: `/portifolio-web/`

## Modelo CNN nao carrega

Checar:
- internet ativa (TensorFlow.js vem de CDN);
- `assets/web_model/model.json` publicado;
- `group1-shard1of1.bin` publicado.

## Falha ao carregar `data.json`

1. Confirmar JSON valido.
2. Confirmar caminho relativo correto.
3. Confirmar arquivo publicado em `dist/data.json`.
