"use client";

// WhatsApp connection wizard via Meta Embedded Signup.
// Each tenant connects its OWN Meta Portfolio + WABA, so a ban on one tenant
// never affects another. Drop-in: <ConnectWhatsApp botId={bot.id} onConnected={...} />
//
// Activates only once the Meta App is configured (GET /api/whatsapp/config
// returns enabled:true). Until then it renders a friendly "coming soon" note.

import { useCallback, useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

interface Props {
  botId: string;
  onConnected?: (bot: { whatsapp_number?: string | null }) => void;
}

interface SessionInfo {
  phoneNumberId?: string;
  wabaId?: string;
  businessId?: string;
}

type Status = "idle" | "loading" | "connecting" | "done" | "error";

export default function ConnectWhatsApp({ botId, onConnected }: Props) {
  const [cfg, setCfg] = useState<{ enabled: boolean; appId: string; configId: string; graphVersion: string } | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const session = useRef<SessionInfo>({});

  // 1) Load public config; if Meta isn't set up yet, stop here.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/whatsapp/config")
      .then((r) => r.json())
      .then((c) => {
        if (cancelled) return;
        setCfg(c);
        setStatus("idle");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Capture WABA / phone-number ids that Meta posts during the flow.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!/facebook\.com$/.test(new URL(event.origin).hostname) && !event.origin.includes("facebook.com")) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.data) {
          session.current = {
            phoneNumberId: data.data.phone_number_id,
            wabaId: data.data.waba_id,
            businessId: data.data.business_id,
          };
        }
      } catch {
        /* non-JSON messages are not ours */
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // 3) Load the Facebook JS SDK once config is known.
  useEffect(() => {
    if (!cfg?.enabled || !cfg.appId) return;
    if (window.FB) return;
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: cfg.appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: cfg.graphVersion || "v21.0",
      });
    };
    const s = document.createElement("script");
    s.src = "https://connect.facebook.net/en_US/sdk.js";
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    document.body.appendChild(s);
  }, [cfg]);

  const finish = useCallback(
    async (code: string) => {
      setStatus("connecting");
      try {
        const res = await fetch(`/api/bots/${botId}/connect-meta`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            wabaId: session.current.wabaId,
            phoneNumberId: session.current.phoneNumberId,
            businessId: session.current.businessId,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "החיבור נכשל");
        setStatus("done");
        onConnected?.(json.bot ?? {});
      } catch (e) {
        setError(e instanceof Error ? e.message : "החיבור נכשל");
        setStatus("error");
      }
    },
    [botId, onConnected],
  );

  const launch = useCallback(() => {
    if (!window.FB || !cfg) return;
    setError(null);
    window.FB.login(
      (response: any) => {
        const code = response?.authResponse?.code;
        if (code) finish(code);
        else {
          setError("החיבור בוטל");
          setStatus("idle");
        }
      },
      {
        config_id: cfg.configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      },
    );
  }, [cfg, finish]);

  if (status === "loading") return <span style={{ color: "#888", fontSize: 13 }}>טוען…</span>;

  if (!cfg?.enabled) {
    return (
      <div style={{ fontSize: 13, color: "#888" }}>
        חיבור וואטסאפ אוטומטי יופעל בקרוב. בינתיים ניתן לחבר מספר ידנית.
      </div>
    );
  }

  if (status === "done") {
    return <span style={{ color: "var(--green-d, #128c4b)", fontWeight: 700 }}>✓ הוואטסאפ חובר בהצלחה</span>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={launch}
        disabled={status === "connecting"}
        style={{
          background: "#25D366",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "10px 18px",
          fontWeight: 700,
          fontSize: 14,
          cursor: status === "connecting" ? "default" : "pointer",
          opacity: status === "connecting" ? 0.7 : 1,
        }}
      >
        {status === "connecting" ? "מחבר…" : "חבר את הוואטסאפ שלי"}
      </button>
      {error && <div style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>{error}</div>}
      <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
        החיבור מתבצע דרך Meta — המספר נשאר בבעלותך המלאה, וניתן לנתק בכל רגע.
      </div>
    </div>
  );
}
