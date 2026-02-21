import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";

const root = process.cwd();
const dataPath = path.join(root, "data.json");
const indexPath = path.join(root, "index.html");
const mainPath = path.join(root, "main.js");
const manifestPath = path.join(root, "manifest.webmanifest");
const robotsPath = path.join(root, "robots.txt");
const sitemapPath = path.join(root, "sitemap.xml");

const data = JSON.parse(await readFile(dataPath, "utf8"));
const indexHtml = await readFile(indexPath, "utf8");
const mainSource = await readFile(mainPath, "utf8");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const robots = await readFile(robotsPath, "utf8");
const sitemap = await readFile(sitemapPath, "utf8");

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

test("main.js segue arquitetura modular de core", () => {
  assert.match(mainSource, /from "\.\/modules\/core\/appState\.js"/);
  assert.match(mainSource, /from "\.\/modules\/core\/themeConfig\.js"/);
  assert.match(mainSource, /createAppState\(/);
  assert.match(mainSource, /createDomRefs\(/);
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
