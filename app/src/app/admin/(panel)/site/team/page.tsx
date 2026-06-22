"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "@/app/admin/admin.module.css";
import { Card, Select, useToast } from "@/components/admin/site/ui";

interface Member { id: string; email: string; full_name: string | null; admin_role: string | null; last_login_at: string | null }

const ROLE_LABEL: Record<string, string> = {
  super_admin: "מנהל ראשי (הכל)", admin: "מנהל (תוכן+עיצוב)", editor: "עורך (תוכן בלבד)", support: "תמיכה (צפייה)",
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastHost } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/site/team");
    const json = await res.json();
    setMembers(json.members ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setRole(id: string, admin_role: string) {
    const res = await fetch("/api/admin/site/team", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, admin_role }),
    });
    const json = await res.json().catch(() => ({}));
    showToast(res.ok ? "✓ ההרשאה עודכנה" : json.error || "שגיאה", res.ok);
    load();
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>צוות והרשאות</h1>
          <p className={styles.pageDesc}>נהל את הרשאות חברי צוות הניהול. (להוספת מנהל חדש — קדם משתמש לתפקיד &quot;מנהל&quot; במסך משתמשים.)</p>
        </div>
      </div>

      <Card style={{ marginBottom: 18, fontSize: 13, color: "var(--t3)" }}>
        <strong style={{ color: "var(--t2)" }}>רמות הרשאה:</strong> מנהל ראשי — גישה מלאה כולל קוד מותאם, צוות וגיבוי ·
        מנהל — תוכן, עיצוב והגדרות · עורך — תוכן בלבד · תמיכה — צפייה בלבד.
      </Card>

      <div className={styles.card} style={{ padding: 0, overflow: "hidden" }}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead><tr><th>משתמש</th><th>מייל</th><th>הרשאה</th><th>כניסה אחרונה</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={4}><div className={styles.tableEmpty}>טוען…</div></td></tr>}
              {!loading && members.length === 0 && <tr><td colSpan={4}><div className={styles.tableEmpty}>אין מנהלים</div></td></tr>}
              {!loading && members.map((m) => (
                <tr key={m.id}>
                  <td className={styles.strong}>{m.full_name || m.email.split("@")[0]}</td>
                  <td className={styles.muted}>{m.email}</td>
                  <td style={{ maxWidth: 220 }}>
                    <Select value={m.admin_role ?? "super_admin"} onChange={(e) => setRole(m.id, e.target.value)}>
                      {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </td>
                  <td className={styles.muted} style={{ fontSize: 12 }}>
                    {m.last_login_at ? new Date(m.last_login_at).toLocaleDateString("he-IL") : "—"}
                  </td>
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
