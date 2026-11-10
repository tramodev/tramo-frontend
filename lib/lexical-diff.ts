type LexicalNode = { type: string; text?: string; format?: number; children?: LexicalNode[]; [key: string]: unknown };

const STRIKETHROUGH = 4;
const HIGHLIGHT = 128;

function matches(before: string[], after: string[]): [number, number][] {
  const table = Array.from({ length: before.length + 1 }, () => new Array<number>(after.length + 1).fill(0));
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      table[i][j] = before[i] === after[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0, j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) pairs.push([i++, j++]);
    else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

function mark(node: LexicalNode, bit: number): LexicalNode {
  if (node.type === 'text') return { ...node, format: (node.format ?? 0) | bit };
  return node.children ? { ...node, children: node.children.map(child => mark(child, bit)) } : node;
}

const isTextRun = (node: LexicalNode) => !!node.children?.length && node.children.every(child => child.type === 'text');

function walk<T>(before: T[], after: T[], pairs: [number, number][], emit: (removed: T[], added: T[], kept: T | null) => void) {
  let i = 0, j = 0;
  for (const [nextI, nextJ] of [...pairs, [before.length, after.length] as [number, number]]) {
    emit(before.slice(i, nextI), after.slice(j, nextJ), nextJ < after.length ? after[nextJ] : null);
    i = nextI + 1; j = nextJ + 1;
  }
}

function diffText(before: LexicalNode, after: LexicalNode): LexicalNode {
  const tokens = (node: LexicalNode) => node.children!.flatMap(child => (child.text ?? '').split(/(\s+)/).filter(Boolean).map(text => ({ ...child, text })));
  const key = (token: LexicalNode) => `${token.format ?? 0}|${token.style ?? ''}|${token.text}`;
  const old = tokens(before), next = tokens(after);
  const out: LexicalNode[] = [];
  walk(old, next, matches(old.map(key), next.map(key)), (removed, added, kept) => {
    out.push(...removed.map(token => mark(token, STRIKETHROUGH)), ...added.map(token => mark(token, HIGHLIGHT)));
    if (kept) out.push(kept);
  });
  const merged = out.reduce<LexicalNode[]>((nodes, token) => {
    const last = nodes.at(-1);
    if (last && JSON.stringify({ ...last, text: '' }) === JSON.stringify({ ...token, text: '' })) nodes[nodes.length - 1] = { ...last, text: last.text! + token.text };
    else nodes.push(token);
    return nodes;
  }, []);
  return { ...after, children: merged };
}

function diffChildren(before: LexicalNode[], after: LexicalNode[]): LexicalNode[] {
  const out: LexicalNode[] = [];
  walk(before, after, matches(before.map(node => JSON.stringify(node)), after.map(node => JSON.stringify(node))), (removed, added, kept) => {
    while (removed.length && added.length && removed[0].type === added[0].type && removed[0].children && added[0].children) {
      const old = removed.shift()!, next = added.shift()!;
      out.push(isTextRun(old) && isTextRun(next) ? diffText(old, next) : { ...next, children: diffChildren(old.children!, next.children!) });
    }
    out.push(...removed.map(node => mark(node, STRIKETHROUGH)), ...added.map(node => mark(node, HIGHLIGHT)));
    if (kept) out.push(kept);
  });
  return out;
}

export function diffNoteContent(before: string | null, after: string | null): string | null {
  if (!after) return after;
  try {
    const next = JSON.parse(after);
    const old = before ? JSON.parse(before) : { root: { children: [] } };
    return JSON.stringify({ ...next, root: { ...next.root, children: diffChildren(old.root.children ?? [], next.root.children ?? []) } });
  } catch {
    return after;
  }
}
