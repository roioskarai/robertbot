import type { WhatsAppWidgetConfig } from "@/lib/site/types";

// Floating WhatsApp button (fits Robert's WhatsApp-first product).
export default function WhatsAppWidget({ config }: { config: WhatsAppWidgetConfig }) {
  if (!config.enabled || !config.phone) return null;
  const phone = config.phone.replace(/[^\d]/g, "");
  const href = `https://wa.me/${phone}${config.message ? `?text=${encodeURIComponent(config.message)}` : ""}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp"
      style={{
        position: "fixed", bottom: 22, insetInlineStart: 22, zIndex: 9985,
        width: 56, height: 56, borderRadius: "50%", background: "#25D366",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 6px 20px rgba(37,211,102,.45)",
      }}
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff">
        <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm5.8 14.07c-.24.68-1.4 1.3-1.94 1.34-.5.04-.97.22-3.27-.68-2.76-1.09-4.52-3.92-4.66-4.1-.14-.18-1.12-1.49-1.12-2.84 0-1.35.71-2.01.96-2.29.25-.27.54-.34.72-.34.18 0 .36 0 .52.01.17.01.39-.06.61.47.24.55.81 1.9.88 2.04.07.14.12.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.53 1.9 1.05.93 1.94 1.22 2.21 1.36.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.22.61-.13.25.09 1.6.75 1.87.89.27.14.45.2.52.31.07.12.07.66-.17 1.34z" />
      </svg>
    </a>
  );
}
