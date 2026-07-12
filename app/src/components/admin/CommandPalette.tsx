"use client";

// Admin command palette (Ctrl+K / Cmd+K) — navigate, find a user, quick
// actions. Custom ~200-line component, no external dep; opens also via the
// topbar button (window event "rb-open-palette").

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownRight, UserRound, Compass, Zap } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { hasPermission } from "@/lib/site/roles";
import { filterPalette } from "@/lib/palette";
import { NAV_GROUPS } from "@/components/admin/AdminShell";

interface Item {
  id: string;
  labelHe: string;
  keywords?: string;
  section: "nav" | "users" | "actions";
  run: () => void;
}

interface UserHit { id: string; email: string; full_name: string | null }

const SECTION_HE: Record<Item["section"], string> = {
  nav: "ניווט", users: "משתמשים", actions: "פעולות מהירות",
};

const SECTION_ICON: Record<Item["section"], typeof Compass> = {
  nav: Compass, users: UserRound, actions: Zap,
};

export default function CommandPalette({ adminRole = null }: { adminRole?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [userHits, setUserHits] = useState<UserHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setUserHits([]);
    setActive(0);
  }, []);

  // Global open triggers: Ctrl+K / Cmd+K + the topbar button's window event.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpenEvent() { setOpen(true); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("rb-open-palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("rb-open-palette", onOpenEvent);
    };
  }, []);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  // User search — debounced, reuses GET /api/admin/users?q= (email ilike).
  useEffect(() => {
    if (!open || query.trim().length < 2) { setUserHits([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json().catch(() => ({}));
        setUserHits(((json.users ?? []) as UserHit[]).slice(0, 6));
      } catch {
        setUserHits([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const items: Item[] = useMemo(() => {
    const nav: Item[] = NAV_GROUPS.flatMap((g) => g.items)
      .filter((n) => !n.perm || hasPermission(adminRole, n.perm))
      .map((n) => ({
        id: `nav:${n.href}`, labelHe: n.label, keywords: n.href,
        section: "nav" as const, run: () => router.push(n.href),
      }));
    const actions: Item[] = [
      {
        id: "act:audit", labelHe: "פתח יומן פעולות", keywords: "audit log",
        section: "actions", run: () => router.push("/admin/audit"),
      },
      {
        id: "act:assistant", labelHe: "שאל את העוזר AI", keywords: "assistant ai שאלה",
        section: "actions", run: () => router.push("/admin/assistant"),
      },
      {
        id: "act:orchestrator", labelHe: "הרץ את כל הסוכנים (טיוטה)", keywords: "orchestrator dry run agents",
        section: "actions",
        run: () => {
          fetch("/api/admin/agents", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agent: "orchestrator", mode: "dry" }),
          }).catch(() => {});
          router.push("/admin/agents");
        },
      },
    ];
    const users: Item[] = userHits.map((u) => ({
      id: `user:${u.id}`,
      labelHe: u.full_name ? `${u.email} · ${u.full_name}` : u.email,
      keywords: u.email,
      section: "users",
      run: () => router.push(`/admin/users/${u.id}`),
    }));
    return [
      ...users, // server already filtered these by the query
      ...filterPalette([...nav, ...actions], query),
    ];
  }, [adminRole, router, userHits, query]);

  useEffect(() => { setActive(0); }, [query, userHits.length]);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(items.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (item) { item.run(); close(); }
    }
  }

  let lastSection: Item["section"] | null = null;

  return (
    <div className={styles.paletteOverlay} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={styles.paletteBox} role="dialog" aria-modal="true" aria-label="חיפוש מהיר" onKeyDown={onKeyDown}>
        <div className={styles.paletteInputWrap}>
          <Search size={15} strokeWidth={2} style={{ color: "var(--t4)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            className={styles.paletteInput}
            placeholder="חפש דף, משתמש (אימייל) או פעולה…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className={styles.kbd}>Esc</span>
        </div>
        <div className={styles.paletteList}>
          {items.length === 0 && (
            <div className={styles.tableEmpty} style={{ padding: "24px 16px" }}>אין תוצאות</div>
          )}
          {items.map((item, i) => {
            const header = item.section !== lastSection;
            lastSection = item.section;
            const Icon = SECTION_ICON[item.section];
            return (
              <div key={item.id}>
                {header && <div className={styles.paletteSection}>{SECTION_HE[item.section]}</div>}
                <button
                  className={`${styles.paletteItem} ${i === active ? styles.paletteItemActive : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => { item.run(); close(); }}
                >
                  <Icon size={14} strokeWidth={2} style={{ color: "var(--t4)", flexShrink: 0 }} />
                  <span className={styles.flex1} style={{ textAlign: "right" }}>{item.labelHe}</span>
                  {i === active && <CornerDownRight size={13} strokeWidth={2} style={{ color: "var(--accent)" }} />}
                </button>
              </div>
            );
          })}
        </div>
        <div className={styles.paletteHint}>
          <span><span className={styles.kbd}>↑↓</span> ניווט</span>
          <span><span className={styles.kbd}>Enter</span> בחירה</span>
          <span><span className={styles.kbd}>Ctrl+K</span> פתיחה/סגירה</span>
        </div>
      </div>
    </div>
  );
}
