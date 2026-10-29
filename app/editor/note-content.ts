import { parseAllowedColor, parseAllowedFontSize } from '@/app/editor/styleConfig';

const supportedNodeTypes = new Set(['root', 'paragraph', 'text', 'linebreak', 'tab', 'heading', 'quote',
  'list', 'listitem', 'code', 'code-highlight', 'link', 'autolink', 'image', 'equation', 'music',
  'embed', 'table', 'tablerow', 'tablecell', 'horizontalrule']);

export function isLegacyNoteContent(content: string): boolean {
  if (!content) return false;
  if (content.length > 1024 * 1024 || new TextEncoder().encode(content).length > 1024 * 1024) return true;
  try {
    const state = JSON.parse(content);
    if (!state || typeof state !== 'object' || state.root?.type !== 'root' || !Array.isArray(state.root.children)) return true;
    const nodes: { value: unknown; depth: number }[] = [{ value: state.root, depth: 0 }];
    while (nodes.length) {
      const { value, depth } = nodes.pop()!;
      if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
      const node = value as Record<string, unknown>;
      if (depth > 100 || !supportedNodeTypes.has(String(node.type)) || (depth > 0 && node.type === 'root')) return true;
      if (node.type === 'equation' || node.type === 'music') {
        const source = node.type === 'equation' ? node.equation : node.abc;
        if (typeof source !== 'string' || source.length > 10000) return true;
      }
      if (node.type === 'link' || node.type === 'autolink') {
        if (typeof node.url !== 'string') return true;
        const internal = node.type === 'link' && node.url === '#' && typeof node.rel === 'string'
          && /^(?:(?:tramo-idea:|mypath-idea:)\d+|tramo-extraction:[0-9a-fA-F-]{36})$/.test(node.rel);
        const placeholder = node.type === 'link' && node.url === 'https://';
        if (!internal && !placeholder) {
          const scheme = /^([a-z][a-z\d+.-]*):/i.exec(node.url.trim())?.[1]?.toLowerCase();
          if (!scheme || !['http', 'https', 'mailto', 'sms', 'tel'].includes(scheme)) return true;
        }
      }
      if ('children' in node) {
        if (!Array.isArray(node.children)) return true;
        nodes.push(...node.children.map(value => ({ value, depth: depth + 1 })));
      }
    }
    return false;
  } catch {
    return true;
  }
}

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
  if (state.root.children.length === 0) {
    state.root.children.push({ type: 'paragraph', version: 1, children: [], direction: null, format: '', indent: 0, textFormat: 0, textStyle: '' });
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

export function serializeNoteContent(state: unknown, includePendingImages = true): string {
  return JSON.stringify(state, (key, value) => key === 'children' && Array.isArray(value)
    ? value.filter(node => (node.type !== 'equation' || node.equation?.trim())
      && (node.type !== 'music' || node.abc?.trim())
      && (includePendingImages || node.type !== 'image' || node.imageId)) : value);
}
