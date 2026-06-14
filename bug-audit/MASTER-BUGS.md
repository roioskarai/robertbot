# 🐛 רשימת באגים מאוחדת — פרויקט Robert

> תוצר של סבב סריקה מקיף ב-14/06/2026 ע"י 4 סוכנים (qa-verifier, general-purpose,
> multitenant-security-reviewer, cyber-guardian). זו רשימת-האב המתועדפת.
> פירוט מלא לכל תחום: `qa-functional.md`, `admin-ui-logic.md`,
> `security-multitenant.md`, `security-secrets-deps.md`.
>
> **סטטוס: איתור ותיעוד בלבד — שום באג עדיין לא תוקן.**

## סיכום מספרי
~55 באגים מובחנים. חומרה: **8 🔴 קריטיים · ~17 🟠 גבוהים · ~15 🟡 בינוניים · ~15 ⚪ נמוכים.**
הליבה (RLS, אימות, פאנל אדמין, חתימות Stripe/Meta, תלויות npm) — תקינה.

---

## 🚦 TIER 0 — אבטחה וכסף (לתקן ראשון; ניתן לניצול אמיתי)

| # | חומרה | באג | קובץ | תיקון |
|---|---|---|---|---|
| T0-1 | 🔴 | Webhook Grow לא-חתום → Enterprise/חבילות בחינם | `lib/payments/grow-provider.ts:141` | לדרוש secret, fail-closed |
| T0-2 | 🔴 | אימות Twilio ניתן לעקיפה → הזרקת הודעות + שריפת מכסה | `api/webhook/whatsapp/route.ts:34` | לאמת תמיד, לדחות ללא חתימה |
| T0-3 | 🔴 | "Downgrade" = שדרוג בחינם | `api/billing/downgrade/route.ts:20` | בדיקת דרגה + תשלום |
| T0-4 | 🔴 | **PAT של GitHub חשוף בדיסק** | `.git/config`, `.claude/settings.local.json` | **revoke ידני** + credential helper |
| T0-5 | 🟠 | CRON_SECRET fail-open → הרצת סוכנים חוצת-דיירים | `api/agents/run/[agent]/route.ts:22`, `api/cron/trial/route.ts:13` | fail-closed |
| T0-6 | 🟠 | הפעלת בוט עוקפת מגבלת תוכנית | `api/bots/[id]/activate/route.ts:21` | ספירת בוטים פעילים |
| T0-7 | 🟠 | מנוי מבוטל/מושהה עדיין מקבל שירות | `lib/whatsapp/inbound.ts:29` | בדיקת subscription_status |
| T0-8 | 🟠 | מספר וואטסאפ ניתן לחטיפה בין דיירים | `api/bots/[id]/connect/route.ts:51` | unique constraint + השוואה מדויקת |

---

## 🔧 TIER 1 — פיצ'רים שבורים שהמשתמש פוגש (קריטי פונקציונלי)

| # | חומרה | באג | קובץ | תיקון |
|---|---|---|---|---|
| T1-1 | 🔴 | **עורך FAQ: לחיצה מוחקת שאלה במקום לפתוח** ← הבאג שדיווחת | `dashboard/page.tsx:540-548` + `dashboard.module.css:318-321` | להפוך שדות עריכה לנראים; להרחיק/לאשר את כפתור ✕ |
| T1-2 | 🔴 | צ'אט Preview קורא לכתובת API שגויה → 404 לכל הודעה | `preview/page.tsx:242` (`/api/bots/preview/preview`) | לתקן את ה-URL |
| T1-3 | 🔴 | אימות קוד SMS לא מחובר (toast בלבד) | `onboarding/page.tsx:676-683` | לחבר POST אמיתי |
| T1-4 | 🔴 | מחיקת בוט שלם בקליק אחד ללא אישור, צמוד ל"שמור" | `dashboard/page.tsx` (כפתור מחיקת בוט) | להוסיף confirm + להרחיק |
| T1-5 | 🟠 | `saveBot` מציג "נשמר בהצלחה" גם בכשל שרת (מאבד שינויים) | `dashboard/page.tsx` (saveBot) | לבדוק `res.ok` |
| T1-6 | 🟠 | זיהוי demo לא-עקבי: בוטים `startsWith("demo")` אך שיחות `startsWith("d")` → ~1/16 שיחות אמיתיות לא נענות אך מציגות "נשלח" | `dashboard` / inbox logic | לאחד את תנאי ה-demo |
| T1-7 | 🟠 | "שכחת סיסמה" לא שולח מייל (toast בלבד) | `login` / forgot flow | לחבר API |

