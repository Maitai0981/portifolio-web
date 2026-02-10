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
    if (!word) return;
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }
      node = node.children.get(ch);
    }
    node.isWord = true;
  }

  startsWith(prefix, limit = 10) {
    let node = this.root;
    for (const ch of prefix) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch);
    }
    const results = [];
    const stack = [{ node, word: prefix }];
    while (stack.length && results.length < limit) {
      const current = stack.pop();
      if (current.node.isWord) results.push(current.word);
      for (const [ch, child] of current.node.children.entries()) {
        stack.push({ node: child, word: current.word + ch });
      }
    }
    return results.sort();
  }
}
