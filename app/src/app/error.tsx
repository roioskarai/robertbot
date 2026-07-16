"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { LogoInk } from "@/components/logo";

/**
 * Root error boundary — friendly Hebrew recovery screen.
 * (Sentry wiring lands in wave 8; until then we log to the console.)
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 24,
        background: "var(--bg)",
      }}
    >
      <LogoInk variant="wordmark" style={{ height: 32, width: "auto", color: "var(--t1)" }} />
      <Card pad style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "var(--display-xs)", fontWeight: 700, marginBottom: 8 }}>
          משהו השתבש
        </div>
        <p style={{ color: "var(--text-3)", fontSize: "var(--text-sm)", marginBottom: 20 }}>
          נתקלנו בתקלה זמנית. אפשר לנסות שוב — ואם זה חוזר, אנחנו כבר על זה.
          {error.digest && (
            <span style={{ display: "block", marginTop: 8, color: "var(--text-4)", fontSize: "var(--text-xs)", direction: "ltr" }}>
              קוד תקלה: {error.digest}
            </span>
          )}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Button onClick={reset}>נסה שוב</Button>
          <Link href="/">
            <Button variant="secondary">לדף הבית</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
