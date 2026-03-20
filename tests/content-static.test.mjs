import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testDir, "..");
const appRoot = path.join(root, "app");
const dataPath = path.join(appRoot, "data.json");
const indexPath = path.join(appRoot, "index.html");
const mainPath = path.join(appRoot, "main.js");
const bootstrapPath = path.join(appRoot, "modules", "app", "bootstrap.js");
const runtimeIndexPath = path.join(appRoot, "modules", "app", "runtime", "index.js");
const runtimeCorePath = path.join(appRoot, "modules", "app", "runtime", "runtime.js");
const runtimeLegacyPath = path.join(appRoot, "modules", "app", "runtime", "legacyRuntime.js");
const modulesFacadePath = path.join(appRoot, "modules", "index.js");
const featuresFacadePath = path.join(appRoot, "modules", "features", "index.js");
const projectMapDocPath = path.join(root, "docs", "PROJECT_MAP.md");
const manifestPath = path.join(appRoot, "manifest.webmanifest");
const robotsPath = path.join(appRoot, "robots.txt");
const sitemapPath = path.join(appRoot, "sitemap.xml");
const stylesPath = path.join(appRoot, "styles.css");

const data = JSON.parse(await readFile(dataPath, "utf8"));
const indexHtml = await readFile(indexPath, "utf8");
const mainSource = await readFile(mainPath, "utf8");
const bootstrapSource = await readFile(bootstrapPath, "utf8");
const runtimeIndexSource = await readFile(runtimeIndexPath, "utf8");
const runtimeCoreSource = await readFile(runtimeCorePath, "utf8");
const runtimeLegacySource = await readFile(runtimeLegacyPath, "utf8");
const modulesFacadeSource = await readFile(modulesFacadePath, "utf8");
const featuresFacadeSource = await readFile(featuresFacadePath, "utf8");
const projectMapDocSource = await readFile(projectMapDocPath, "utf8");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const robots = await readFile(robotsPath, "utf8");
const sitemap = await readFile(sitemapPath, "utf8");
const stylesSource = await readFile(stylesPath, "utf8");

test("data.json possui traduções e seções essenciais em pt/en", () => {
  assert.equal(typeof data.meta?.user, "string");
  assert.equal(typeof data.meta?.machine, "string");

  const idiomas = ["pt", "en"];
  idiomas.forEach((lang) => {
    const t = data.translations?.[lang];
    assert.ok(t, `translation ausente: ${lang}`);
    assert.equal(Array.isArray(t.banner), true);
    assert.equal(Array.isArray(t.about), true);
    assert.equal(Array.isArray(t.projects), true);
    assert.equal(Array.isArray(t.help), true);
    assert.equal(typeof t.commandHelp?.theme, "string");
    assert.match(t.commandHelp.theme, /\bfire\b/i);
  });
});

test("estrutura de projetos está consistente", () => {
  const projetos = data.translations?.pt?.projects || [];
  assert.equal(projetos.length > 0, true);

  projetos.forEach((projeto, idx) => {
    assert.equal(typeof projeto.name, "string", `project[${idx}].name inválido`);
    assert.equal(typeof projeto.description, "string", `project[${idx}].description inválido`);
    assert.equal(Array.isArray(projeto.stack), true, `project[${idx}].stack inválido`);
    assert.equal(Array.isArray(projeto.links), true, `project[${idx}].links inválido`);
  });
});

test("index.html contém contratos estruturais da aplicação", () => {
  const requiredPatterns = [
    /<div id="app">/i,
    /<section id="terminal"/i,
    /<section id="gui"/i,
    /id="taskbar"/i,
    /meta name="me-api-url"/i,
    /<script type="module" src="\.\/main\.js\?v=/i
  ];
  requiredPatterns.forEach((pattern) => {
    assert.match(indexHtml, pattern);
  });
});

test("entrypoint main.js delega bootstrap para módulo de aplicação", () => {
  assert.match(mainSource, /from "\.\/modules\/app\/bootstrap\.js"/);
  assert.match(mainSource, /initPortfolioApp\(\)/);
});

