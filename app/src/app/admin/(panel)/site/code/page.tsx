"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, UploadCloud, AlertTriangle } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { Btn, Card, Field, TextArea, useToast } from "@/components/admin/site/ui";
import type { SiteSettingsDoc } from "@/lib/site/types";
import { DEFAULT_SETTINGS } from "@/lib/site/defaults";

const mono: React.CSSProperties = { fontFamily: "monospace", fontSize: 12.5, minHeight: 140 };

export default function CustomCodePage() {
  const [doc, setDoc] = useState<SiteSettingsDoc>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastHost } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const s = await fetch("/api/admin/site/settings").then((r) => r.json());
    setDoc({ ...DEFAULT_SETTINGS, ...(s.draft ?? {}) });
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(publish = false) {
    const res = await fetch("/api/admin/site/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft_doc: doc }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return showToast(json.error || "שמירה נכשלה", false);
    if (publish) {
      const p = await fetch("/api/admin/site/settings", { method: "POST" });
      return showToast(p.ok ? "✓ פורסם לאתר" : "פרסום נכשל", p.ok);
    }
    showToast("✓ נשמר כטיוטה");
  }

  if (loading) return <div className={styles.tableEmpty}>טוען…</div>;

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>קוד מותאם אישית</h1>
          <p className={styles.pageDesc}>CSS, JavaScript וסקריפטים. למנהל ראשי בלבד.</p>
        </div>
        <div className={styles.row}>
          <Btn onClick={() => save(false)}><Save size={14} /> שמור טיוטה</Btn>
          <Btn variant="primary" onClick={() => save(true)}><UploadCloud size={14} /> פרסם</Btn>
        </div>
      </div>

      <Card style={{ marginBottom: 18, display: "flex", gap: 10, alignItems: "flex-start", borderColor: "var(--warning)" }}>
        <AlertTriangle size={18} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: "var(--t2)" }}>
          קוד מותאם רץ ישירות באתר החי. קוד שגוי עלול לשבור את העיצוב או לפגוע באבטחה.
          ודא שאתה סומך על המקור של כל סקריפט שאתה מוסיף.
        </div>
      </Card>

      <Card style={{ marginBottom: 18 }}>
        <Field label="CSS מותאם" hint="נטען בכל עמודי האתר"><TextArea value={doc.customCss ?? ""} onChange={(e) => setDoc({ ...doc, customCss: e.target.value })} style={mono} placeholder=".my-class { color: red; }" /></Field>
        <Field label="JavaScript מותאם" hint="רץ בכל עמוד"><TextArea value={doc.customJs ?? ""} onChange={(e) => setDoc({ ...doc, customJs: e.target.value })} style={mono} placeholder="console.log('hello');" /></Field>
      </Card>

      <Card>
        <Field label="סקריפטים ל-Head" hint="למשל קוד מעקב / פיקסלים (כולל תגי <script>)"><TextArea value={doc.headerScripts ?? ""} onChange={(e) => setDoc({ ...doc, headerScripts: e.target.value })} style={mono} /></Field>
        <Field label="סקריפטים לסוף הדף" hint="נטענים בסוף ה-body"><TextArea value={doc.footerScripts ?? ""} onChange={(e) => setDoc({ ...doc, footerScripts: e.target.value })} style={mono} /></Field>
      </Card>
      {ToastHost}
    </>
  );
}
