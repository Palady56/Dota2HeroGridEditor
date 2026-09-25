let counter = 0;

export function createId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter.toString(36)}`;
}

/** After restoring saved data, make sure new ids never repeat the restored ones. */
export function reserveIds(ids: Iterable<string>): void {
  for (const id of ids) {
    const n = parseInt(id.slice(id.lastIndexOf("_") + 1), 36);
    if (Number.isFinite(n) && n > counter) counter = n;
  }
}
