"use client";

// The guided manual WhatsApp connect wizard (1 מספר → 2 קוד → 3 הצלחה).
// Presentation-only: state + API calls stay with the parent, so the dashboard
// (bot-scoped /connect) and onboarding step 5 (/api/whatsapp/verify) reuse the
// exact same UI with different backends.
//
// `classes` is the parent page's scoped() mapper — each page maps the same
// original class names ("wa-steps", "fi", "btn btn-primary btn-sm", ...)
// through its own CSS module, keeping the rendered DOM identical to the
// pre-extraction inline JSX (the connect-wizard e2e depends on it).

export type ManualConnectStep = "idle" | "sent" | "success";

export default function ManualConnectWizard({
  classes: c,
  step,
  phone,
  code,
  busy,
  error,
  onPhoneChange,
  onCodeChange,
  onSendCode,
  onVerify,
  onResend,
  onChangeNumber,
  success,
  configIssue,
}: {
  classes: (names: string) => string;
  step: ManualConnectStep;
  phone: string;
  code: string;
  busy: boolean;
  error: string | null;
  onPhoneChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSendCode: () => void;
  onVerify: () => void;
  onResend: () => void;
  onChangeNumber: () => void;
  success: { title: string; sub: string; ctaLabel?: string; onCta?: () => void };
  /** True when the failure is a server/provider misconfig — show a reassuring
   *  "it's us, not you" hint so the user knows to skip and try later. */
  configIssue?: boolean;
}) {
  const configHint = configIssue ? (
    <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 6, lineHeight: 1.5 }}>
      נראה שיש תקלה זמנית אצלנו, לא אצלך. אפשר לדלג ולחבר מאוחר יותר — הבוט ימשיך לפעול.
    </div>
  ) : null;
  return (
    <>
      {/* step badges: 1 מספר → 2 קוד → 3 הצלחה (#12) */}
      <div className={c("wa-steps")}>
        <div className={c("wa-step") + " " + (step === "idle" ? c("active") : c("done"))}>
          <span className={c("wa-step-num")}>{step === "idle" ? "1" : "✓"}</span>
          <span className={c("wa-step-label")}>מספר</span>
        </div>
        <div className={c("wa-step-line") + (step !== "idle" ? " " + c("done") : "")} />
        <div className={c("wa-step") + " " + (step === "sent" ? c("active") : step === "success" ? c("done") : "")}>
          <span className={c("wa-step-num")}>{step === "success" ? "✓" : "2"}</span>
          <span className={c("wa-step-label")}>קוד</span>
        </div>
        <div className={c("wa-step-line") + (step === "success" ? " " + c("done") : "")} />
        <div className={c("wa-step") + " " + (step === "success" ? c("active") : "")}>
          <span className={c("wa-step-num")}>3</span>
          <span className={c("wa-step-label")}>הצלחה</span>
        </div>
      </div>

      {step === "idle" && (
        <div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className={c("fi")}
              placeholder="05X-XXXXXXX"
              type="tel"
              inputMode="tel"
              style={{ flex: 1 }}
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSendCode(); }}
            />
            <button className={c("btn btn-primary btn-sm")} onClick={onSendCode} disabled={busy}>
              {busy ? "שולח..." : "שלח קוד"}
            </button>
          </div>
          {error && <div className={c("field-err")} role="alert">{error}</div>}
          {configHint}
        </div>
      )}

      {step === "sent" && (
        <div>
          <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 8 }}>שלחנו קוד אימות אל {phone}. הזן אותו כאן:</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className={c("fi")}
              placeholder="קוד אימות"
              inputMode="numeric"
              style={{ flex: 1 }}
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onVerify(); }}
            />
            <button className={c("btn btn-primary btn-sm")} onClick={onVerify} disabled={busy}>
              {busy ? "מאמת..." : "אמת וחבר"}
            </button>
          </div>
          {error && <div className={c("field-err")} role="alert">{error}</div>}
          {configHint}
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            <button className={c("btn btn-ghost btn-xs")} onClick={onResend} disabled={busy}>שלח קוד שוב</button>
            <button className={c("btn btn-ghost btn-xs")} onClick={onChangeNumber} disabled={busy}>החלף מספר</button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div className={c("wa-success")}>
          <div className={c("wa-success-icon")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-d)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className={c("wa-success-title")}>{success.title}</div>
          <div className={c("wa-success-num")}>{phone}</div>
          <div className={c("wa-success-sub")}>{success.sub}</div>
          {success.ctaLabel && success.onCta && (
            <button className={c("btn btn-primary btn-sm")} onClick={success.onCta}>{success.ctaLabel}</button>
          )}
        </div>
      )}
    </>
  );
}
