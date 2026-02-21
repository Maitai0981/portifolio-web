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
