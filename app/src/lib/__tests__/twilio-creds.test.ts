import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { hasTwilioCreds, hasVerifyCreds } from "@/lib/twilio";

// hasVerifyCreds must be true ONLY when the manual OTP flow can actually work
// end-to-end (account creds AND a Verify service). A half-config (creds
// without the Verify SID) used to leak a raw env-var error to users.

const ORIGINAL = {
  sid: process.env.TWILIO_ACCOUNT_SID,
  token: process.env.TWILIO_AUTH_TOKEN,
  verify: process.env.TWILIO_VERIFY_SERVICE_SID,
};

function setEnv(sid?: string, token?: string, verify?: string) {
  if (sid === undefined) delete process.env.TWILIO_ACCOUNT_SID;
  else process.env.TWILIO_ACCOUNT_SID = sid;
  if (token === undefined) delete process.env.TWILIO_AUTH_TOKEN;
  else process.env.TWILIO_AUTH_TOKEN = token;
  if (verify === undefined) delete process.env.TWILIO_VERIFY_SERVICE_SID;
  else process.env.TWILIO_VERIFY_SERVICE_SID = verify;
}

beforeEach(() => setEnv(undefined, undefined, undefined));

afterAll(() => setEnv(ORIGINAL.sid, ORIGINAL.token, ORIGINAL.verify));

describe("hasTwilioCreds / hasVerifyCreds truth table", () => {
  it("nothing configured (demo) → both false", () => {
    expect(hasTwilioCreds()).toBe(false);
    expect(hasVerifyCreds()).toBe(false);
  });

  it("creds only (the production half-config bug) → creds true, verify FALSE", () => {
    setEnv("ACxxx", "token");
    expect(hasTwilioCreds()).toBe(true);
    expect(hasVerifyCreds()).toBe(false);
  });

  it("verify SID without account creds → both false (SID alone can't send)", () => {
    setEnv(undefined, undefined, "VAxxx");
    expect(hasTwilioCreds()).toBe(false);
    expect(hasVerifyCreds()).toBe(false);
  });

  it("fully configured → both true", () => {
    setEnv("ACxxx", "token", "VAxxx");
    expect(hasTwilioCreds()).toBe(true);
    expect(hasVerifyCreds()).toBe(true);
  });

  it("empty-string env vars are treated as missing", () => {
    setEnv("", "", "");
    expect(hasTwilioCreds()).toBe(false);
    expect(hasVerifyCreds()).toBe(false);
  });
});
