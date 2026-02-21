import { Trie } from "./trie.js";
import { levenshtein } from "./levenshtein.js";

function maxDistanceFor(query) {
  const len = query.length;
  if (len <= 4) return 1;
  if (len <= 7) return 2;
  return 3;
}

function normalizeCommand(command) {
  return String(command ?? "").toLowerCase().trim();
}

function normalizeLimit(limit, fallback) {
  if (!Number.isFinite(limit)) return fallback;
  return Math.max(0, Math.floor(limit));
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
  const normalizedCommands = Array.from(
    new Set((Array.isArray(commands) ? commands : []).map(normalizeCommand).filter(Boolean))
  );
  normalizedCommands.forEach((command) => trie.insert(command));
  return { trie, commands: normalizedCommands };
}

export function getPrefixMatches(index, prefix, limit = 10) {
  const q = normalizeCommand(prefix);
  const normalizedLimit = normalizeLimit(limit, 10);
  if (!q) return index.commands.slice(0, normalizedLimit);
  return index.trie.startsWith(q, normalizedLimit);
}

export function searchCommands(index, query, helpMap = {}, limit = 20) {
  const q = normalizeCommand(query);
  const normalizedLimit = normalizeLimit(limit, 20);
  if (!q) {
    return buildDescriptions(
      index.commands.slice(0, normalizedLimit).map((command) => ({ command, score: 0 })),
      helpMap
    );
  }

  const results = [];
  const used = new Set();

  const prefixMatches = getPrefixMatches(index, q, normalizedLimit);
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
  fuzzy.slice(0, normalizedLimit - results.length).forEach((item) => {
    results.push(item);
    used.add(item.command);
  });

  return buildDescriptions(results, helpMap);
}

export function suggestCommands(index, query, limit = 6) {
  const q = normalizeCommand(query);
  const normalizedLimit = normalizeLimit(limit, 6);
  if (!q) return [];
  const prefixMatches = getPrefixMatches(index, q, normalizedLimit);
  if (prefixMatches.length) return prefixMatches;
  const threshold = maxDistanceFor(q);
  const fuzzy = index.commands
    .map((command) => ({ command, score: levenshtein(q, command) }))
    .filter((item) => item.score <= threshold)
    .sort((a, b) => a.score - b.score || a.command.localeCompare(b.command))
    .slice(0, normalizedLimit)
    .map((item) => item.command);
  return fuzzy;
}
