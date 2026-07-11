"use client";

// Admin Subscription Management Center — action picker + live before→after
// preview + explicit confirmation. Mounted on /admin/users/[id].

import { useMemo, useState } from "react";
import { ArrowLeft, CreditCard } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { PLAN_IDS, planLabelHe, resolvePlanId } from "@/lib/plans";
import { deriveSubscriptionState, type SubscriptionState } from "@/lib/subscription";
import {
  actionsForState, simulate, type SubAction, type SubActionUser,
} from "@/lib/admin-subscription-actions";

/** Sensible field defaults: current plan; required expiry 30 days out. */
function defaultInputFor(a: SubAction | undefined, currentPlan: string | null | undefined): Record<string, unknown> {
  const init: Record<string, unknown> = {};
  for (const f of a?.fields ?? []) {
    if (f.type === "plan") init[f.key] = resolvePlanId(currentPlan);
    if (f.type === "datetime" && f.required) {
      init[f.key] = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 16);
    }
  }
  return init;
}

function StateMini({ s, title }: { s: SubscriptionState; title: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, background: "var(--surface-2)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "10px 12px",
    }}>
      <div className={styles.muted} style={{ fontSize: 11, marginBottom: 4 }}>{title}</div>
      <div className={styles.strong} style={{ fontSize: 13, lineHeight: 1.4 }}>{s.headlineHe}</div>
      <div className={styles.muted} style={{ fontSize: 11.5, marginTop: 2, lineHeight: 1.5 }}>{s.sublineHe}</div>
      {s.priceIls !== null && (
        <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4, fontWeight: 700 }}>₪{s.priceIls}/חודש</div>
      )}
    </div>
  );
}

