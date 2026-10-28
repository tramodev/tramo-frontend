export interface ItemContentBackup {
  content: string;
  expectedContent: string;
  restoreEpoch: number;
  extractionEpoch: number;
}

const keyFor = (userId: string, projectId: string, itemId: string) => `tramo:item-content:${userId}:${projectId}:${itemId}`;

export function readItemContentBackup(userId: string, projectId: string, itemId: string): ItemContentBackup | null {
  const key = keyFor(userId, projectId, itemId);
  const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value?.content !== 'string' || typeof value.expectedContent !== 'string'
      || !Number.isSafeInteger(value.restoreEpoch) || value.restoreEpoch < 0
      || !Number.isSafeInteger(value.extractionEpoch) || value.extractionEpoch < 0) return null;
    const root = JSON.parse(value.content)?.root;
    return root?.type === 'root' && Array.isArray(root.children) ? value : null;
  } catch { return null; }
}

export function writeItemContentBackup(userId: string, projectId: string, itemId: string, value: ItemContentBackup) {
  const owner = localStorage.getItem('tramo:draft-owner');
  if (owner === null || owner === userId) {
    const key = keyFor(userId, projectId, itemId);
    sessionStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export function removeItemContentBackup(userId: string, projectId: string, itemId: string, content?: string) {
  const key = keyFor(userId, projectId, itemId);
  const backup = readItemContentBackup(userId, projectId, itemId);
  if (content !== undefined && backup?.content !== content) return;
  sessionStorage.setItem(key, '');
  if (localStorage.getItem(key) === JSON.stringify(backup)) localStorage.removeItem(key);
}
