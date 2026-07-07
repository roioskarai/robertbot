"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Auth-aware slot for the marketing nav.
 * Logged out (or unknown): the CMS-configured login + signup links.
 * Logged in: "האזור האישי" + "התנתק".
 *
 * Zero layout shift: while the state is unknown we render the logged-out
 * links at full size but invisible — same DOM box, no jump when resolved.
 * In demo/CI (placeholder Supabase) we resolve to logged-out immediately.
 */
export default function HeaderAuth({
  loginLabel,
  loginHref,
  ctaLabel,
  ctaHref,
  loginClass,
  ctaClass,
  as = "li",
}: {
  loginLabel: string;
  loginHref: string;
  ctaLabel: string;
  ctaHref: string;
  loginClass: string;
  ctaClass: string;
  /** Wrapper element for each item — "li" for <ul> navs (default), "div" for flex-div navs. */
  as?: "li" | "div";
}) {
  const Item = as;
  const [state, setState] = useState<"unknown" | "out" | "in">("unknown");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    if (!url || url.includes("placeholder")) {
      setState("out"); // demo / CI — no real auth backend
      return;
    }
    let cancelled = false;

    // Server-truth probe: /api/auth/me reads the session from cookies on the
    // server, so it stays correct even when the browser-side Supabase client
    // can't hydrate a session (the bug that hid "האזור האישי" from logged-in
    // users). The auth-state subscription just re-probes on changes.
    const probe = () => {
      fetch("/api/auth/me", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled) setState(d?.authenticated ? "in" : "out");
        })
        .catch(() => {
          if (!cancelled) setState("out");
        });
    };
    probe();

    try {
      const supabase = createClient();
      const { data: sub } = supabase.auth.onAuthStateChange(() => {
        if (!cancelled) probe();
      });
      return () => {
        cancelled = true;
        sub.subscription.unsubscribe();
      };
    } catch {
      return () => {
        cancelled = true;
      };
    }
  }, []);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* even if the call fails, drop to home — middleware re-checks */
    }
    window.location.assign("/");
  }

  if (state === "in") {
    return (
      <>
        <Item>
          <button type="button" onClick={logout} className={loginClass}>
            התנתק
          </button>
        </Item>
        <Item>
          <Link href="/dashboard" className={ctaClass}>
            האזור האישי
          </Link>
        </Item>
      </>
    );
  }

  // logged-out and unknown share the same DOM (no layout shift)
  const hidden = state === "unknown" ? { visibility: "hidden" as const } : undefined;
  return (
    <>
      <Item style={hidden}>
        <Link href={loginHref} className={loginClass}>
          {loginLabel}
        </Link>
      </Item>
      <Item style={hidden}>
        <Link href={ctaHref} className={ctaClass}>
          {ctaLabel}
        </Link>
      </Item>
    </>
  );
}