**דפוס חוזר מסוכן:** טיפול ב-`fetch` שמתעלם מ-`res.ok` ומציג הצלחה גם בכשל (T1-5, T1-6, ועוד #6/#15/#16 בדוח האדמין).

---

## 🧹 TIER 2 — שלמות נתונים ונכונות

| # | חומרה | באג | קובץ |
|---|---|---|---|
| T2-1 | 🟠 | אימייל אדמין קשיח בקוד (`roioskarai@gmail.com`) חשוף ב-GitHub | `qa-functional.md` BUG-04 |
| T2-2 | 🟠 | שם "דני כהן" קשיח — כל משתמש רואה "דני" | dashboard (BUG-10) |
| T2-3 | 🟡 | היסטוריית שיחות קשיחה (5 שורות demo תמיד) | BUG-09 |
| T2-4 | 🟡 | ביטול מנוי מסמן DB `cancelled` מיד, לפני סוף התקופה | BUG-26 (קשור T0-7) |
| T2-5 | 🟡 | `dangerouslySetInnerHTML` עם תוכן Claude (XSS פוטנציאלי) | `preview/page.tsx:341` |
| T2-6 | 🟡 | RPC `decrement_pack_balance`/`increment_usage` אולי חסרות ב-DB | BUG-20 |
| T2-7 | 🟡 | זיכוי חבילה ללא idempotency/תקרה | `lib/payments/apply.ts:41` |
| T2-8 | 🟡 | תשובת נציג אנושי ללא rate-limit/מכסה | `api/conversations/[id]/reply/route.ts:24` |

---

## ✨ TIER 3 — UX, ליטוש וקשיחות

- ⚪ סיסמה 6 תווים ב-API מול "8 לפחות" ב-UI (`auth/signup/route.ts:17`)
- ⚪ סגנון "חם ואישי" כפול ל-"friendly" (BUG-06)
- ⚪ `getElementById` במקום React state ב-Inbox (BUG-07)
- ⚪ `window.confirm()` חוסם ב-Preview (BUG-08)
- ⚪ כפתורים ללא פעולה: מרכז עזרה, צ'אט תמיכה, הורד חשבונית, + הוסף כפתור (BUG-11/12/13)
- ⚪ Stripe webhook פעיל גם כש-Grow הוא הספק (security #8)
- ⚪ אין rate-limit בכניסת אדמין/TOTP (security #11)
- ⚪ שימוש חוזר בסוד אחד ל-3 תפקידים (secrets 1.3)
- ⚪ fallback חלש לסודות חסרים: `admin-auth.ts:25`, `crypto.ts:27`
- ⚪ `.mcp.json` עם `@latest` — שקול נעילת גרסאות
- ⚪ + 10 ממצאים נמוכים נוספים בדוח האדמין (`admin-ui-logic.md`)

---

## סדר תיקון מומלץ
1. **T0-4** (revoke PAT) — פעולת משתמש, עכשיו.
2. **T0 אבטחה/כסף** (T0-1..T0-8) — סוכני הנדסה, עם אימות מלא.
3. **T1 פיצ'רים שבורים** — מתחילים מבאג ה-FAQ (T1-1) ואז הצ'אט/OTP.
4. **T2 שלמות נתונים.**
5. **T3 ליטוש.**

כל תיקון: tsc → lint → build ירוק לפני commit. גיבוי אחרי כל קבוצה.
