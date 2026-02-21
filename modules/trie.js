export class TrieNode {
  constructor() {
    this.children = new Map();
    this.isWord = false;
  }
}

export class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    const normalized = String(word ?? "").trim();
    if (!normalized) return;
    let node = this.root;
    for (const ch of normalized) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }
      node = node.children.get(ch);
    }
    node.isWord = true;
  }

  startsWith(prefix, limit = 10) {
    const normalizedPrefix = String(prefix ?? "");
    const normalizedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 10;
    let node = this.root;
    for (const ch of normalizedPrefix) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch);
    }
    const results = [];
    const stack = [{ node, word: normalizedPrefix }];
    while (stack.length && results.length < normalizedLimit) {
      const current = stack.pop();
      if (current.node.isWord) results.push(current.word);
      for (const [ch, child] of current.node.children.entries()) {
        stack.push({ node: child, word: current.word + ch });
      }
    }
    return results.sort();
  }
}
