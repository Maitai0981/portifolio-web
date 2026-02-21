import test from "node:test";
import assert from "node:assert/strict";
import { loadBundledModule } from "./helpers/loadBundledModule.mjs";

const commandSearch = await loadBundledModule("modules/commandSearch.js");

test("buildCommandIndex + prefix search", () => {
  const index = commandSearch.buildCommandIndex(["help", "me", "theme", "typing"]);
  const matches = commandSearch.getPrefixMatches(index, "th", 5);
  assert.deepEqual(matches, ["theme"]);
});

test("suggestCommands returns fuzzy suggestion", () => {
  const index = commandSearch.buildCommandIndex(["help", "projects", "theme", "typing"]);
  const suggestions = commandSearch.suggestCommands(index, "projecs", 4);
  assert.equal(suggestions[0], "projects");
});

test("searchCommands includes description", () => {
  const index = commandSearch.buildCommandIndex(["help", "me"]);
  const helpMap = {
    help: "Show help list",
    me: "Talk with Matheus AI"
  };
  const results = commandSearch.searchCommands(index, "me", helpMap, 4);
  assert.equal(results[0].command, "me");
  assert.equal(results[0].description, "Talk with Matheus AI");
});

test("buildCommandIndex sanitiza entradas invalidas sem quebrar", () => {
  const index = commandSearch.buildCommandIndex(["Help", "", null, 42, "ME", "help", undefined]);
  assert.deepEqual(index.commands, ["help", "42", "me"]);
  assert.deepEqual(commandSearch.getPrefixMatches(index, "h"), ["help"]);
});

test("command search aguenta fuzz de carga sem excecao", () => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789-_";
  const randomWord = () => {
    const len = Math.floor(Math.random() * 24);
    let out = "";
    for (let i = 0; i < len; i += 1) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  };

  for (let i = 0; i < 3000; i += 1) {
    const commands = [];
    const count = 8 + Math.floor(Math.random() * 40);
    for (let j = 0; j < count; j += 1) {
      const t = Math.random();
      if (t < 0.86) commands.push(randomWord());
      else if (t < 0.93) commands.push("");
      else if (t < 0.97) commands.push(null);
      else commands.push(Math.floor(Math.random() * 9999));
    }

    const index = commandSearch.buildCommandIndex(commands);
    const q = Math.random() < 0.2 ? null : randomWord();
    const limit = Math.random() < 0.2 ? -4 : 6;
    const results = commandSearch.suggestCommands(index, q, limit);
    assert.equal(Array.isArray(results), true);
    assert.equal(results.length <= Math.max(0, limit), true);
    const search = commandSearch.searchCommands(index, q, {}, 10);
    assert.equal(Array.isArray(search), true);
    assert.equal(search.length <= 10, true);
  }
});
