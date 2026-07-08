"use client";

import { useMemo, useState, type ReactNode } from "react";
import styles from "@/app/admin/admin.module.css";
import { sortRows, paginate, type SortDir } from "@/lib/table";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  /** Value used for sorting (defaults to row[key]). */
  sortValue?: (row: T) => unknown;
  /** Cell renderer (defaults to String(row[key])). */
  render?: (row: T) => ReactNode;
  align?: "right" | "center" | "left";
  thStyle?: React.CSSProperties;
  /** Hide this column below a breakpoint on mobile ("sm" ≤640px, "md" ≤960px). */
  hideBelow?: "sm" | "md";
}

function hideClass(hideBelow?: "sm" | "md"): string {
  return hideBelow === "sm" ? styles.hideSm : hideBelow === "md" ? styles.hideMd : "";
}

// Generic client-side sortable + paginated table over already-fetched rows.
// Server search/filter stays with the caller; this only orders + pages.
export default function DataTable<T extends { id: string }>({
  columns,
  rows,
  pageSize = 20,
  initialSort,
  emptyText = "אין נתונים",
  loading = false,
}: {
  columns: Column<T>[];
  rows: T[];
  pageSize?: number;
  initialSort?: { key: string; dir: SortDir };
  emptyText?: string;
  loading?: boolean;
}) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(initialSort ?? null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const getVal = col.sortValue ?? ((r: T) => (r as Record<string, unknown>)[col.key]);
    return sortRows(rows, getVal, sort.dir);
  }, [rows, sort, columns]);

  const view = useMemo(() => paginate(sorted, page, pageSize), [sorted, page, pageSize]);

  function toggleSort(key: string) {
    setPage(1);
    setSort((s) =>
      s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  return (
    <div className={styles.tableWrap}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${col.sortable ? styles.sortable : ""} ${hideClass(col.hideBelow)}`.trim() || undefined}
                  style={{ textAlign: col.align ?? "right", ...col.thStyle }}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  {col.label}
                  {col.sortable && sort?.key === col.key && (
                    <span className={styles.sortArrow}>{sort.dir === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={columns.length}><div className={styles.tableEmpty}>טוען…</div></td></tr>
            )}
            {!loading && view.rows.length === 0 && (
              <tr><td colSpan={columns.length}><div className={styles.tableEmpty}>{emptyText}</div></td></tr>
            )}
            {!loading && view.rows.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key} className={hideClass(col.hideBelow) || undefined} style={{ textAlign: col.align ?? "right" }}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && view.total > pageSize && (
        <div className={styles.pager}>
          <span className={styles.pagerInfo}>עמוד {view.page} מתוך {view.pages} · {view.total} שורות</span>
          <div className={styles.pagerBtns}>
            <button
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={view.page <= 1}
            >הקודם</button>
            <button
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
              onClick={() => setPage((p) => Math.min(view.pages, p + 1))}
              disabled={view.page >= view.pages}
            >הבא</button>
          </div>
        </div>
      )}
    </div>
  );
}
