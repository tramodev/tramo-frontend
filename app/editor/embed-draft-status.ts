const pending = new Set<object>();
const listeners = new Set<() => void>();

export const subscribeEmbedDrafts = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const hasPendingEmbedDrafts = () => pending.size > 0;

export function setPendingEmbedDraft(token: object, dirty: boolean) {
  const wasPending = pending.size > 0;
  if (dirty) pending.add(token);
  else pending.delete(token);
  if (wasPending !== (pending.size > 0)) listeners.forEach(listener => listener());
}
