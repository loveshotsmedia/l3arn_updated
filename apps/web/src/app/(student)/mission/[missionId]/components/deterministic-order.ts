/**
 * Deterministic string hash (FNV-1a followed by a murmur3-style avalanche
 * finalizer). Used purely to derive a stable, correctness-independent
 * display order for options/tray items — this is NOT for security/uniqueness.
 *
 * Shared by OptionListTask.tsx and SortTrayTask.tsx. This function was
 * previously duplicated byte-for-byte in both components; it was extracted
 * here after the drift risk was flagged in review, since it's already been
 * the site of one real bug (alphabetical-sort predictability) and keeping
 * two independently-editable copies risks a second fix landing in only one
 * place.
 *
 * The avalanche finalizer matters: plain FNV-1a alone still clusters
 * similar-prefixed strings (e.g. "critique-correct" vs.
 * "critique-distractor-a/-b", or "crystal-blue" vs. "crystal-red") into
 * nearby hash values, which can accidentally reproduce the same
 * always-first ordering a naive alphabetical sort had. The avalanche step
 * spreads single-bit input differences across the whole output so option
 * order can't be inferred from naming conventions like "correct"/"distractor".
 */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/**
 * Sorts items by a hash of their itemId rather than the itemId text itself —
 * see hashString above for why a plain alphabetical sort is unsafe here.
 * Stable across re-renders (same items -> same order every time) since the
 * hash is a pure function of itemId.
 */
export function sortByHash<T extends { itemId: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => hashString(a.itemId) - hashString(b.itemId));
}
