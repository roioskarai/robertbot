"use client";

// Shown only in Draft Mode (live preview). Lets the admin exit preview.

export default function DraftBanner() {
  async function exit() {
    await fetch("/api/admin/site/preview?exit=1", { method: "POST" });
    window.location.reload();
  }
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        insetInlineStart: 16,
        zIndex: 9999,
        background: "#0d0f14",
        color: "#fff",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,.35)",
      }}
    >
      <span>👁️ מצב תצוגה מקדימה — טיוטה לא מפורסמת</span>
      <button
        onClick={exit}
        style={{
          background: "#22c55e",
          color: "#0d0f14",
          border: 0,
          borderRadius: 7,
          padding: "5px 10px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        יציאה
      </button>
    </div>
  );
}
