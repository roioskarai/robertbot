import { describe, it, expect } from "vitest";
import { mapTwilioError, maskPhone } from "@/lib/twilio-errors";

describe("mapTwilioError — Twilio codes → actionable Hebrew", () => {
  it("geo-permissions block (60605) is a config issue → 503", () => {
    const m = mapTwilioError({ code: 60605, status: 400 }, "send");
    expect(m.kind).toBe("config");
    expect(m.httpStatus).toBe(503);
    expect(m.userMessageHe).toContain("חסומה");
  });

  it("bad account creds (20003) is config → 503", () => {
    expect(mapTwilioError({ code: 20003 }, "send").kind).toBe("config");
  });

  it("invalid phone (21211/60200) is a user error → 400", () => {
    expect(mapTwilioError({ code: 21211 }, "send")).toMatchObject({ kind: "user", httpStatus: 400 });
    expect(mapTwilioError({ code: 60200 }, "send")).toMatchObject({ kind: "user", httpStatus: 400 });
  });

  it("landline without SMS (60205) is a user error", () => {
    expect(mapTwilioError({ code: 60205 }, "send").userMessageHe).toContain("נייד");
  });

  it("max send attempts (60203) is rate → 429", () => {
    expect(mapTwilioError({ code: 60203 }, "send")).toMatchObject({ kind: "rate", httpStatus: 429 });
  });

  it("20404 depends on op: send→config, check→expired user error", () => {
    expect(mapTwilioError({ code: 20404 }, "send").kind).toBe("config");
    const chk = mapTwilioError({ code: 20404 }, "check");
    expect(chk.kind).toBe("user");
    expect(chk.userMessageHe).toContain("פג תוקף");
  });

  it("HTTP 429 with no known code falls back to a rate message", () => {
    expect(mapTwilioError({ status: 429 }, "send").kind).toBe("rate");
  });

  it("unknown error → generic op message, 502, kind unknown", () => {
    const send = mapTwilioError({ code: 99999 }, "send");
    expect(send).toMatchObject({ kind: "unknown", httpStatus: 502 });
    expect(send.userMessageHe).toContain("שליחת הקוד נכשלה");
    expect(mapTwilioError(new Error("boom"), "check").userMessageHe).toContain("אימות הקוד נכשל");
  });
});

describe("maskPhone", () => {
  it("keeps only the last 4 digits", () => {
    expect(maskPhone("+972501234567")).toBe("***4567");
    expect(maskPhone("0501234567")).toBe("***4567");
    expect(maskPhone("12")).toBe("***");
  });
});
