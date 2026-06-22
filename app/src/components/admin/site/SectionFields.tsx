"use client";

// Generic form renderer driven by sectionSchema. Edits a section's `props`
// object (supports dotted paths + lists of sub-objects) and reports changes up.

import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { SectionType } from "@/lib/site/types";
import { SECTION_SCHEMA, type FieldDef } from "./sectionSchema";
import { Field, TextInput, TextArea, NumberInput, Select, ColorInput, Toggle, Btn } from "./ui";
import RichText from "./RichText";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Props = Record<string, any>;

function getPath(obj: Props, path: string): any {
  return path.split(".").reduce<any>((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj: Props, path: string, value: any): Props {
  const keys = path.split(".");
  const root = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur: any = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = cur[k] == null ? {} : Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] };
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return root;
}

function ScalarField({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: any;
  onChange: (v: any) => void;
}) {
  if (def.type === "textarea")
    return <Field label={def.label}><TextArea value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></Field>;
  if (def.type === "number")
    return <Field label={def.label}><NumberInput value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} /></Field>;
  if (def.type === "color")
    return <Field label={def.label}><ColorInput value={value ?? "#000000"} onChange={onChange} /></Field>;
  if (def.type === "bool")
    return <div style={{ marginBottom: 14 }}><Toggle checked={!!value} onChange={onChange} label={def.label} /></div>;
  if (def.type === "csv")
    return <Field label={def.label}><TextInput value={Array.isArray(value) ? value.join(", ") : (value ?? "")} onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></Field>;
  if (def.type === "select")
    return (
      <Field label={def.label}>
        <Select value={value ?? def.options[0]?.value} onChange={(e) => onChange(e.target.value)}>
          {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Field>
    );
  return <Field label={def.label}><TextInput value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></Field>;
}

function ListField({
  def,
  value,
  onChange,
}: {
  def: Extract<FieldDef, { type: "list" }>;
  value: any[];
  onChange: (v: any[]) => void;
}) {
  const rows: any[] = Array.isArray(value) ? value : [];
  const update = (i: number, key: string, v: any) => {
    const next = rows.map((r, idx) => (idx === i ? setPath(r ?? {}, key, v) : r));
    onChange(next);
  };
  const add = () => onChange([...rows, {}]);
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t2)", marginBottom: 8 }}>{def.label}</div>
      {rows.map((row, i) => (
        <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, marginBottom: 10, background: "var(--surface-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "var(--t4)" }}>{def.itemLabel ?? "פריט"} #{i + 1}</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => move(i, -1)} style={iconBtn} title="למעלה"><ChevronUp size={13} /></button>
              <button onClick={() => move(i, 1)} style={iconBtn} title="למטה"><ChevronDown size={13} /></button>
              <button onClick={() => remove(i)} style={{ ...iconBtn, color: "var(--danger)" }} title="מחק"><Trash2 size={13} /></button>
            </div>
          </div>
          {def.fields.map((f) =>
            f.type === "list" ? (
              <ListField key={f.key} def={f} value={getPath(row ?? {}, f.key)} onChange={(v) => update(i, f.key, v)} />
            ) : (
              <ScalarField key={f.key} def={f} value={getPath(row ?? {}, f.key)} onChange={(v) => update(i, f.key, v)} />
            ),
          )}
        </div>
      ))}
      <Btn onClick={add}><Plus size={13} /> הוסף {def.itemLabel ?? "פריט"}</Btn>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 7,
  width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "var(--t3)", cursor: "pointer",
};

export default function SectionFields({
  type,
  props,
  onChange,
}: {
  type: SectionType;
  props: Props;
  onChange: (next: Props) => void;
}) {
  const schema = SECTION_SCHEMA[type] ?? [];
  if (type === "richtext") {
    return (
      <RichText
        value={String(props.html ?? "")}
        onChange={(html) => onChange({ ...props, html })}
      />
    );
  }
  return (
    <div>
      {schema.map((def) =>
        def.type === "list" ? (
          <ListField key={def.key} def={def} value={getPath(props, def.key)} onChange={(v) => onChange(setPath(props, def.key, v))} />
        ) : (
          <ScalarField key={def.key} def={def} value={getPath(props, def.key)} onChange={(v) => onChange(setPath(props, def.key, v))} />
        ),
      )}
    </div>
  );
}