test("bootstrap.js faz composição funcional do runtime", () => {
  assert.match(bootstrapSource, /from "\.\/runtime\/index\.js"/);
  assert.match(bootstrapSource, /createPortfolioDependencies\(/);
  assert.match(bootstrapSource, /createPortfolioRuntime\(/);
  assert.match(bootstrapSource, /runtime\.start\(\)/);
});

test("runtime modular separa contratos e motor legado", () => {
  assert.match(runtimeIndexSource, /from "\.\/dependencies\.js"/);
  assert.match(runtimeIndexSource, /from "\.\/runtime\.js"/);
  assert.match(runtimeIndexSource, /from "\.\/legacyRuntime\.js"/);
  assert.match(runtimeCoreSource, /export function createPortfolioRuntime/);
  assert.match(runtimeLegacySource, /from "\.\.\/\.\.\/core\/index\.js"/);
  assert.match(runtimeLegacySource, /from "\.\.\/\.\.\/features\/effects\/index\.js"/);
  assert.match(runtimeLegacySource, /createAppState\(/);
});

test("index.html mantém versão consistente entre APP_VERSION e assets cacheados", () => {
  const appVersionMatch = indexHtml.match(/window\.__APP_VERSION__\s*=\s*"([^"]+)"/);
  assert.ok(appVersionMatch);
  const appVersion = appVersionMatch[1];

  const manifestVersionMatch = indexHtml.match(/manifest\.webmanifest\?v=([^"]+)/);
  const stylesVersionMatch = indexHtml.match(/styles\.css\?v=([^"]+)/);
  const mainVersionMatch = indexHtml.match(/main\.js\?v=([^"]+)/);

  assert.ok(manifestVersionMatch);
  assert.ok(stylesVersionMatch);
  assert.ok(mainVersionMatch);

  assert.equal(manifestVersionMatch[1], appVersion);
  assert.equal(stylesVersionMatch[1], appVersion);
  assert.equal(mainVersionMatch[1], appVersion);
});

test("manifest, robots e sitemap possuem configuração básica válida", () => {
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(Array.isArray(manifest.icons), true);
  assert.equal(manifest.icons.length > 0, true);

  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, /Sitemap:\s*https:\/\/maitai0981\.github\.io\/portifolio-web\/sitemap\.xml/i);

  assert.match(sitemap, /<urlset/i);
  assert.match(sitemap, /<loc>https:\/\/maitai0981\.github\.io\/portifolio-web\/<\/loc>/i);
});

test("styles.css usa arquitetura em camadas via imports", () => {
  assert.match(stylesSource, /@layer\s+base,\s*components,\s*themes,\s*effects;/i);
  assert.match(stylesSource, /@import url\("\.\/styles\/base\.css"\)\s+layer\(base\);/i);
  assert.match(stylesSource, /@import url\("\.\/styles\/components\.css"\)\s+layer\(components\);/i);
  assert.match(stylesSource, /@import url\("\.\/styles\/themes\.css"\)\s+layer\(themes\);/i);
  assert.match(stylesSource, /@import url\("\.\/styles\/effects\.css"\)\s+layer\(effects\);/i);
});

test("facades de módulos expõem pontos centrais de acesso", () => {
  assert.match(modulesFacadeSource, /from "\.\/core\/index\.js"/);
  assert.match(modulesFacadeSource, /from "\.\/features\/index\.js"/);
  assert.match(featuresFacadeSource, /from "\.\/terminal\/index\.js"/);
  assert.match(featuresFacadeSource, /from "\.\/pet\/index\.js"/);
  assert.match(featuresFacadeSource, /from "\.\/effects\/index\.js"/);
});

test("documentação possui mapa de acesso do projeto", () => {
  assert.match(projectMapDocSource, /# Mapa de Projeto/);
  assert.match(projectMapDocSource, /## Entrypoints/);
  assert.match(projectMapDocSource, /## Comandos de acesso rapido/);
});
