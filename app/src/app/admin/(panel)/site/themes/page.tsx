"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Check, Trash2, Copy, Download, Upload } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { Btn, Card, Field, TextInput, useToast } from "@/components/admin/site/ui";
import type { ThemeTokens } from "@/lib/site/types";
import { DEFAULT_THEME } from "@/lib/site/defaults";

interface Theme { id: string; name: string; tokens: ThemeTokens; is_active: boolean; is_default: boolean }

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastHost } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/site/themes");
    const json = await res.json();
    setThemes(json.themes ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(tokens: ThemeTokens, nm: string) {
    const res = await fetch("/api/admin/site/themes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nm, tokens }),
    });
    showToast(res.ok ? "✓ נוצר" : "שגיאה", res.ok);
    setName(""); load();
  }
  async function activate(id: string) {
    const res = await fetch(`/api/admin/site/themes/${id}/activate`, { method: "POST" });
    showToast(res.ok ? "✓ הוחל לאתר" : "שגיאה", res.ok); load();
  }
  async function del(id: string) {
    if (!confirm("למחוק ערכה?")) return;
    const res = await fetch(`/api/admin/site/themes/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    showToast(res.ok ? "✓ נמחק" : json.error || "שגיאה", res.ok); load();
  }
  function exportTheme(t: Theme) {
    const blob = new Blob([JSON.stringify({ name: t.name, tokens: t.tokens }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `theme-${t.name}.json`;
    a.click();
  }
  async function importTheme(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      await create({ ...DEFAULT_THEME, ...parsed.tokens }, parsed.name || "ערכה מיובאת");
    } catch { showToast("קובץ לא תקין", false); }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>ערכות נושא</h1>
          <p className={styles.pageDesc}>שמור, שכפל, ייבא וייצא ערכות עיצוב. הפעל ערכה כדי להחיל על האתר.</p>
        </div>
        <div className={styles.row}>
          <input ref={fileRef} type="file" accept="application/json" onChange={importTheme} style={{ display: "none" }} />
          <Btn onClick={() => fileRef.current?.click()}><Upload size={14} /> ייבוא</Btn>
        </div>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Field label="שם ערכה חדשה"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="ערכה חדשה" /></Field>
          </div>
          <div style={{ marginBottom: 14 }}>
            <Btn variant="primary" onClick={() => create(DEFAULT_THEME, name || "ערכה חדשה")}><Plus size={14} /> צור ערכה</Btn>
          </div>
        </div>
      </Card>

      <div className={`${styles.grid} ${styles.g3}`}>
        {loading && <div className={styles.tableEmpty}>טוען…</div>}
        {themes.map((t) => (
          <Card key={t.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: "var(--t1)" }}>{t.name}</span>
              {t.is_active && <span className={`${styles.badge} ${styles.badgeActive}`}>פעילה</span>}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {(["green", "purple", "bg", "t1"] as const).map((k) => (
                <span key={k} title={k} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: t.tokens?.colors?.[k] ?? "#000" }} />
              ))}
            </div>
            <div className={styles.row} style={{ gap: 6, flexWrap: "wrap" }}>
              {!t.is_active && <Btn variant="primary" onClick={() => activate(t.id)}><Check size={13} /> הפעל</Btn>}
              <Btn onClick={() => create(t.tokens, `${t.name} (עותק)`)}><Copy size={13} /></Btn>
              <Btn onClick={() => exportTheme(t)}><Download size={13} /></Btn>
              {!t.is_default && !t.is_active && <Btn onClick={() => del(t.id)} style={{ color: "var(--danger)" }}><Trash2 size={13} /></Btn>}
            </div>
          </Card>
        ))}
      </div>
      {ToastHost}
    </>
  );
}
