"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, UploadCloud, Plus, Trash2, Download, RotateCcw } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { Btn, Card, Field, TextInput, TextArea, NumberInput, ColorInput, Toggle, useToast } from "@/components/admin/site/ui";
import type { SiteSettingsDoc } from "@/lib/site/types";
import { DEFAULT_SETTINGS } from "@/lib/site/defaults";

interface LinkRow { label: string; href: string }
interface Subscriber { id: string; email: string; source: string | null; created_at: string }

function LinkRows({ rows, onChange }: { rows: LinkRow[]; onChange: (r: LinkRow[]) => void }) {
  const list = rows ?? [];
  return (
    <div style={{ marginBottom: 12 }}>
      {list.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <TextInput placeholder="טקסט" value={r.label} onChange={(e) => onChange(list.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} />
          <TextInput placeholder="קישור" value={r.href} onChange={(e) => onChange(list.map((x, idx) => idx === i ? { ...x, href: e.target.value } : x))} />
          <Btn onClick={() => onChange(list.filter((_, idx) => idx !== i))} style={{ color: "var(--danger)" }}><Trash2 size={13} /></Btn>
        </div>
      ))}
      <Btn onClick={() => onChange([...list, { label: "", href: "" }])}><Plus size={13} /> הוסף</Btn>
    </div>
  );
}

