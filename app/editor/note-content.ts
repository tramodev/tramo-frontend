import { parseAllowedColor, parseAllowedFontSize } from '@/app/editor/styleConfig';

const supportedNodeTypes = new Set(['root', 'paragraph', 'text', 'linebreak', 'tab', 'heading', 'quote',
  'list', 'listitem', 'code', 'code-highlight', 'link', 'autolink', 'image', 'equation', 'music',
  'embed', 'table', 'tablerow', 'tablecell', 'horizontalrule']);

function isSafeLink(node: Record<string, unknown>): boolean {
  if (typeof node.url !== 'string') return false;
  if (node.type === 'link' && node.url === '#'
    && typeof node.rel === 'string'
    && /^(?:(?:tramo-idea:|mypath-idea:)\d+|tramo-extraction:[0-9a-fA-F-]{36})$/.test(node.rel)) return true;
  if (node.type === 'link' && node.url === 'https://') return true;
  try {
    const url = new URL(node.url.trim().replace(/ /g, '%20').replace(/\{/g, '%7B').replace(/\}/g, '%7D'));
    return ['http:', 'https:'].includes(url.protocol) ? !!url.hostname
      : ['mailto:', 'sms:', 'tel:'].includes(url.protocol);
  } catch { return false; }
}

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
      for (const field of ['style', 'textStyle']) {
        if (field in node && (typeof node[field] !== 'string' || sanitizeNoteStyle(node[field]) !== node[field]
          || [...node[field].matchAll(/rgb\((\d+), (\d+), (\d+)\)/g)].some(match => match.slice(1).some(channel => Number(channel) > 255)))) return true;
      }
      if (node.type === 'embed') {
        if (Object.keys(node).some(key => !['type', 'version', 'format', 'provider', 'id'].includes(key))) return true;
        if (!(node.provider === 'youtube' && typeof node.id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(node.id)
          || node.provider === 'tweet' && typeof node.id === 'string' && /^[1-9]\d{0,19}$/.test(node.id))) return true;
      }
      if (node.type === 'equation' || node.type === 'music') {
        const source = node.type === 'equation' ? node.equation : node.abc;
        if (typeof source !== 'string' || source.length > 10000) return true;
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
      const children = node.children;
      const sanitizedChildren = children.flatMap(child => child && typeof child === 'object' && !Array.isArray(child)
        && (child.type === 'link' || child.type === 'autolink') && !isSafeLink(child)
        ? Array.isArray(child.children) ? child.children : [] : [child]);
      node.children = sanitizedChildren;
      for (const child of sanitizedChildren) nodes.push(child);
    }
  }
  return JSON.stringify(state);
}

export function serializeNoteContent(state: unknown, includePendingImages = true): string {
  return JSON.stringify(state, (key, value) => key === 'children' && Array.isArray(value)
    ? value.filter(node => (node.type !== 'equation' || typeof node.equation !== 'string' || node.equation.trim())
      && (node.type !== 'music' || typeof node.abc !== 'string' || node.abc.trim())
      && (includePendingImages || node.type !== 'image' || node.imageId)) : value);
}
