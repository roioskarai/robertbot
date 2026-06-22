"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud, Trash2, Copy, Search } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { Btn, Card, TextInput, useToast } from "@/components/admin/site/ui";

interface MediaItem { id: string; url: string; mime: string | null; alt: string | null; folder: string; size: number | null }

export default function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastHost } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/site/media" + (q ? `?q=${encodeURIComponent(q)}` : ""));
    const json = await res.json();
    setItems(json.media ?? []);
    setLoading(false);
  }, [q]);
  useEffect(() => { load(); }, [load]);

  async function upload(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/site/media", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showToast(j.error || `העלאת ${file.name} נכשלה`, false);
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    load();
    showToast("✓ הועלה");
  }

  async function del(id: string) {
    if (!confirm("למחוק את הקובץ?")) return;
    const res = await fetch(`/api/admin/site/media?id=${id}`, { method: "DELETE" });
    showToast(res.ok ? "✓ נמחק" : "שגיאה", res.ok);
    load();
  }

  function copy(url: string) {
    navigator.clipboard.writeText(url);
    showToast("✓ הקישור הועתק");
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>ספריית מדיה</h1>
          <p className={styles.pageDesc}>העלה תמונות וסרטונים, העתק כתובת לשימוש בסקשנים.</p>
        </div>
        <div className={styles.row}>
          <input ref={fileRef} type="file" multiple accept="image/*,video/mp4,video/webm" onChange={(e) => upload(e.target.files)} style={{ display: "none" }} />
          <Btn variant="primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <UploadCloud size={14} /> {uploading ? "מעלה…" : "העלה קבצים"}
          </Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, maxWidth: 360 }}>
        <TextInput placeholder="חיפוש לפי טקסט חלופי…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Btn onClick={load}><Search size={14} /></Btn>
      </div>

      {loading ? (
        <div className={styles.tableEmpty}>טוען…</div>
      ) : items.length === 0 ? (
        <Card><div style={{ textAlign: "center", padding: 30, color: "var(--t4)" }}>אין קבצים עדיין</div></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 14 }}>
          {items.map((m) => (
            <Card key={m.id} style={{ padding: 10 }}>
              <div style={{ height: 120, borderRadius: 8, overflow: "hidden", background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                {m.mime?.startsWith("video") ? (
                  <video src={m.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <img src={m.url} alt={m.alt ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn onClick={() => copy(m.url)} style={{ flex: 1 }}><Copy size={12} /> העתק</Btn>
                <Btn onClick={() => del(m.id)} style={{ color: "var(--danger)" }}><Trash2 size={12} /></Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
      {ToastHost}
    </>
  );
}
