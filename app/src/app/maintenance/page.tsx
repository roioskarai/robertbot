import type { Metadata } from "next";
import { getMaintenance } from "@/lib/system-settings";
import Logo from "@/components/logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "בתחזוקה",
  robots: { index: false, follow: false },
};

const DEFAULT_MESSAGE =
  "אנחנו מבצעים עבודות תחזוקה קצרות כדי לשפר את השירות. נחזור עוד מעט — תודה על הסבלנות.";

export default async function MaintenancePage() {
  const m = await getMaintenance();

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "radial-gradient(900px 600px at 50% -6%, #ecfdf3, transparent 60%), #f7f9f8",
        fontFamily: "var(--font-rubik), 'Rubik', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          background: "#ffffff",
          border: "1px solid #eaecf0",
          borderRadius: 16,
          padding: "40px 28px",
          boxShadow: "0 4px 8px -2px rgba(16,24,40,.10), 0 2px 4px -2px rgba(16,24,40,.06)",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 20px",
            borderRadius: 14,
            background: "#d1fadf",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
          }}
        >
          🛠️
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#101828", margin: "0 0 12px" }}>
          המערכת בתחזוקה
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "#475467", margin: 0 }}>
          {m.message || DEFAULT_MESSAGE}
        </p>
        {m.etaText && (
          <p style={{ fontSize: 14, color: "#667085", margin: "18px 0 0" }}>
            <strong style={{ color: "#039855" }}>זמן חזרה משוער:</strong> {m.etaText}
          </p>
        )}
        {/* card is always a white surface — use the dark-on-light wordmark */}
        <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
          <Logo variant="wordmark" theme="light" style={{ height: 20, width: "auto", opacity: 0.7 }} />
        </div>
      </div>
    </main>
  );
}
