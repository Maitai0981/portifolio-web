import test from "node:test";
import assert from "node:assert/strict";
import { loadBundledModule } from "./helpers/loadBundledModule.mjs";

const appStateModule = await loadBundledModule("modules/core/appState.js");
const themeConfigModule = await loadBundledModule("modules/core/themeConfig.js");

test("createAppState monta estado inicial com viewport aplicado ao pet", () => {
  const state = appStateModule.createAppState({
    initialMode: "gui",
    viewportWidth: 1000,
    viewportHeight: 600
  });

  assert.equal(state.mode, "gui");
  assert.equal(state.options.typingSpeed, 12);
  assert.equal(state.shell.cwd, "~");
  assert.equal(state.pet.lastPointerX, 500);
  assert.equal(state.pet.lastPointerY, 300);
  assert.equal(Array.isArray(state.matrix.fireHeat), true);
  assert.equal(state.matrix.fireCols, 0);
});

test("createDomRefs expõe todas as referencias esperadas nulas", () => {
  const dom = appStateModule.createDomRefs();
  const requiredKeys = [
    "terminal",
    "terminalOutput",
    "terminalInput",
    "commandMenu",
    "gui",
    "desktop",
    "taskbar",
    "startMenu",
    "taskbarClock",
    "themeColorMeta"
  ];
  requiredKeys.forEach((key) => {
    assert.equal(key in dom, true);
    assert.equal(dom[key], null);
  });
});

test("themeConfig contém temas e classes necessárias", () => {
  assert.equal(Array.isArray(themeConfigModule.THEMES), true);
  assert.equal(themeConfigModule.THEMES.includes("fire"), true);
  assert.equal(themeConfigModule.THEME_CLASSES.includes("theme-secret"), true);
});

test("getAsciiThemePreset usa fallback seguro e fire possui parâmetros específicos", () => {
  const fallback = themeConfigModule.getAsciiThemePreset("nao-existe");
  assert.equal(fallback, themeConfigModule.ASCII_THEME_PRESETS.hacker);

  const fire = themeConfigModule.getAsciiThemePreset("fire");
  assert.equal(fire.fireLevels > 0, true);
  assert.equal(fire.fireDecayMax > 0, true);
  assert.equal(typeof fire.chars, "string");
});

test("isAsciiThemeEnabled ativa apenas temas ascii", () => {
  assert.equal(themeConfigModule.isAsciiThemeEnabled("hacker"), true);
  assert.equal(themeConfigModule.isAsciiThemeEnabled("secret"), true);
  assert.equal(themeConfigModule.isAsciiThemeEnabled("fire"), true);
  assert.equal(themeConfigModule.isAsciiThemeEnabled("dark"), false);
  assert.equal(themeConfigModule.isAsciiThemeEnabled("retro"), false);
});