export default function SubscriptionCenter({
  user,
  onApply,
}: {
  user: SubActionUser;
  /** Sends the patch (plus _note) to PATCH /api/admin/users/[id]. Resolves true on success. */
  onApply: (patch: Record<string, unknown>, note: string) => Promise<boolean>;
}) {
  const state = useMemo(() => deriveSubscriptionState(user), [user]);
  const actions = useMemo(() => actionsForState(state), [state]);

  const [actionId, setActionId] = useState("");
  const [input, setInput] = useState<Record<string, unknown>>({});
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const action: SubAction | undefined = actions.find((a) => a.id === actionId);
  const build = action ? action.buildPatch(user, input) : null;
  const preview = build?.ok ? simulate(user, build.patch) : null;

  function pickAction(id: string) {
    setActionId(id);
    setErr(null);
    setInput(defaultInputFor(actions.find((x) => x.id === id), user.plan));
  }

  async function submit() {
    if (!action || !build?.ok) return;
    setBusy(true);
    const ok = await onApply(build.patch, note.trim());
    setBusy(false);
    setConfirmOpen(false);
    if (ok) {
      setActionId("");
      setInput({});
      setNote("");
    }
  }

  return (
    <div className={styles.card} style={{ marginBottom: 18 }}>
      <div className={styles.cardTitle}><CreditCard size={14} strokeWidth={2} /> ניהול מנוי</div>

      {/* Action picker */}
      <div className={styles.row} style={{ gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {actions.map((a) => (
          <button
            key={a.id}
            className={`${styles.btn} ${actionId === a.id ? styles.btnPrimary : styles.btnGhost} ${styles.btnSm}`}
            style={a.danger && actionId !== a.id ? { color: "var(--danger)" } : undefined}
            onClick={() => pickAction(actionId === a.id ? "" : a.id)}
          >
            {a.labelHe}
          </button>
        ))}
      </div>

      {action && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p className={styles.muted} style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>{action.descHe}</p>

          {/* Dynamic fields */}
          {action.fields.length > 0 && (
            <div className={styles.row} style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              {action.fields.map((f) => (
                <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5 }}>
                  {f.labelHe}
                  {f.type === "plan" && (
                    <select className={`${styles.input} ${styles.inputSm} ${styles.select}`}
                      style={{ minWidth: 130 }}
                      value={String(input[f.key] ?? "")}
                      onChange={(e) => { setInput({ ...input, [f.key]: e.target.value }); setErr(null); }}>
                      {PLAN_IDS.map((p) => <option key={p} value={p}>{planLabelHe(p)}</option>)}
                    </select>
                  )}
                  {f.type === "number" && (
                    <input className={`${styles.input} ${styles.inputSm}`} type="number"
                      style={{ width: 120, direction: "ltr", textAlign: "center" }}
                      value={String(input[f.key] ?? "")}
                      onChange={(e) => { setInput({ ...input, [f.key]: e.target.value }); setErr(null); }} />
                  )}
                  {f.type === "datetime" && (
                    <input className={`${styles.input} ${styles.inputSm}`} type="datetime-local"
                      value={String(input[f.key] ?? "")}
                      onChange={(e) => { setInput({ ...input, [f.key]: e.target.value }); setErr(null); }} />
                  )}
                  {f.type === "checkbox" && (
                    <span className={styles.row} style={{ gap: 6, minHeight: 31 }}>
                      <input type="checkbox" checked={input[f.key] === true}
                        onChange={(e) => { setInput({ ...input, [f.key]: e.target.checked }); setErr(null); }} />
                    </span>
                  )}
                  {f.hintHe && <span className={styles.muted} style={{ fontSize: 11 }}>{f.hintHe}</span>}
                </label>
              ))}
            </div>
          )}

          {/* Live before → after preview */}
          {preview ? (
            <div className={styles.row} style={{ gap: 10, alignItems: "stretch", flexWrap: "wrap" }}>
              <StateMini s={preview.before} title="לפני" />
              <div style={{ display: "flex", alignItems: "center", color: "var(--accent)" }}>
                <ArrowLeft size={18} strokeWidth={2} />
              </div>
              <StateMini s={preview.after} title="אחרי" />
            </div>
          ) : build && !build.ok ? (
            <div style={{ color: "var(--warning)", fontSize: 12.5 }}>{build.error}</div>
          ) : null}

          {/* Reason (required) */}
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5 }}>
            סיבת השינוי (נשמרת ביומן הפעולות)
            <input className={styles.input} value={note} maxLength={300}
              onChange={(e) => { setNote(e.target.value); setErr(null); }}
              placeholder='למשל: "שילם בהעברה בנקאית" / "פיצוי על תקלה"' />
          </label>

          {err && <div style={{ color: "var(--danger)", fontSize: 12.5 }} role="alert">{err}</div>}

          <div className={styles.row} style={{ justifyContent: "flex-end" }}>
            <button
              className={`${styles.btn} ${action.danger ? styles.btnDanger : styles.btnPrimary}`}
              disabled={!build?.ok || busy}
              onClick={() => {
                if (!note.trim()) { setErr("חובה לציין סיבה — היא נשמרת ביומן הפעולות"); return; }
                setConfirmOpen(true);
              }}
            >
              המשך לאישור
            </button>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmOpen && action && preview && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
          onClick={() => !busy && setConfirmOpen(false)}
        >
          <div
            style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
              padding: 22, width: "100%", maxWidth: 480,
            }}
            onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="אישור שינוי מנוי"
          >
            <div className={styles.strong} style={{ fontSize: 15, marginBottom: 12 }}>
              {action.labelHe} — אישור סופי
            </div>
            <div className={styles.row} style={{ gap: 10, alignItems: "stretch", marginBottom: 12, flexWrap: "wrap" }}>
              <StateMini s={preview.before} title="לפני" />
              <div style={{ display: "flex", alignItems: "center", color: "var(--accent)" }}>
                <ArrowLeft size={18} strokeWidth={2} />
              </div>
              <StateMini s={preview.after} title="אחרי" />
            </div>
            <div className={styles.muted} style={{ fontSize: 12.5, marginBottom: 14 }}>סיבה: {note}</div>
            <div className={styles.row} style={{ justifyContent: "flex-end", gap: 8 }}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setConfirmOpen(false)} disabled={busy}>
                חזרה
              </button>
              <button
                className={`${styles.btn} ${action.danger ? styles.btnDanger : styles.btnPrimary}`}
                onClick={submit} disabled={busy}
              >
                {busy ? "מבצע…" : "אשר שינוי מנוי"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
