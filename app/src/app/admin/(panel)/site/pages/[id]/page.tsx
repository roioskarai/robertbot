"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Save, Eye, UploadCloud, Plus, Copy, Trash2, ChevronUp, ChevronDown,
  EyeOff, Eye as EyeOn, Undo2, Redo2, History, ArrowRight,
} from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { Btn, Card, Field, Select, TextInput, TextArea, useToast } from "@/components/admin/site/ui";
import SectionFields from "@/components/admin/site/SectionFields";
import { SECTION_LABELS, defaultPropsFor } from "@/components/admin/site/sectionSchema";
import type { PageSection, SectionType, PageMeta } from "@/lib/site/types";

interface Loaded {
  id: string; slug: string; kind: string; title: string;
  meta: PageMeta; draft_doc: { sections: PageSection[] };
}
interface Version { id: string; label: string | null; created_at: string }

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function PageEditor() {
  const { id } = useParams<{ id: string }>();
  const { showToast, ToastHost } = useToast();

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [meta, setMeta] = useState<PageMeta>({});
  const [sections, setSections] = useState<PageSection[]>([]);
  const [sel, setSel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addType, setAddType] = useState<SectionType>("hero");
  const [versions, setVersions] = useState<Version[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  // Undo / redo history of the sections array.
  const past = useRef<PageSection[][]>([]);
  const future = useRef<PageSection[][]>([]);

  const commit = useCallback((next: PageSection[]) => {
    past.current.push(sections);
    if (past.current.length > 50) past.current.shift();
    future.current = [];
    setSections(next);
  }, [sections]);

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(sections);
    setSections(prev);
  };
  const redo = () => {
    const nxt = future.current.pop();
    if (!nxt) return;
    past.current.push(sections);
    setSections(nxt);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/site/pages/${id}`);
    const json = await res.json();
    const p: Loaded = json.page;
    if (p) {
      setSlug(p.slug); setTitle(p.title); setMeta(p.meta ?? {});
      setSections(p.draft_doc?.sections ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function loadVersions() {
    const res = await fetch(`/api/admin/site/pages/${id}/versions`);
    const json = await res.json();
    setVersions(json.versions ?? []);
    setShowVersions(true);
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/site/pages/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, meta, draft_doc: { sections } }),
    });
    setSaving(false);
    showToast(res.ok ? "✓ הטיוטה נשמרה" : "השמירה נכשלה", res.ok);
  }

  async function preview() {
    await save();
    await fetch("/api/admin/site/preview", { method: "POST" });
    window.open(slug === "home" ? "/" : `/${slug}`, "_blank");
  }

  async function publish() {
    await save();
    const res = await fetch(`/api/admin/site/pages/${id}/publish`, { method: "POST" });
    showToast(res.ok ? "✓ פורסם! השינויים באוויר" : "הפרסום נכשל", res.ok);
  }

  async function restore(versionId: string) {
    if (!confirm("לשחזר גרסה זו לטיוטה?")) return;
    const res = await fetch(`/api/admin/site/pages/${id}/restore`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId }),
    });
    if (res.ok) { setShowVersions(false); load(); showToast("✓ שוחזר לטיוטה"); }
    else showToast("שחזור נכשל", false);
  }

  // section ops
  const addSection = () => {
    const s: PageSection = { id: uid(), type: addType, enabled: true, props: defaultPropsFor(addType) };
    commit([...sections, s]);
    setSel(sections.length);
  };
  const dup = (i: number) => {
    const copy = { ...sections[i], id: uid() };
    const next = [...sections.slice(0, i + 1), copy, ...sections.slice(i + 1)];
    commit(next);
  };
  const del = (i: number) => {
    commit(sections.filter((_, idx) => idx !== i));
    setSel((s) => Math.max(0, Math.min(s, sections.length - 2)));
  };
  const toggle = (i: number) => commit(sections.map((s, idx) => (idx === i ? { ...s, enabled: !s.enabled } : s)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
    setSel(j);
  };
  const updateProps = (i: number, props: Record<string, unknown>) =>
    setSections(sections.map((s, idx) => (idx === i ? { ...s, props } : s)));
  const updateSchedule = (i: number, key: "start" | "end", val: string) =>
    setSections(sections.map((s, idx) =>
      idx === i ? { ...s, schedule: { start: s.schedule?.start ?? null, end: s.schedule?.end ?? null, [key]: val || null } } : s));

  const current = sections[sel];

  if (loading) return <div className={styles.tableEmpty}>טוען עורך…</div>;

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <Link href="/admin/site" className={styles.muted} style={{ fontSize: 12, display: "inline-flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
            <ArrowRight size={12} /> חזרה לעמודים
          </Link>
          <h1 className={styles.pageTitle}>עריכת עמוד: {title || slug}</h1>
        </div>
        <div className={styles.row} style={{ gap: 6, flexWrap: "wrap" }}>
          <Btn onClick={undo} title="בטל"><Undo2 size={14} /></Btn>
          <Btn onClick={redo} title="בצע שוב"><Redo2 size={14} /></Btn>
          <Btn onClick={loadVersions}><History size={14} /> גרסאות</Btn>
          <Btn onClick={preview}><Eye size={14} /> תצוגה מקדימה</Btn>
          <Btn onClick={save} disabled={saving}><Save size={14} /> {saving ? "שומר…" : "שמור טיוטה"}</Btn>
          <Btn variant="primary" onClick={publish}><UploadCloud size={14} /> פרסם</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 18, alignItems: "start" }}>
        {/* Section list */}
        <Card style={{ padding: 12 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <Select value={addType} onChange={(e) => setAddType(e.target.value as SectionType)} style={{ flex: 1 }}>
              {Object.entries(SECTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Btn variant="primary" onClick={addSection}><Plus size={14} /></Btn>
          </div>
          {sections.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setSel(i)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 9,
                marginBottom: 5, cursor: "pointer", border: "1px solid",
                borderColor: sel === i ? "var(--accent)" : "var(--border)",
                background: sel === i ? "var(--accent-soft)" : "var(--surface-2)",
                opacity: s.enabled ? 1 : 0.5,
              }}
            >
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>
                {SECTION_LABELS[s.type] ?? s.type}
              </span>
              <button onClick={(e) => { e.stopPropagation(); move(i, -1); }} style={miniBtn}><ChevronUp size={12} /></button>
              <button onClick={(e) => { e.stopPropagation(); move(i, 1); }} style={miniBtn}><ChevronDown size={12} /></button>
              <button onClick={(e) => { e.stopPropagation(); toggle(i); }} style={miniBtn} title={s.enabled ? "הסתר" : "הצג"}>
                {s.enabled ? <EyeOn size={12} /> : <EyeOff size={12} />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); dup(i); }} style={miniBtn} title="שכפל"><Copy size={12} /></button>
              <button onClick={(e) => { e.stopPropagation(); del(i); }} style={{ ...miniBtn, color: "var(--danger)" }} title="מחק"><Trash2 size={12} /></button>
            </div>
          ))}
          {sections.length === 0 && <div style={{ fontSize: 12, color: "var(--t4)", textAlign: "center", padding: 16 }}>אין סקשנים — הוסף סקשן ראשון</div>}
        </Card>

        {/* Editor */}
        <div>
          {current ? (
            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 14 }}>
                עריכת: {SECTION_LABELS[current.type] ?? current.type}
              </div>
              <SectionFields type={current.type} props={current.props} onChange={(p) => updateProps(sel, p)} />
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t2)", marginBottom: 8 }}>תזמון (אופציונלי)</div>
                <div className={`${styles.grid} ${styles.g2}`}>
                  <Field label="הצג מ-">
                    <TextInput type="datetime-local" value={current.schedule?.start?.slice(0, 16) ?? ""} onChange={(e) => updateSchedule(sel, "start", e.target.value ? new Date(e.target.value).toISOString() : "")} />
                  </Field>
                  <Field label="הסתר ב-">
                    <TextInput type="datetime-local" value={current.schedule?.end?.slice(0, 16) ?? ""} onChange={(e) => updateSchedule(sel, "end", e.target.value ? new Date(e.target.value).toISOString() : "")} />
                  </Field>
                </div>
              </div>
            </Card>
          ) : (
            <Card><div style={{ color: "var(--t4)", textAlign: "center", padding: 20 }}>בחר סקשן לעריכה או הוסף חדש</div></Card>
          )}

          {/* SEO / meta */}
          <Card style={{ marginTop: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 14 }}>SEO ומטא</div>
            <Field label="כותרת העמוד (פנימי)"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Meta Title"><TextInput value={meta.metaTitle ?? ""} onChange={(e) => setMeta({ ...meta, metaTitle: e.target.value })} /></Field>
            <Field label="Meta Description"><TextArea value={meta.metaDescription ?? ""} onChange={(e) => setMeta({ ...meta, metaDescription: e.target.value })} /></Field>
            <div className={`${styles.grid} ${styles.g2}`}>
              <Field label="תמונת OG (URL)"><TextInput value={meta.ogImage ?? ""} onChange={(e) => setMeta({ ...meta, ogImage: e.target.value })} /></Field>
              <Field label="Canonical URL"><TextInput value={meta.canonical ?? ""} onChange={(e) => setMeta({ ...meta, canonical: e.target.value })} /></Field>
            </div>
          </Card>
        </div>
      </div>

      {showVersions && (
        <div style={modalBackdrop} onClick={() => setShowVersions(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "var(--t1)", marginBottom: 12 }}>היסטוריית גרסאות</h3>
            {versions.length === 0 && <div style={{ color: "var(--t4)" }}>אין גרסאות שמורות עדיין (גרסה נוצרת בכל פרסום)</div>}
            {versions.map((v) => (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--t2)" }}>
                  {new Date(v.created_at).toLocaleString("he-IL")} {v.label ? `· ${v.label}` : ""}
                </span>
                <Btn onClick={() => restore(v.id)}>שחזר</Btn>
              </div>
            ))}
            <div style={{ marginTop: 14, textAlign: "left" }}><Btn onClick={() => setShowVersions(false)}>סגור</Btn></div>
          </div>
        </div>
      )}
      {ToastHost}
    </>
  );
}

const miniBtn: React.CSSProperties = {
  background: "transparent", border: 0, color: "var(--t4)", cursor: "pointer",
  display: "inline-flex", alignItems: "center", padding: 2,
};
const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const modalBox: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
  padding: 22, width: "100%", maxWidth: 520, maxHeight: "80vh", overflowY: "auto",
};
