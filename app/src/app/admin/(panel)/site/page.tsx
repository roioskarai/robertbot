"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Pencil, Trash2, ExternalLink } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { Btn, Card, Field, Select, TextInput, useToast } from "@/components/admin/site/ui";

interface PageRow {
  id: string; slug: string; kind: string; title: string;
  status: string; updated_at: string; published_at: string | null;
}

export default function SitePages() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", kind: "page" });
  const { showToast, ToastHost } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/site/pages");
    const json = await res.json();
    setPages(json.pages ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function seed(force = false) {
    if (force && !confirm("לשחזר את תוכן ברירת המחדל? פעולה זו תדרוס את דף הבית והעיצוב הנוכחיים."))
      return;
    const res = await fetch("/api/admin/site/seed" + (force ? "?force=1" : ""), { method: "POST" });
    const json = await res.json().catch(() => ({}));
    showToast(res.ok ? "✓ התוכן אותחל" : json.error || "שגיאה", res.ok);
    load();
  }

  async function create() {
    if (!form.title.trim()) return showToast("נדרשת כותרת", false);
    const res = await fetch("/api/admin/site/pages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) { setCreating(false); setForm({ title: "", slug: "", kind: "page" }); load(); showToast("✓ העמוד נוצר"); }
    else showToast(json.error || "שגיאה", false);
  }

  async function del(id: string) {
    if (!confirm("למחוק את העמוד?")) return;
    const res = await fetch(`/api/admin/site/pages/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    showToast(res.ok ? "✓ נמחק" : json.error || "שגיאה", res.ok);
    load();
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>בנאי האתר — עמודים</h1>
          <p className={styles.pageDesc}>נהל את דף הבית, עמודים וכתבות בלוג. עריכה ללא קוד.</p>
        </div>
        <div className={styles.row}>
          <Btn onClick={() => seed(false)}><RefreshCw size={14} /> אתחול ראשוני</Btn>
          <Btn onClick={() => seed(true)}><RefreshCw size={14} /> שחזר ברירת מחדל</Btn>
          <Btn variant="primary" onClick={() => setCreating((v) => !v)}><Plus size={14} /> עמוד חדש</Btn>
        </div>
      </div>

      {creating && (
        <Card style={{ marginBottom: 18 }}>
          <div className={`${styles.grid} ${styles.g3}`}>
            <Field label="כותרת">
              <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="לדוגמה: אודות" />
            </Field>
            <Field label="כתובת (slug)" hint="אותיות אנגליות, מספרים ומקפים">
              <TextInput value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="about" />
            </Field>
            <Field label="סוג">
              <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="page">עמוד</option>
                <option value="post">כתבת בלוג</option>
              </Select>
            </Field>
          </div>
          <div className={styles.row}>
            <Btn variant="primary" onClick={create}>צור</Btn>
            <Btn onClick={() => setCreating(false)}>ביטול</Btn>
          </div>
        </Card>
      )}

      <div className={styles.card} style={{ padding: 0, overflow: "hidden" }}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr><th>כותרת</th><th>סוג</th><th>כתובת</th><th>סטטוס</th><th>עודכן</th><th style={{ textAlign: "left" }}>פעולות</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6}><div className={styles.tableEmpty}>טוען…</div></td></tr>}
              {!loading && pages.length === 0 && (
                <tr><td colSpan={6}><div className={styles.tableEmpty}>אין עמודים עדיין — לחץ &quot;אתחול ראשוני&quot; כדי ליצור את דף הבית מהתוכן הקיים</div></td></tr>
              )}
              {!loading && pages.map((p) => (
                <tr key={p.id}>
                  <td className={styles.strong}>{p.title}</td>
                  <td><span className={styles.badge}>{p.kind === "home" ? "דף בית" : p.kind === "post" ? "כתבה" : "עמוד"}</span></td>
                  <td className={styles.mono} style={{ fontSize: 12 }}>/{p.slug === "home" ? "" : p.slug}</td>
                  <td>
                    <span className={`${styles.badge} ${p.status === "published" ? styles.badgeActive : styles.badgeTrial}`}>
                      {p.status === "published" ? "פורסם" : "טיוטה"}
                    </span>
                  </td>
                  <td className={styles.muted} style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                    {new Date(p.updated_at).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" })}
                  </td>
                  <td>
                    <div className={styles.row} style={{ gap: 6, justifyContent: "flex-start" }}>
                      <Link href={`/admin/site/pages/${p.id}`} className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}>
                        <Pencil size={12} /> עריכה
                      </Link>
                      <a href={p.slug === "home" ? "/" : `/${p.slug}`} target="_blank" rel="noreferrer" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}>
                        <ExternalLink size={12} />
                      </a>
                      {p.kind !== "home" && (
                        <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => del(p.id)} style={{ color: "var(--danger)" }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {ToastHost}
    </>
  );
}
