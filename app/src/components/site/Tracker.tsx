"use client";

// Fires a pageview beacon to /api/site/track once per page load. A stable
// per-browser session id lets the dashboard count unique sessions.

import { useEffect } from "react";

function sessionId(): string {
  try {
    let id = localStorage.getItem("rb-sid");
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("rb-sid", id); }
    return id;
  } catch {
    return "anon";
  }
}

export default function Tracker() {
  useEffect(() => {
    const body = JSON.stringify({
      type: "pageview",
      path: location.pathname,
      referrer: document.referrer,
      sessionId: sessionId(),
    });
    fetch("/api/site/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }, []);
  return null;
}
