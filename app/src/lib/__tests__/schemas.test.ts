import { describe, it, expect } from "vitest";
import {
  parseBody,
  botCreateSchema,
  botUpdateSchema,
  connectSchema,
  connectMetaSchema,
  replySchema,
  checkoutSchema,
} from "@/lib/schemas";

describe("botCreateSchema", () => {
  it("accepts a minimal valid bot", () => {
    const r = parseBody(botCreateSchema, { name: "מספרת דנה" });
    expect(r.ok).toBe(true);
  });

  it("rejects a missing name with a Hebrew message", () => {
    const r = parseBody(botCreateSchema, { name: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe("חסר שם עסק");
  });

  it("rejects an over-long description", () => {
    const r = parseBody(botCreateSchema, { name: "עסק", description: "א".repeat(3000) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe("התיאור ארוך מדי");
  });

  it("strips unknown / dangerous keys", () => {
    const r = parseBody(botCreateSchema, {
      name: "עסק",
      user_id: "someone-else",
      wa_access_token: "stolen",
      system_prompt: "override",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).not.toHaveProperty("user_id");
      expect(r.data).not.toHaveProperty("wa_access_token");
      expect(r.data).not.toHaveProperty("system_prompt");
    }
  });

  it("validates services and faq shapes", () => {
    const ok = parseBody(botCreateSchema, {
      name: "עסק",
      services: [{ name: "תספורת", price: "₪80" }],
      faq: [{ question: "חניה?", answer: "יש" }],
    });
    expect(ok.ok).toBe(true);
    const bad = parseBody(botCreateSchema, { name: "עסק", services: [{ name: "", price: "1" }] });
    expect(bad.ok).toBe(false);
  });

  it("rejects an invalid style", () => {
    expect(parseBody(botCreateSchema, { name: "עסק", style: "shouty" }).ok).toBe(false);
    expect(parseBody(botCreateSchema, { name: "עסק", style: "professional" }).ok).toBe(true);
  });
});

describe("botUpdateSchema", () => {
  it("accepts a partial update", () => {
    expect(parseBody(botUpdateSchema, { description: "עודכן" }).ok).toBe(true);
    expect(parseBody(botUpdateSchema, {}).ok).toBe(true);
  });

  it("validates working_hours structure", () => {
    const day = { open: "09:00", close: "19:00", closed: false };
    const ok = parseBody(botUpdateSchema, {
      working_hours: { sun: day, mon: day, tue: day, wed: day, thu: day, fri: day, sat: { ...day, closed: true } },
    });
    expect(ok.ok).toBe(true);
    const bad = parseBody(botUpdateSchema, { working_hours: { sun: { open: "9am" } } });
    expect(bad.ok).toBe(false);
  });
});

describe("connectSchema", () => {
  it("accepts number-only (OTP send) and number+code (verify)", () => {
    expect(parseBody(connectSchema, { number: "0501234567" }).ok).toBe(true);
    expect(parseBody(connectSchema, { number: "0501234567", code: "123456" }).ok).toBe(true);
  });
  it("rejects a non-numeric code", () => {
    expect(parseBody(connectSchema, { number: "0501234567", code: "abc" }).ok).toBe(false);
  });
});

describe("connectMetaSchema", () => {
  it("requires code and wabaId", () => {
    expect(parseBody(connectMetaSchema, { code: "c", wabaId: "w" }).ok).toBe(true);
    const r = parseBody(connectMetaSchema, { code: "c" });
    expect(r.ok).toBe(false);
  });
});

describe("replySchema", () => {
  it("trims and enforces bounds", () => {
    const r = parseBody(replySchema, { body: "  שלום  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.body).toBe("שלום");
    expect(parseBody(replySchema, { body: "   " }).ok).toBe(false);
    expect(parseBody(replySchema, { body: "א".repeat(4001) }).ok).toBe(false);
  });
});

describe("checkoutSchema", () => {
  it("accepts a product id and rejects empties", () => {
    expect(parseBody(checkoutSchema, { product: "pro_monthly" }).ok).toBe(true);
    expect(parseBody(checkoutSchema, {}).ok).toBe(false);
  });
});

describe("parseBody", () => {
  it("falls back to a generic Hebrew message for non-custom issues", () => {
    const r = parseBody(checkoutSchema, { product: 5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(typeof r.message).toBe("string");
  });
});
