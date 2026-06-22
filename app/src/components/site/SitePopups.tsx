"use client";

// Renders published popups / exit-intent / floating banners on the public site.

import { useEffect, useState } from "react";
import type { SiteBanner } from "@/lib/site/types";

function seen(id: string) {
  try { return localStorage.getItem("rb-banner-" + id) === "1"; } catch { return false; }
}
function markSeen(id: string) {
  try { localStorage.setItem("rb-banner-" + id, "1"); } catch { /* ignore */ }
}

function Popup({ banner, onClose }: { banner: SiteBanner; onClose: () => void }) {
  const c = banner.config;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", background: c.bg ?? "#ffffff", color: c.color ?? "#111827", borderRadius: 16, maxWidth: 420, width: "100%", padding: 28, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
      >
        <button onClick={onClose} aria-label="סגור" style={{ position: "absolute", top: 12, insetInlineEnd: 14, background: "none", border: 0, fontSize: 22, color: "inherit", cursor: "pointer", opacity: 0.5 }}>×</button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {c.imageUrl ? <img src={c.imageUrl} alt="" style={{ maxWidth: "100%", borderRadius: 10, marginBottom: 14 }} /> : null}
        {c.title ? <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{c.title}</h3> : null}
        {c.body ? <p style={{ fontSize: 15, opacity: 0.85, marginBottom: 18 }}>{c.body}</p> : null}
        {c.ctaLabel ? (
          <a href={c.ctaHref ?? "#"} style={{ display: "inline-block", background: "#25D366", color: "#fff", padding: "11px 24px", borderRadius: 10, fontWeight: 700, textDecoration: "none" }}>
            {c.ctaLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function Floating({ banner }: { banner: SiteBanner }) {
  const [open, setOpen] = useState(true);
  const c = banner.config;
  if (!open) return null;
  const sideEnd = c.position !== "bottom-start";
  return (
    <div style={{ position: "fixed", bottom: 20, insetInlineEnd: sideEnd ? 20 : undefined, insetInlineStart: sideEnd ? undefined : 20, zIndex: 9990, background: c.bg ?? "#111827", color: c.color ?? "#fff", borderRadius: 12, padding: "14px 18px", maxWidth: 320, boxShadow: "0 10px 30px rgba(0,0,0,.25)" }}>
      <button onClick={() => setOpen(false)} aria-label="סגור" style={{ position: "absolute", top: 6, insetInlineEnd: 10, background: "none", border: 0, color: "inherit", cursor: "pointer", opacity: 0.6 }}>×</button>
      {c.title ? <div style={{ fontWeight: 700, marginBottom: 4 }}>{c.title}</div> : null}
      {c.body ? <div style={{ fontSize: 13, opacity: 0.85, marginBottom: c.ctaLabel ? 10 : 0 }}>{c.body}</div> : null}
      {c.ctaLabel ? <a href={c.ctaHref ?? "#"} style={{ color: "#25D366", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>{c.ctaLabel} ←</a> : null}
    </div>
  );
}

export default function SitePopups({ banners }: { banners: SiteBanner[] }) {
  const [activePopup, setActivePopup] = useState<SiteBanner | null>(null);

  const popups = banners.filter((b) => b.kind === "popup" || b.kind === "exit_intent");
  const floats = banners.filter((b) => b.kind === "floating");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const candidates = popups.filter((b) => !(b.config.showOnce && seen(b.id)));
    const timed = candidates.find((b) => b.kind === "popup");
    const exit = candidates.find((b) => b.kind === "exit_intent");

    if (timed) {
      const delay = (timed.config.delaySeconds ?? 3) * 1000;
      timers.push(setTimeout(() => setActivePopup(timed), delay));
    }
    let onLeave: ((e: MouseEvent) => void) | null = null;
    if (exit) {
      onLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) { setActivePopup(exit); if (onLeave) document.removeEventListener("mouseout", onLeave); }
      };
      document.addEventListener("mouseout", onLeave);
    }
    return () => {
      timers.forEach(clearTimeout);
      if (onLeave) document.removeEventListener("mouseout", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (activePopup?.config.showOnce) markSeen(activePopup.id);
    setActivePopup(null);
  };

  return (
    <>
      {activePopup ? <Popup banner={activePopup} onClose={close} /> : null}
      {floats.map((b) => <Floating key={b.id} banner={b} />)}
    </>
  );
}
