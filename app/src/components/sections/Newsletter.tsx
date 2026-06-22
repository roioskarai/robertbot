"use client";

import { useState } from "react";
import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import type { NewsletterProps } from "@/lib/site/types";

const c = scoped(styles);

export default function Newsletter({ props }: { props: NewsletterProps }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState("loading");
    try {
      const res = await fetch("/api/site/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "newsletter-section" }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <section className={c("sec")}>
      <div className={c("sh rv")}>
        <h2 className={c("sec-title")}>{props.title ?? "הישארו מעודכנים"}</h2>
        {props.subtitle ? <p className={c("sec-sub")}>{props.subtitle}</p> : null}
      </div>
      {state === "done" ? (
        <p style={{ textAlign: "center", color: "var(--green-d)", fontWeight: 600 }}>
          תודה! נרשמת בהצלחה 🎉
        </p>
      ) : (
        <form
          onSubmit={submit}
          className={c("rv")}
          style={{ display: "flex", gap: 10, justifyContent: "center", maxWidth: 480, margin: "0 auto" }}
        >
          <input
            type="email"
            required
            placeholder="המייל שלך"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              flex: 1,
              padding: "12px 16px",
              border: "1px solid var(--bdr2)",
              borderRadius: "var(--r)",
              fontSize: 15,
              background: "var(--white)",
              color: "var(--t1)",
            }}
          />
          <button type="submit" className={c("btn-primary")} disabled={state === "loading"}>
            {state === "loading" ? "..." : props.buttonLabel ?? "הרשמה"}
          </button>
        </form>
      )}
      {state === "error" ? (
        <p style={{ textAlign: "center", color: "var(--t3)", marginTop: 8 }}>
          משהו השתבש, נסו שוב
        </p>
      ) : null}
    </section>
  );
}
