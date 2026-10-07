export function createPendingSaves() {
  const entries = new Map<string, { save: () => Promise<unknown>; promise: Promise<unknown> | null; retryable: boolean }>();
  function track<T>(key: string, save: () => Promise<T>, retryable = false): Promise<T> {
    const previous = entries.get(key)?.promise;
    const entry = { save, retryable, promise: (async () => {
      if (previous) await previous.catch(() => {});
      return save();
    })() as Promise<T> | null };
    entries.set(key, entry);
    const promise = entry.promise!;
    promise.then(() => { if (entries.get(key) === entry) entries.delete(key); }, () => { entry.promise = null; });
    return promise;
  }
  async function flush() {
    while (entries.size > 0) {
      await Promise.all([...entries].map(([key, entry]) => {
        if (entry.promise) return entry.promise;
        if (entry.retryable) return track(key, entry.save, true);
        throw new Error('A project change could not be saved. Retry the failed action or refresh the project before exporting.');
      }));
    }
  }
  return { track, flush };
}
