export function compareVersionEntries<T extends { id: number }>(before: T[], after: T[]) {
  const oldEntries = new Map(before.map(entry => [entry.id, entry]));
  const newEntries = new Map(after.map(entry => [entry.id, entry]));
  return [...new Set([...oldEntries.keys(), ...newEntries.keys()])].flatMap(id => {
    const previous = oldEntries.get(id);
    const next = newEntries.get(id);
    if (JSON.stringify(previous) === JSON.stringify(next)) return [];
    return [{ id, before: previous, after: next, status: !previous ? 'Added' : !next ? 'Removed' : 'Changed' }];
  });
}
