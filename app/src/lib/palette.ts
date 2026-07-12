// Pure filter/rank for the admin command palette (Ctrl+K).
// Dependency-free — unit-tested; the component only renders the result.

export interface PaletteEntry {
  id: string;
  labelHe: string;
  /** Extra match material (href, English name, synonyms) — never displayed. */
  keywords?: string;
}

type PaletteEntryLike = Pick<PaletteEntry, "labelHe" | "keywords">;

/**
 * Rank a query against an entry: 0 = label starts with the query,
 * 1 = a word in the label starts with it, 2 = substring in the label,
 * 3 = substring in the keywords, -1 = no match. Case-insensitive.
 */
export function rankMatch(entry: PaletteEntryLike, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 2; // empty query matches everything, neutral rank
  const label = entry.labelHe.toLowerCase();
  if (label.startsWith(q)) return 0;
  if (label.split(/\s+/).some((w) => w.startsWith(q))) return 1;
  if (label.includes(q)) return 2;
  if ((entry.keywords ?? "").toLowerCase().includes(q)) return 3;
  return -1;
}

/** Filter + sort entries by match quality (stable within the same rank). */
export function filterPalette<T extends PaletteEntryLike>(entries: T[], query: string): T[] {
  return entries
    .map((e, i) => ({ e, i, rank: rankMatch(e, query) }))
    .filter((x) => x.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.e);
}
