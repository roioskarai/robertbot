import { describe, it, expect } from "vitest";
import { parseBotReply, buildSystemPrompt } from "@/lib/claude";
import type { Bot } from "@/lib/types";

describe("parseBotReply", () => {
  it("returns plain text untouched", () => {
    const r = parseBotReply("שלום! איך אפשר לעזור?");
    expect(r).toEqual({ text: "שלום! איך אפשר לעזור?", buttons: [], handoff: false });
  });

  it("extracts buttons and strips the token", () => {
    const r = parseBotReply("בחר שירות: [BUTTONS: תספורת | צבע | פן]");
    expect(r.buttons).toEqual(["תספורת", "צבע", "פן"]);
    expect(r.text).toBe("בחר שירות:");
    expect(r.handoff).toBe(false);
  });

  it("detects handoff and strips it", () => {
    const r = parseBotReply("מעביר אותך לנציג [HANDOFF]");
    expect(r.handoff).toBe(true);
    expect(r.text).toBe("מעביר אותך לנציג");
  });

  it("handles buttons + handoff together, case-insensitive", () => {
    const r = parseBotReply("רגע [buttons: כן | לא] [handoff]");
    expect(r.buttons).toEqual(["כן", "לא"]);
    expect(r.handoff).toBe(true);
  });

  it("ignores empty button entries", () => {
    const r = parseBotReply("[BUTTONS: א | | ב ]");
    expect(r.buttons).toEqual(["א", "ב"]);
  });
});

describe("buildSystemPrompt", () => {
  const bot = {
    name: "מספרת דנה",
    bot_name: "דנהבוט",
    business_type: "מספרה",
    description: "מספרה שכונתית",
    services: [{ name: "תספורת", price: "80" }],
    working_hours: "א-ה 9:00-19:00",
    address: "הרצל 1, תל אביב",
    phone: "03-1234567",
    style: "friendly",
    faq: [{ question: "יש חניה?", answer: "יש חניון צמוד" }],
  } as unknown as Bot;

  it("embeds the business facts", () => {
    const p = buildSystemPrompt(bot);
    expect(p).toContain("מספרת דנה");
    expect(p).toContain("תספורת");
    expect(p).toContain("הרצל 1");
    expect(p).toContain("יש חניה?");
    expect(p).toContain("יש חניון צמוד");
  });
});
