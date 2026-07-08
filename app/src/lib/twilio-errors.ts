// Maps Twilio (Verify) failures to a useful Hebrew message + a coarse "kind"
// so the OTP routes can (a) tell the user something actionable instead of a
// generic "שליחת הקוד נכשלה", and (b) log a config runbook hint for the owner.
//
// Twilio's RestException carries a numeric `code` (e.g. 60605) and an HTTP
// `status`. We never surface the raw SDK/env text to the client.

export type WaErrorKind = "config" | "user" | "rate" | "unknown";

export interface MappedTwilioError {
  userMessageHe: string;
  httpStatus: number;
  kind: WaErrorKind;
  twilioCode?: number;
}

interface TwilioLike {
  code?: number;
  status?: number;
  message?: string;
  moreInfo?: string;
}

/** Mask a phone for logs — keep only the last 4 digits. */
export function maskPhone(num: string): string {
  const digits = (num || "").replace(/\D/g, "");
  return digits.length >= 4 ? "***" + digits.slice(-4) : "***";
}

export function mapTwilioError(err: unknown, op: "send" | "check"): MappedTwilioError {
  const e = (err ?? {}) as TwilioLike;
  const code = typeof e.code === "number" ? e.code : undefined;
  const http = typeof e.status === "number" ? e.status : undefined;
  const generic = op === "send" ? "שליחת הקוד נכשלה. נסה שוב בעוד רגע." : "אימות הקוד נכשל. נסה שוב.";

  const CONFIG = "שירות שליחת הקודים אינו זמין כרגע. פנה לתמיכה.";

  switch (code) {
    case 20003: // authenticate — bad account creds
      return { userMessageHe: CONFIG, httpStatus: 503, kind: "config", twilioCode: code };
    case 20404: // resource not found — Verify Service SID wrong (send) / verification gone (check)
      return op === "send"
        ? { userMessageHe: CONFIG, httpStatus: 503, kind: "config", twilioCode: code }
        : { userMessageHe: "הקוד פג תוקף — בקש קוד חדש", httpStatus: 400, kind: "user", twilioCode: code };
    case 21211: // invalid 'To' phone number
    case 60200: // invalid parameter
      return { userMessageHe: "מספר הטלפון אינו תקין — בדוק ונסה שוב", httpStatus: 400, kind: "user", twilioCode: code };
    case 60205: // SMS not supported by landline
      return { userMessageHe: "המספר אינו יכול לקבל SMS — הזן מספר נייד", httpStatus: 400, kind: "user", twilioCode: code };
    case 60203: // max send attempts reached
      return { userMessageHe: "נשלחו יותר מדי קודים למספר הזה. המתן כ-10 דקות ונסה שוב.", httpStatus: 429, kind: "rate", twilioCode: code };
    case 60202: // max check attempts reached
      return { userMessageHe: "יותר מדי ניסיונות אימות — בקש קוד חדש", httpStatus: 429, kind: "rate", twilioCode: code };
    case 60212: // too many concurrent requests for this phone
      return { userMessageHe: "בקשה קודמת עדיין בטיפול — המתן רגע ונסה שוב", httpStatus: 429, kind: "rate", twilioCode: code };
    case 60605: // Verify delivery blocked by geo-permissions (suspected prod root cause)
      return { userMessageHe: "שליחת SMS למספר חסומה זמנית בהגדרות ספק ההודעות. פנה לתמיכה ונטפל מיד.", httpStatus: 503, kind: "config", twilioCode: code };
    case 20429: // Twilio-side rate limit
      return { userMessageHe: "יותר מדי ניסיונות מול ספק ההודעות. נסה שוב בעוד כמה דקות.", httpStatus: 429, kind: "rate", twilioCode: code };
  }

  if (http === 429) {
    return { userMessageHe: "יותר מדי ניסיונות מול ספק ההודעות. נסה שוב בעוד כמה דקות.", httpStatus: 429, kind: "rate", twilioCode: code };
  }
  return { userMessageHe: generic, httpStatus: 502, kind: "unknown", twilioCode: code };
}
