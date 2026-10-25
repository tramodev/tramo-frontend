import { parseAllowedColor, parseAllowedFontSize } from '@/app/editor/styleConfig';

export function sanitizeNoteStyle(input: unknown): string {
  if (typeof input !== 'string') return '';
  let removed = false;
  const safe = input.split(';').flatMap(declaration => {
    if (!declaration.trim()) return [];
    const colon = declaration.indexOf(':');
    if (colon < 0) { removed = true; return []; }
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).trim();
    const allowed = property === 'font-size' ? parseAllowedFontSize(value)
      : property === 'color' || property === 'background-color' ? parseAllowedColor(value) : '';
    if (!allowed) { removed = true; return []; }
    return [`${property}: ${allowed};`];
  }).join(' ');
  return removed ? safe : input;
}

export function sanitizeNoteContent(content: string): string {
  const state = JSON.parse(content);
  if (!state?.root || state.root.type !== 'root' || !Array.isArray(state.root.children)) {
    throw new Error('Invalid note content');
  }
  const nodes: unknown[] = [state.root];
  while (nodes.length) {
    const value = nodes.pop();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid note node');
    const node = value as Record<string, unknown>;
    if (node.type === 'heading' && (typeof node.tag !== 'string' || !/^h[1-6]$/.test(node.tag))) {
      throw new Error('Invalid heading tag');
    }
    if ('style' in node) node.style = sanitizeNoteStyle(node.style);
    if ('textStyle' in node) node.textStyle = sanitizeNoteStyle(node.textStyle);
    if (Array.isArray(node.children)) {
      for (const child of node.children) nodes.push(child);
    }
  }
  return JSON.stringify(state);
}
