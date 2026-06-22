"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Upload, RotateCcw } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { Btn, Card, useToast } from "@/components/admin/site/ui";

interface Entry { id: string; actor_email: string | null; action: string; entity_type: string | null; created_at: string }

const ACTION_LABEL: Record<string, string> = {
  "page.publish": "פרסום עמוד", "page.save_draft": "שמירת טיוטה", "page.create": "יצירת עמוד",
  "page.delete": "מחיקת עמוד", "page.restore_version": "שחזור גרסה", "settings.publish": "פרסום הגדרות",
  "settings.save_draft": "שמירת הגדרות", "theme.update": "עדכון עיצוב", "theme.activate": "הפעלת ערכה",
  "theme.create": "יצירת ערכה", "media.upload": "העלאת מדיה", "media.delete": "מחיקת מדיה",
  "banner.create": "יצירת באנר", "banner.update": "עדכון באנר", "banner.delete": "מחיקת באנר",
  "site.seed": "אתחול אתר", "site.restore_defaults": "שחזור ברירת מחדל", "site.restore_backup": "שחזור גיבוי",
};

export default function HistoryPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastHost } = useToast();

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/site/audit");
    const json = await res.json();
    setEntries(json.entries ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function exportBackup() {
    const res = await fetch("/api/admin/site/backup");
    if (!res.ok) return showToast("ייצוא נכשל", false);
    const json = await res.json();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(json, null, 2)], { type: "application/json" }));
    a.download = `robert-site-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast("✓ הגיבוי הורד");
  }

  async function importBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("שחזור גיבוי ידרוס את התוכן הנוכחי. להמשיך?")) return;
    try {
      const body = await file.text();
      const res = await fetch("/api/admin/site/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body });
      const json = await res.json().catch(() => ({}));
      showToast(res.ok ? "✓ שוחזר מהגיבוי" : json.error || "שחזור נכשל", res.ok);
      load();
    } catch { showToast("קובץ לא תקין", false); }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function restoreDefaults() {
    if (!confirm("לשחזר את כל האתר לברירת המחדל? פעולה זו תדרוס תוכן ועיצוב.")) return;
    const res = await fetch("/api/admin/site/seed?force=1", { method: "POST" });
    showToast(res.ok ? "✓ שוחזר לברירת מחדל" : "שגיאה", res.ok);
    load();
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>יומן שינויים וגיבוי</h1>
          <p className={styles.pageDesc}>גבה, שחזר, ועקוב אחר כל פעולה שבוצעה בבנאי האתר.</p>
        </div>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 12 }}>גיבוי ושחזור</div>
        <div className={styles.row} style={{ gap: 8, flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept="application/json" onChange={importBackup} style={{ display: "none" }} />
          <Btn variant="primary" onClick={exportBackup}><Download size={14} /> ייצוא גיבוי מלא</Btn>
          <Btn onClick={() => fileRef.current?.click()}><Upload size={14} /> שחזור מגיבוי</Btn>
          <Btn onClick={restoreDefaults} style={{ color: "var(--warning)" }}><RotateCcw size={14} /> שחזר ברירת מחדל</Btn>
        </div>
      </Card>

      <div className={styles.card} style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <div className={styles.cardTitle} style={{ margin: 0 }}>יומן שינויים</div>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead><tr><th>פעולה</th><th>אובייקט</th><th>מבצע</th><th>תאריך</th></tr></thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={4}><div className={styles.tableEmpty}>אין רשומות עדיין</div></td></tr>}
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className={styles.strong}>{ACTION_LABEL[e.action] ?? e.action}</td>
                  <td className={styles.muted}>{e.entity_type ?? "—"}</td>
                  <td className={styles.muted} style={{ fontSize: 12 }}>{e.actor_email ?? "—"}</td>
                  <td className={styles.muted} style={{ fontSize: 12, whiteSpace: "nowrap" }}>{new Date(e.created_at).toLocaleString("he-IL")}</td>
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
