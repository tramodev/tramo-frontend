const pending = new Set<object>();
const listeners = new Set<() => void>();
let visible = false;
let timer: ReturnType<typeof setTimeout> | null = null;

export const subscribeEmbedDrafts = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const hasPendingEmbedDrafts = () => visible;

function show(next: boolean) {
  if (visible === next) return;
  visible = next;
  listeners.forEach(listener => listener());
}

export function setPendingEmbedDraft(token: object, dirty: boolean) {
  if (dirty) pending.add(token);
  else pending.delete(token);
  if (!pending.size) {
    if (timer) clearTimeout(timer);
    timer = null;
    show(false);
  } else if (!visible && !timer) {
    timer = setTimeout(() => {
      timer = null;
      show(pending.size > 0);
    }, 1000);
  }
}
