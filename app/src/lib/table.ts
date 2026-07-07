// Pure sort + pagination helpers for the admin DataTable (client-side —
// admin lists are capped at 500-1000 rows, well within browser comfort).

export type SortDir = "asc" | "desc";

/** null/undefined sort first; numbers numerically; everything else he-aware localeCompare. */
export function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return (a ? 1 : 0) - (b ? 1 : 0);
  // ISO timestamps compare correctly as strings; Hebrew labels need locale rules.
  return String(a).localeCompare(String(b), "he");
}

/** Stable, non-mutating sort by an accessor. */
export function sortRows<T>(rows: T[], getValue: (row: T) => unknown, dir: SortDir): T[] {
  const indexed = rows.map((row, i) => ({ row, i }));
  indexed.sort((x, y) => {
    const c = compareValues(getValue(x.row), getValue(y.row));
    return (dir === "desc" ? -c : c) || x.i - y.i; // tie → original order (stable)
  });
  return indexed.map((x) => x.row);
}

/** Clamped 1-based pagination. Always returns at least one page. */
export function paginate<T>(
  rows: T[],
  page: number,
  pageSize: number,
): { rows: T[]; page: number; pages: number; total: number } {
  const size = Math.max(1, pageSize);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, Math.floor(page)), pages);
  return { rows: rows.slice((p - 1) * size, p * size), page: p, pages, total: rows.length };
}

/** Buckets ISO timestamps into zero-filled per-day counts for the last N days (inclusive of today). */
export function bucketByDay(isoDates: (string | null | undefined)[], days: number, today = new Date()): { date: string; count: number }[] {
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    buckets.set(dayKey(d), 0);
  }
  for (const iso of isoDates) {
    if (!iso) continue;
    const key = String(iso).slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}
