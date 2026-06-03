"use client";

import { useCallback, useState } from "react";

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);

  const toast = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout((toast as unknown as { _t?: number })._t);
    (toast as unknown as { _t?: number })._t = window.setTimeout(
      () => setMsg(null),
      2400,
    );
  }, []);

  const ToastHost = () =>
    msg ? (
      <div
        style={{
          position: "fixed",
          bottom: 22,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#1c1f2e",
          color: "#fff",
          padding: "10px 20px",
          borderRadius: 9,
          fontSize: 13.5,
          fontWeight: 600,
          zIndex: 9999,
          boxShadow: "0 4px 16px rgba(0,0,0,.25)",
          whiteSpace: "nowrap",
        }}
      >
        {msg}
      </div>
    ) : null;

  return { toast, ToastHost };
}
