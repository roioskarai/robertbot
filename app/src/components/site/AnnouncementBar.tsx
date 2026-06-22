"use client";

// Dismissible announcement/promotional bar shown at the very top of the site.
// Driven by SiteSettingsDoc.announcement. Marquee scroll via CSS keyframes.

import { useState } from "react";
import type { AnnouncementConfig } from "@/lib/site/types";

export default function AnnouncementBar({ config }: { config: AnnouncementConfig }) {
  const [open, setOpen] = useState(true);
  if (!config.enabled || !config.text || !open) return null;

  const speed = config.speed && config.speed > 0 ? config.speed : 20;
  const content = config.link ? (
    <a href={config.link} style={{ color: "inherit", textDecoration: "underline" }}>
      {config.text}
    </a>
  ) : (
    config.text
  );

  return (
    <div
      style={{
        position: "relative",
        background: config.bg ?? "#18a84f",
        color: config.color ?? "#ffffff",
        overflow: "hidden",
        height: 38,
        display: "flex",
        alignItems: "center",
        fontSize: 14,
        fontWeight: 600,
        zIndex: 400,
      }}
    >
      <style>{`@keyframes rb-marquee{from{transform:translateX(100%)}to{transform:translateX(-100%)}}`}</style>
      <div style={{ whiteSpace: "nowrap", animation: `rb-marquee ${speed}s linear infinite`, paddingInline: 24 }}>
        {content}
      </div>
      <button
        onClick={() => setOpen(false)}
        aria-label="סגור"
        style={{
          position: "absolute",
          insetInlineEnd: 10,
          top: "50%",
          transform: "translateY(-50%)",
          background: "transparent",
          border: 0,
          color: "inherit",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
