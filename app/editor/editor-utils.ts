export const lastItemStorageKey = (projectId: string) => `tramo:lastItem:${projectId}`;
export const SIDEBAR_OPEN_STORAGE_KEY = 'tramo:editorSidebarOpen';
export const CONNECTIONS_OPEN_STORAGE_KEY = 'tramo:editorConnectionsOpen';

export function collectPlainText(content: string): string[] {
  const texts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const record = node as { text?: unknown; equation?: unknown; children?: unknown };
    if (typeof record.text === 'string') texts.push(record.text);
    else if (typeof record.equation === 'string') texts.push(record.equation);
    if (Array.isArray(record.children)) record.children.forEach(walk);
  };
  walk((JSON.parse(content) as { root?: unknown }).root);
  return texts;
}

export const MIN_SEARCH_LENGTH = 3;

export function searchableText(content: string): string {
  try {
    return collectPlainText(content).join('').toLowerCase();
  } catch {
    return '';
  }
}

export function countTextStats(content: string): { words: number; characters: number } {
  if (!content) return { words: 0, characters: 0 };
  try {
    const texts = collectPlainText(content);
    const characters = texts.reduce((sum, text) => sum + text.length, 0);
    const joined = texts.join(' ').trim();
    const words = joined ? joined.split(/\s+/).length : 0;
    return { words, characters };
  } catch {
    return { words: 0, characters: 0 };
  }
}

export function countProjectTextStats(items: Record<string, { content: string | null; textStats?: { words: number; characters: number } }>) {
  const total = { words: 0, characters: 0 };
  for (const item of Object.values(items)) {
    if (item.content === null && !item.textStats) return null;
    const stats = item.textStats ?? countTextStats(item.content ?? '');
    total.words += stats.words;
    total.characters += stats.characters;
  }
  return total;
}

export function isAuthError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('401');
}