export default function MarketingSettings() {
  const [doc, setDoc] = useState<SiteSettingsDoc>(DEFAULT_SETTINGS);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastHost } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const [s, n] = await Promise.all([
      fetch("/api/admin/site/settings").then((r) => r.json()),
      fetch("/api/admin/site/newsletter").then((r) => r.json()),
    ]);
    setDoc({ ...DEFAULT_SETTINGS, ...(s.draft ?? {}) });
    setSubs(n.subscribers ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const upd = (patch: Partial<SiteSettingsDoc>) => setDoc({ ...doc, ...patch });

  async function save(publish = false) {
    const res = await fetch("/api/admin/site/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft_doc: doc }),
    });
    if (!res.ok) return showToast("שמירה נכשלה", false);
    if (publish) {
      const p = await fetch("/api/admin/site/settings", { method: "POST" });
      return showToast(p.ok ? "✓ פורסם לאתר" : "פרסום נכשל", p.ok);
    }
    showToast("✓ נשמר כטיוטה");
  }

  async function restoreDefaults() {
    if (!confirm("לשחזר את הגדרות האתר (כותרת, תחתית, פס הכרזה, וידג׳ט וואטסאפ) לברירת המחדל? הפעולה משנה את הטיוטה בלבד — תוכל לבדוק לפני פרסום. קוד מותאם יישמר."))
      return;
    const res = await fetch("/api/admin/site/settings/restore-defaults", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return showToast(json.error || "שחזור נכשל", false);
    setDoc({ ...DEFAULT_SETTINGS, ...(json.draft ?? {}) });
    showToast("✓ שוחזר לברירת מחדל (טיוטה) — פרסם כדי להחיל");
  }

  function exportSubs() {
    const csv = "email,source,created_at\n" + subs.map((s) => `${s.email},${s.source ?? ""},${s.created_at}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "subscribers.csv"; a.click();
  }

  if (loading) return <div className={styles.tableEmpty}>טוען…</div>;

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>הגדרות ושיווק</h1>
          <p className={styles.pageDesc}>כותרת, תחתית, פס הכרזה, וידג&apos;ט וואטסאפ ורשימת ניוזלטר.</p>
        </div>
        <div className={styles.row}>
          <Btn onClick={restoreDefaults}><RotateCcw size={14} /> שחזר לברירת מחדל</Btn>
          <Btn onClick={() => save(false)}><Save size={14} /> שמור טיוטה</Btn>
          <Btn variant="primary" onClick={() => save(true)}><UploadCloud size={14} /> פרסם</Btn>
        </div>
      </div>

      <div className={`${styles.grid} ${styles.g2}`}>
        <Card>
          <div style={head}>כותרת (Header)</div>
          <Field label="שם / לוגו"><TextInput value={doc.header.logoText ?? ""} onChange={(e) => upd({ header: { ...doc.header, logoText: e.target.value } })} /></Field>
          <Field label="לוגו (URL תמונה, אופציונלי)"><TextInput value={doc.header.logoImage ?? ""} onChange={(e) => upd({ header: { ...doc.header, logoImage: e.target.value } })} /></Field>
          <Toggle checked={!!doc.header.sticky} onChange={(v) => upd({ header: { ...doc.header, sticky: v } })} label="כותרת דביקה (sticky)" />
          <div style={sub}>פריטי תפריט</div>
          <LinkRows rows={doc.header.navItems} onChange={(navItems) => upd({ header: { ...doc.header, navItems } })} />
          <div className={`${styles.grid} ${styles.g2}`}>
            <Field label="טקסט כפתור"><TextInput value={doc.header.ctaLabel ?? ""} onChange={(e) => upd({ header: { ...doc.header, ctaLabel: e.target.value } })} /></Field>
            <Field label="קישור כפתור"><TextInput value={doc.header.ctaHref ?? ""} onChange={(e) => upd({ header: { ...doc.header, ctaHref: e.target.value } })} /></Field>
          </div>
        </Card>

        <Card>
          <div style={head}>תחתית (Footer)</div>
          <Field label="שם / לוגו"><TextInput value={doc.footer.logoText ?? ""} onChange={(e) => upd({ footer: { ...doc.footer, logoText: e.target.value } })} /></Field>
          <Field label="זכויות יוצרים"><TextInput value={doc.footer.copyright ?? ""} onChange={(e) => upd({ footer: { ...doc.footer, copyright: e.target.value } })} /></Field>
          <Field label="מייל ליצירת קשר"><TextInput value={doc.footer.contactEmail ?? ""} onChange={(e) => upd({ footer: { ...doc.footer, contactEmail: e.target.value } })} /></Field>
          <div style={sub}>קישורי תחתית</div>
          <LinkRows rows={doc.footer.links} onChange={(links) => upd({ footer: { ...doc.footer, links } })} />
        </Card>

        <Card>
          <div style={head}>פס הכרזה</div>
          <Toggle checked={doc.announcement.enabled} onChange={(v) => upd({ announcement: { ...doc.announcement, enabled: v } })} label="הצג פס הכרזה" />
          <Field label="טקסט"><TextInput value={doc.announcement.text ?? ""} onChange={(e) => upd({ announcement: { ...doc.announcement, text: e.target.value } })} /></Field>
          <div className={`${styles.grid} ${styles.g2}`}>
            <Field label="צבע רקע"><ColorInput value={doc.announcement.bg ?? "#18a84f"} onChange={(v) => upd({ announcement: { ...doc.announcement, bg: v } })} /></Field>
            <Field label="צבע טקסט"><ColorInput value={doc.announcement.color ?? "#ffffff"} onChange={(v) => upd({ announcement: { ...doc.announcement, color: v } })} /></Field>
          </div>
          <div className={`${styles.grid} ${styles.g2}`}>
            <Field label="מהירות (שניות)"><NumberInput value={doc.announcement.speed ?? 20} onChange={(e) => upd({ announcement: { ...doc.announcement, speed: Number(e.target.value) } })} /></Field>
            <Field label="קישור"><TextInput value={doc.announcement.link ?? ""} onChange={(e) => upd({ announcement: { ...doc.announcement, link: e.target.value } })} /></Field>
          </div>
        </Card>

        <Card>
          <div style={head}>וידג&apos;ט וואטסאפ</div>
          <Toggle checked={doc.whatsappWidget.enabled} onChange={(v) => upd({ whatsappWidget: { ...doc.whatsappWidget, enabled: v } })} label="הצג כפתור וואטסאפ צף" />
          <Field label="מספר טלפון" hint="פורמט בינלאומי, למשל 972501234567"><TextInput value={doc.whatsappWidget.phone ?? ""} onChange={(e) => upd({ whatsappWidget: { ...doc.whatsappWidget, phone: e.target.value } })} /></Field>
          <Field label="הודעה מוכנה"><TextArea value={doc.whatsappWidget.message ?? ""} onChange={(e) => upd({ whatsappWidget: { ...doc.whatsappWidget, message: e.target.value } })} /></Field>
        </Card>
      </div>

      <Card style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={head}>נרשמים לניוזלטר ({subs.length})</div>
          <Btn onClick={exportSubs}><Download size={14} /> ייצוא CSV</Btn>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead><tr><th>מייל</th><th>מקור</th><th>תאריך</th></tr></thead>
            <tbody>
              {subs.length === 0 && <tr><td colSpan={3}><div className={styles.tableEmpty}>אין נרשמים עדיין</div></td></tr>}
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className={styles.strong}>{s.email}</td>
                  <td className={styles.muted}>{s.source ?? "—"}</td>
                  <td className={styles.muted} style={{ fontSize: 12 }}>{new Date(s.created_at).toLocaleDateString("he-IL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {ToastHost}
    </>
  );
}

const head: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 14 };
const sub: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--t2)", margin: "6px 0 8px" };
