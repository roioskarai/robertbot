"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, Paintbrush } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { Btn, Card, Field, TextInput, NumberInput, ColorInput, Toggle, useToast } from "@/components/admin/site/ui";
import type { ThemeTokens } from "@/lib/site/types";
import { DEFAULT_THEME } from "@/lib/site/defaults";

interface Theme { id: string; name: string; tokens: ThemeTokens; is_active: boolean }

const COLOR_FIELDS: { key: keyof ThemeTokens["colors"]; label: string }[] = [
  { key: "green", label: "צבע ראשי" },
  { key: "greenD", label: "ראשי כהה / hover" },
  { key: "greenPale", label: "ראשי בהיר" },
  { key: "purple", label: "צבע משני" },
  { key: "bg", label: "רקע" },
  { key: "white", label: "רקע כרטיסים" },
  { key: "t1", label: "טקסט כותרות" },
  { key: "t2", label: "טקסט גוף" },
  { key: "t3", label: "טקסט משני" },
  { key: "bdr", label: "גבולות" },
];

const GOOGLE_FONTS = ["", "Rubik", "Heebo", "Assistant", "Open Sans Hebrew", "Secular One", "Suez One"];

export default function DesignSettings() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [tokens, setTokens] = useState<ThemeTokens>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast, ToastHost } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/site/themes");
    const json = await res.json();
    const active: Theme | undefined = (json.themes ?? []).find((t: Theme) => t.is_active) ?? (json.themes ?? [])[0];
    if (active) { setTheme(active); setTokens({ ...DEFAULT_THEME, ...active.tokens }); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setColor = (k: keyof ThemeTokens["colors"], v: string) =>
    setTokens({ ...tokens, colors: { ...tokens.colors, [k]: v } });
  const setTypo = (k: keyof ThemeTokens["typography"], v: string | number) =>
    setTokens({ ...tokens, typography: { ...tokens.typography, [k]: v } });
  const setLayout = (k: keyof ThemeTokens["layout"], v: string | number | boolean) =>
    setTokens({ ...tokens, layout: { ...tokens.layout, [k]: v } });
  const setDark = (k: keyof ThemeTokens["dark"], v: string | boolean) =>
    setTokens({ ...tokens, dark: { ...tokens.dark, [k]: v } });

  async function save() {
    if (!theme) return;
    setSaving(true);
    const res = await fetch(`/api/admin/site/themes/${theme.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens }),
    });
    setSaving(false);
    showToast(res.ok ? "✓ העיצוב נשמר ופורסם לאתר" : "השמירה נכשלה", res.ok);
  }

  if (loading) return <div className={styles.tableEmpty}>טוען…</div>;
  if (!theme)
    return (
      <Card><div style={{ textAlign: "center", padding: 24, color: "var(--t3)" }}>
        אין ערכת נושא פעילה. עבור ל&quot;עמודים&quot; ולחץ &quot;אתחול ראשוני&quot; תחילה.
      </div></Card>
    );

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}><Paintbrush size={20} style={{ verticalAlign: -3 }} /> עיצוב האתר</h1>
          <p className={styles.pageDesc}>צבעים, פונטים ופריסה. שינויים נשמרים ומתפרסמים מיד לאתר החי.</p>
        </div>
        <Btn variant="primary" onClick={save} disabled={saving}><Save size={14} /> {saving ? "שומר…" : "שמור ופרסם"}</Btn>
      </div>

      <div className={`${styles.grid} ${styles.g2}`}>
        <Card>
          <div style={head}>צבעים</div>
          {COLOR_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <ColorInput value={tokens.colors[f.key] ?? "#000000"} onChange={(v) => setColor(f.key, v)} />
            </Field>
          ))}
        </Card>

        <div>
          <Card>
            <div style={head}>טיפוגרפיה</div>
            <Field label="פונט (Google Fonts)">
              <select
                value={tokens.typography.googleFont ?? ""}
                onChange={(e) => {
                  const g = e.target.value;
                  setTokens({ ...tokens, typography: { ...tokens.typography, googleFont: g, fontFamily: g ? `'${g}', sans-serif` : DEFAULT_THEME.typography.fontFamily } });
                }}
                style={{ width: "100%", padding: "9px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 9, color: "var(--t1)", fontSize: 13.5 }}
              >
                {GOOGLE_FONTS.map((g) => <option key={g} value={g}>{g || "ברירת מחדל (Rubik)"}</option>)}
              </select>
            </Field>
            <Field label="גודל בסיס (px)"><NumberInput value={tokens.typography.baseSize} onChange={(e) => setTypo("baseSize", Number(e.target.value))} /></Field>
            <Field label="גובה שורה"><NumberInput step="0.1" value={tokens.typography.lineHeight} onChange={(e) => setTypo("lineHeight", Number(e.target.value))} /></Field>
            <Field label="מרווח אותיות (px)"><NumberInput step="0.1" value={tokens.typography.letterSpacing} onChange={(e) => setTypo("letterSpacing", Number(e.target.value))} /></Field>
          </Card>

          <Card style={{ marginTop: 18 }}>
            <div style={head}>פריסה</div>
            <Field label="עיגול פינות (px)"><NumberInput value={tokens.layout.radius} onChange={(e) => setLayout("radius", Number(e.target.value))} /></Field>
            <Field label="עיגול פינות גדול (px)"><NumberInput value={tokens.layout.radiusLg} onChange={(e) => setLayout("radiusLg", Number(e.target.value))} /></Field>
            <Field label="רוחב מיכל (px)"><NumberInput value={tokens.layout.containerWidth} onChange={(e) => setLayout("containerWidth", Number(e.target.value))} /></Field>
            <Field label="צל"><TextInput value={tokens.layout.shadow} onChange={(e) => setLayout("shadow", e.target.value)} /></Field>
          </Card>

          <Card style={{ marginTop: 18 }}>
            <div style={head}>מצב כהה (Dark Mode)</div>
            <Toggle checked={tokens.dark.enabled} onChange={(v) => setDark("enabled", v)} label="אפשר מצב כהה" />
            {tokens.dark.enabled && (
              <>
                <Field label="רקע כהה"><ColorInput value={tokens.dark.bg ?? "#1e1e1e"} onChange={(v) => setDark("bg", v)} /></Field>
                <Field label="טקסט כהה"><ColorInput value={tokens.dark.t1 ?? "#f3f4f6"} onChange={(v) => setDark("t1", v)} /></Field>
              </>
            )}
          </Card>
        </div>
      </div>
      {ToastHost}
    </>
  );
}

const head: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 14 };
