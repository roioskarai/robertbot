# Robert — WhatsApp Bot SaaS

פלטפורמת SaaS להקמת בוטים ל-WhatsApp לעסקים בישראל ("Shopify לבוטים").
נבנתה מקבצי העיצוב שבתיקיית `robertbot/` — Next.js 14 (App Router) + TypeScript,
עם Supabase, Stripe, Twilio, Claude (Anthropic) ו-Resend.

## הרצה מקומית

```bash
cd robertbot/app
npm install
npm run dev        # http://localhost:3000
```

האפליקציה **עולה ורצה עם מפתחות placeholder** (ראה `.env.local`). במצב זה
ה-Dashboard וה-Preview עובדים על **נתוני הדגמה**, וקריאות חיצוניות מחזירות
הודעת שגיאה בעברית במקום לקרוס. עם מפתחות אמיתיים המערכת עובדת מקצה לקצה.

## מסכים

| נתיב | תיאור |
|---|---|
| `/` | דף נחיתה |
| `/onboarding` | הרשמה + אשף הקמת בוט (5 שלבים) |
| `/dashboard` | אזור אישי — סקירה, בוטים, Inbox, היסטוריה, אנליטיקס, תבניות, מנוי, חנות, חשבון, תמיכה |
| `/preview` | סימולטור בוט (תרחישים + טקסט חופשי מול Claude) |
| `/templates` | ספריית תבניות שיחה |
| `/legal`, `/cancel` | משפטי + זרימת ביטול/שימור |

## משתני סביבה

ראה `.env.example`. להפעלה מלאה יש למלא ב-`.env.local`:

- **Supabase** — צור פרויקט, הרץ את `supabase/schema.sql` ב-SQL Editor, והעתק
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Stripe** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
  Webhook אל `/api/webhook/stripe`.
- **Twilio** — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`
  (ו-`TWILIO_VERIFY_SERVICE_SID` ל-OTP). Webhook נכנס אל `/api/webhook/whatsapp`.
- **Anthropic** — `ANTHROPIC_API_KEY` (מפעיל את מנוע ה-AI ואת ה-Preview).
- **Resend** — `RESEND_API_KEY`, `RESEND_FROM` (מיילים: welcome / OTP / חידוש / סיום ניסיון).

## מבנה

- `src/app` — עמודים (CSS Modules לכל עמוד, טוקנים משותפים ב-`globals.css`, RTL)
- `src/app/api` — כל ה-API routes (auth, bots, conversations, analytics, billing, webhooks, cron)
- `src/lib` — `claude.ts` (buildSystemPrompt + מנוע AI), `plans.ts`, `stripe.ts`, `twilio.ts`,
  `resend.ts`, `supabase/*`, `auth.ts`, `rate-limit.ts`, `types.ts`
- `supabase/schema.sql` — טבלאות + RLS + טריגרים
- `src/middleware.ts` — רענון session והגנת ראוטים (מדלג במצב הדגמה ללא Supabase אמיתי)

## Cron — ניסיון

`GET /api/cron/trial?secret=<CRON_SECRET>` — תזכורת יום-5 וכיבוי בוט בתום הניסיון.
מומלץ להריץ יומית (Vercel Cron).
