import { Trie } from "./trie.js";
import { levenshtein } from "./levenshtein.js";

function maxDistanceFor(query) {
  const len = query.length;
  if (len <= 4) return 1;
  if (len <= 7) return 2;
  return 3;
}

function buildDescriptions(items, helpMap) {
  return items.map((item) => ({
    command: item.command,
    score: item.score ?? 0,
    description: helpMap[item.command]?.split("\n")[0] || ""
  }));
}

export function buildCommandIndex(commands) {
  const trie = new Trie();
  commands.forEach((command) => trie.insert(command));
  return { trie, commands: [...commands] };
}

export function getPrefixMatches(index, prefix, limit = 10) {
  if (!prefix) return index.commands.slice(0, limit);
  return index.trie.startsWith(prefix, limit);
}

export function searchCommands(index, query, helpMap = {}, limit = 20) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) {
    return buildDescriptions(
      index.commands.slice(0, limit).map((command) => ({ command, score: 0 })),
      helpMap
    );
  }

  const results = [];
  const used = new Set();

  const prefixMatches = getPrefixMatches(index, q, limit);
  prefixMatches.forEach((command) => {
    results.push({ command, score: 0 });
    used.add(command);
  });

  const threshold = maxDistanceFor(q);
  const fuzzy = [];
  index.commands.forEach((command) => {
    if (used.has(command)) return;
    const dist = levenshtein(q, command);
    if (dist <= threshold) {
      fuzzy.push({ command, score: dist + 1 });
    }
  });

  fuzzy.sort((a, b) => a.score - b.score || a.command.localeCompare(b.command));
  fuzzy.slice(0, limit - results.length).forEach((item) => {
    results.push(item);
    used.add(item.command);
  });

  return buildDescriptions(results, helpMap);
}

export function suggestCommands(index, query, limit = 6) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return [];
  const prefixMatches = getPrefixMatches(index, q, limit);
  if (prefixMatches.length) return prefixMatches;
  const threshold = maxDistanceFor(q);
  const fuzzy = index.commands
    .map((command) => ({ command, score: levenshtein(q, command) }))
    .filter((item) => item.score <= threshold)
    .sort((a, b) => a.score - b.score || a.command.localeCompare(b.command))
    .slice(0, limit)
    .map((item) => item.command);
  return fuzzy;
}
