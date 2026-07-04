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
}: {
  loginLabel: string;
  loginHref: string;
  ctaLabel: string;
  ctaHref: string;
  loginClass: string;
  ctaClass: string;
}) {
  const [state, setState] = useState<"unknown" | "out" | "in">("unknown");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    if (!url || url.includes("placeholder")) {
      setState("out"); // demo / CI — no real auth backend
      return;
    }
    let cancelled = false;
    try {
      const supabase = createClient();
      supabase.auth
        .getUser()
        .then(({ data }) => {
          if (!cancelled) setState(data.user ? "in" : "out");
        })
        .catch(() => {
          if (!cancelled) setState("out");
        });
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) setState(session?.user ? "in" : "out");
      });
      return () => {
        cancelled = true;
        sub.subscription.unsubscribe();
      };
    } catch {
      setState("out");
      return;
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
        <li>
          <button type="button" onClick={logout} className={loginClass}>
            התנתק
          </button>
        </li>
        <li>
          <Link href="/dashboard" className={ctaClass}>
            האזור האישי
          </Link>
        </li>
      </>
    );
  }

  // logged-out and unknown share the same DOM (no layout shift)
  const hidden = state === "unknown" ? { visibility: "hidden" as const } : undefined;
  return (
    <>
      <li style={hidden}>
        <Link href={loginHref} className={loginClass}>
          {loginLabel}
        </Link>
      </li>
      <li style={hidden}>
        <Link href={ctaHref} className={ctaClass}>
          {ctaLabel}
        </Link>
      </li>
    </>
  );
}
