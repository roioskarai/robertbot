"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2, UploadCloud } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { Btn, Card, Field, TextInput, TextArea, NumberInput, ColorInput, Select, Toggle, useToast } from "@/components/admin/site/ui";
import type { SiteBanner, BannerKind, BannerConfig } from "@/lib/site/types";

const KIND_LABEL: Record<BannerKind, string> = {
  announcement: "פס הכרזה", homepage: "באנר דף בית", floating: "באנר צף",
  popup: "פופאפ", exit_intent: "פופאפ יציאה",
};

export default function BannersAdmin() {
  const [banners, setBanners] = useState<SiteBanner[]>([]);
  const [sel, setSel] = useState<SiteBanner | null>(null);
  const [newKind, setNewKind] = useState<BannerKind>("popup");
  const { showToast, ToastHost } = useToast();

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/site/banners");
    const json = await res.json();
    setBanners(json.banners ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    const res = await fetch("/api/admin/site/banners", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: newKind, name: KIND_LABEL[newKind], config: {} }),
    });
    const json = await res.json();
    if (res.ok) { await load(); setSel(json.banner); showToast("✓ נוצר"); }
  }

  async function save(publish?: boolean) {
    if (!sel) return;
    const res = await fetch(`/api/admin/site/banners/${sel.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: sel.name, config: sel.config,
        status: publish ? "published" : sel.status,
        schedule_start: sel.schedule_start, schedule_end: sel.schedule_end,
      }),
    });
    if (res.ok) { if (publish) setSel({ ...sel, status: "published" }); load(); showToast(publish ? "✓ פורסם" : "✓ נשמר"); }
    else showToast("שגיאה", false);
  }

  async function del(id: string) {
    if (!confirm("למחוק?")) return;
    await fetch(`/api/admin/site/banners/${id}`, { method: "DELETE" });
    if (sel?.id === id) setSel(null);
    load();
  }

  const setCfg = (patch: Partial<BannerConfig>) => sel && setSel({ ...sel, config: { ...sel.config, ...patch } });
  const cfg = sel?.config ?? {};

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>באנרים ופופאפים</h1>
          <p className={styles.pageDesc}>פופאפ קבלת פנים, פופאפ יציאה, באנרים צפים — עם תזמון וטריגרים.</p>
        </div>
        <div className={styles.row}>
          <Select value={newKind} onChange={(e) => setNewKind(e.target.value as BannerKind)} style={{ width: 150 }}>
            {(["popup", "exit_intent", "floating"] as BannerKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </Select>
          <Btn variant="primary" onClick={create}><Plus size={14} /> חדש</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 18, alignItems: "start" }}>
        <Card style={{ padding: 12 }}>
          {banners.length === 0 && <div style={{ color: "var(--t4)", textAlign: "center", padding: 16, fontSize: 13 }}>אין באנרים</div>}
          {banners.map((b) => (
            <div key={b.id} onClick={() => setSel(b)}
              style={{ padding: "10px 12px", borderRadius: 9, marginBottom: 5, cursor: "pointer", border: "1px solid", borderColor: sel?.id === b.id ? "var(--accent)" : "var(--border)", background: sel?.id === b.id ? "var(--accent-soft)" : "var(--surface-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{b.name}</span>
                <span className={`${styles.badge} ${b.status === "published" ? styles.badgeActive : styles.badgeTrial}`}>{b.status === "published" ? "חי" : "טיוטה"}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 2 }}>{KIND_LABEL[b.kind]}</div>
            </div>
          ))}
        </Card>

        {sel ? (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>{KIND_LABEL[sel.kind]}</div>
              <div className={styles.row}>
                <Btn onClick={() => save(false)}><Save size={13} /> שמור</Btn>
                <Btn variant="primary" onClick={() => save(true)}><UploadCloud size={13} /> פרסם</Btn>
                <Btn onClick={() => del(sel.id)} style={{ color: "var(--danger)" }}><Trash2 size={13} /></Btn>
              </div>
            </div>
            <Field label="שם פנימי"><TextInput value={sel.name} onChange={(e) => setSel({ ...sel, name: e.target.value })} /></Field>
            <Field label="כותרת"><TextInput value={cfg.title ?? ""} onChange={(e) => setCfg({ title: e.target.value })} /></Field>
            <Field label="תוכן"><TextArea value={cfg.body ?? ""} onChange={(e) => setCfg({ body: e.target.value })} /></Field>
            <Field label="תמונה (URL)"><TextInput value={cfg.imageUrl ?? ""} onChange={(e) => setCfg({ imageUrl: e.target.value })} /></Field>
            <div className={`${styles.grid} ${styles.g2}`}>
              <Field label="טקסט כפתור"><TextInput value={cfg.ctaLabel ?? ""} onChange={(e) => setCfg({ ctaLabel: e.target.value })} /></Field>
              <Field label="קישור כפתור"><TextInput value={cfg.ctaHref ?? ""} onChange={(e) => setCfg({ ctaHref: e.target.value })} /></Field>
            </div>
            <div className={`${styles.grid} ${styles.g2}`}>
              <Field label="צבע רקע"><ColorInput value={cfg.bg ?? "#ffffff"} onChange={(v) => setCfg({ bg: v })} /></Field>
              <Field label="צבע טקסט"><ColorInput value={cfg.color ?? "#111827"} onChange={(v) => setCfg({ color: v })} /></Field>
            </div>
            {(sel.kind === "popup") && (
              <div className={`${styles.grid} ${styles.g2}`}>
                <Field label="השהיה (שניות)"><NumberInput value={cfg.delaySeconds ?? 3} onChange={(e) => setCfg({ delaySeconds: Number(e.target.value) })} /></Field>
                <div style={{ paddingTop: 22 }}><Toggle checked={!!cfg.showOnce} onChange={(v) => setCfg({ showOnce: v })} label="הצג פעם אחת" /></div>
              </div>
            )}
            {sel.kind === "exit_intent" && <Toggle checked={!!cfg.showOnce} onChange={(v) => setCfg({ showOnce: v })} label="הצג פעם אחת" />}
            {sel.kind === "floating" && (
              <Field label="מיקום">
                <Select value={cfg.position ?? "bottom-end"} onChange={(e) => setCfg({ position: e.target.value as BannerConfig["position"] })}>
                  <option value="bottom-end">תחתון - צד</option>
                  <option value="bottom-start">תחתון - צד נגדי</option>
                </Select>
              </Field>
            )}
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 10, paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t2)", marginBottom: 8 }}>תזמון</div>
              <div className={`${styles.grid} ${styles.g2}`}>
                <Field label="הצג מ-"><TextInput type="datetime-local" value={sel.schedule_start?.slice(0, 16) ?? ""} onChange={(e) => setSel({ ...sel, schedule_start: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
                <Field label="הסתר ב-"><TextInput type="datetime-local" value={sel.schedule_end?.slice(0, 16) ?? ""} onChange={(e) => setSel({ ...sel, schedule_end: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
              </div>
            </div>
          </Card>
        ) : (
          <Card><div style={{ color: "var(--t4)", textAlign: "center", padding: 20 }}>בחר באנר לעריכה או צור חדש</div></Card>
        )}
      </div>
      {ToastHost}
    </>
  );
}
