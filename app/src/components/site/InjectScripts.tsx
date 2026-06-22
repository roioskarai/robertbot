"use client";

// Executes owner-authored custom scripts (header/footer/custom JS). Scripts set
// via React innerHTML do NOT run, so we recreate <script> nodes on mount so the
// browser executes them. Restricted to super_admin in the admin UI.

import { useEffect } from "react";

function injectInto(html: string, target: HTMLElement): HTMLElement[] {
  if (!html) return [];
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const created: HTMLElement[] = [];
  tmp.querySelectorAll("script").forEach((old) => {
    const s = document.createElement("script");
    Array.from(old.attributes).forEach((a) => s.setAttribute(a.name, a.value));
    s.textContent = old.textContent;
    target.appendChild(s);
    created.push(s);
  });
  return created;
}

export default function InjectScripts({ head, foot }: { head?: string; foot?: string }) {
  useEffect(() => {
    const nodes = [
      ...injectInto(head ?? "", document.head),
      ...injectInto(foot ?? "", document.body),
    ];
    return () => nodes.forEach((n) => n.remove());
  }, [head, foot]);
  return null;
}
