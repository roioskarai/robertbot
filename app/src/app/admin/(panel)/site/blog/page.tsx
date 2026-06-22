"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { Btn, Card, Field, TextInput, useToast } from "@/components/admin/site/ui";

interface PageRow { id: string; slug: string; kind: string; title: string; status: string; updated_at: string }
interface Cat { id: string; name: string; slug: string }
interface Author { id: string; name: string }

export default function BlogAdmin() {
  const router = useRouter();
  const [posts, setPosts] = useState<PageRow[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [title, setTitle] = useState("");
  const [catName, setCatName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const { showToast, ToastHost } = useToast();

  const load = useCallback(async () => {
    const [p, b] = await Promise.all([
      fetch("/api/admin/site/pages").then((r) => r.json()),
      fetch("/api/admin/site/blog").then((r) => r.json()),
    ]);
    setPosts((p.pages ?? []).filter((x: PageRow) => x.kind === "post"));
    setCats(b.categories ?? []);
    setAuthors(b.authors ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createPost() {
    if (!title.trim()) return showToast("נדרשת כותרת", false);
    const slug = title.trim().toLowerCase().replace(/[^a-z0-9֐-׿]+/g, "-").replace(/^-|-$/g, "") || `post-${Date.now()}`;
    const res = await fetch("/api/admin/site/pages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "post", title, slug }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return showToast(json.error || "שגיאה", false);
    // seed with a rich-text body section so the editor opens ready to write
    await fetch(`/api/admin/site/pages/${json.page.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft_doc: { sections: [{ id: "body", type: "richtext", enabled: true, props: { html: "<h2>" + title + "</h2><p>כתוב כאן…</p>" } }] } }),
    });
    router.push(`/admin/site/pages/${json.page.id}`);
  }

  async function addCat() {
    if (!catName.trim()) return;
    await fetch("/api/admin/site/blog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "category", name: catName }) });
    setCatName(""); load();
  }
  async function addAuthor() {
    if (!authorName.trim()) return;
    await fetch("/api/admin/site/blog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "author", name: authorName }) });
    setAuthorName(""); load();
  }
  async function delTaxo(type: "category" | "author", id: string) {
    await fetch(`/api/admin/site/blog?type=${type}&id=${id}`, { method: "DELETE" });
    load();
  }
  async function delPost(id: string) {
    if (!confirm("למחוק את הכתבה?")) return;
    await fetch(`/api/admin/site/pages/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>בלוג</h1>
          <p className={styles.pageDesc}>כתבות, קטגוריות וכותבים. עורך טקסט עשיר + שליטת SEO לכל כתבה.</p>
        </div>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}><Field label="כותרת כתבה חדשה"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="10 טיפים לעסק קטן" /></Field></div>
          <div style={{ marginBottom: 14 }}><Btn variant="primary" onClick={createPost}><Plus size={14} /> כתבה חדשה</Btn></div>
        </div>
      </Card>

      <div className={styles.card} style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead><tr><th>כותרת</th><th>סטטוס</th><th>עודכן</th><th style={{ textAlign: "left" }}>פעולות</th></tr></thead>
            <tbody>
              {posts.length === 0 && <tr><td colSpan={4}><div className={styles.tableEmpty}>אין כתבות עדיין</div></td></tr>}
              {posts.map((p) => (
                <tr key={p.id}>
                  <td className={styles.strong}>{p.title}</td>
                  <td><span className={`${styles.badge} ${p.status === "published" ? styles.badgeActive : styles.badgeTrial}`}>{p.status === "published" ? "פורסם" : "טיוטה"}</span></td>
                  <td className={styles.muted} style={{ fontSize: 12 }}>{new Date(p.updated_at).toLocaleDateString("he-IL")}</td>
                  <td>
                    <div className={styles.row} style={{ gap: 6, justifyContent: "flex-start" }}>
                      <Link href={`/admin/site/pages/${p.id}`} className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}><Pencil size={12} /> עריכה</Link>
                      <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}><ExternalLink size={12} /></a>
                      <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => delPost(p.id)} style={{ color: "var(--danger)" }}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`${styles.grid} ${styles.g2}`}>
        <Card>
          <div style={head}>קטגוריות</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <TextInput value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="שם קטגוריה" />
            <Btn variant="primary" onClick={addCat}><Plus size={13} /></Btn>
          </div>
          {cats.map((c) => (
            <div key={c.id} style={taxoRow}>
              <span style={{ color: "var(--t2)" }}>{c.name}</span>
              <button onClick={() => delTaxo("category", c.id)} style={{ background: "none", border: 0, color: "var(--danger)", cursor: "pointer" }}><Trash2 size={13} /></button>
            </div>
          ))}
        </Card>
        <Card>
          <div style={head}>כותבים</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <TextInput value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="שם כותב" />
            <Btn variant="primary" onClick={addAuthor}><Plus size={13} /></Btn>
          </div>
          {authors.map((a) => (
            <div key={a.id} style={taxoRow}>
              <span style={{ color: "var(--t2)" }}>{a.name}</span>
              <button onClick={() => delTaxo("author", a.id)} style={{ background: "none", border: 0, color: "var(--danger)", cursor: "pointer" }}><Trash2 size={13} /></button>
            </div>
          ))}
        </Card>
      </div>
      {ToastHost}
    </>
  );
}

const head: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 14 };
const taxoRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" };
