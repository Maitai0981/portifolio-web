const sections = [
  {
    title: "Entrypoints",
    items: [
      "app/index.html -> shell da SPA",
      "app/main.js -> entrypoint fino",
      "app/modules/app/bootstrap.js -> inicializacao completa"
    ]
  },
  {
    title: "Core",
    items: [
      "app/modules/core/appState.js -> estado base",
      "app/modules/core/themeConfig.js -> presets e temas",
      "app/modules/core/index.js -> contrato publico do core"
    ]
  },
  {
    title: "Features",
    items: [
      "app/modules/features/gui/* -> GUI retro",
      "app/modules/features/terminal/* -> CLI e typing",
      "app/modules/features/pet/* -> pet e sprites",
      "app/modules/features/effects/* -> matrix/doom fire",
      "app/modules/features/index.js -> contrato publico das features"
    ]
  },
  {
    title: "Styles",
    items: [
      "app/styles.css -> entrypoint por camadas",
      "app/styles/base.css",
      "app/styles/components.css",
      "app/styles/themes.css",
      "app/styles/effects.css"
    ]
  },
  {
    title: "Backend Edge",
    items: [
      "worker/src/index.ts -> API /me",
      "config/wrangler.jsonc -> config de deploy worker"
    ]
  },
  {
    title: "Testes",
    items: [
      "tests/*.test.mjs -> unitarios/contrato",
      "tests/e2e/*.spec.mjs -> fluxos e snapshots"
    ]
  },
  {
    title: "Docs",
    items: [
      "docs/PROJECT_MAP.md -> mapa de acesso",
      "docs/ARCHITECTURE.md -> arquitetura",
      "docs/DEPLOY_GITHUB_PAGES.md -> deploy",
      "docs/TROUBLESHOOTING.md -> suporte"
    ]
  }
];

console.log("PROJECT MAP");
console.log("===========");
sections.forEach((section) => {
  console.log(`\n[${section.title}]`);
  section.items.forEach((item) => console.log(`- ${item}`));
});
