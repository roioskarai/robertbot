# דוח אבטחה — בידוד דיירים, אימות וגבייה (multitenant-security-reviewer)

> נסרק: כל ה-API routes, admin/service-role client, middleware, webhooks, cron.
> סבב איתור-ותיעוד בלבד (לא תוקן).

## 🔴 קריטיים

### 1. Webhook של Grow מקבל קריאות לא-חתומות → תוכנית/חבילה בחינם
- **קובץ:** `app/src/lib/payments/grow-provider.ts:141-155` + `app/src/app/api/webhook/grow/route.ts:10-13`
- אימות חתימה רץ רק `if (secret)`. ה-`isConfigured()` בודק `GROW_USER_ID/PAGE_CODE/API_KEY` אך **לא** את ה-webhook secret. בלי הסוד — הנקודה מעבדת body שנשלט במלואו ע"י תוקף, ללא אימות.
- **ניצול:** `POST /api/webhook/grow` עם `cField1=<userId>&cField2=enterprise_monthly&status=1` → קובע לכל משתמש `plan=enterprise`. עם `cField2=pack_xl` → חבילות הודעות אינסופיות.
- **תיקון:** לדרוש `GROW_WEBHOOK_SECRET`; לדחות קריאה לא-חתומה (fail closed).

### 2. אימות חתימת Twilio ניתן לעקיפה (נאכף רק אם הכותרת קיימת)
- **קובץ:** `app/src/app/api/webhook/whatsapp/route.ts:34-40`
- `if (sig && process.env.TWILIO_AUTH_TOKEN)` — האימות רץ רק אם התוקף שולח כותרת חתימה. בלעדיה — ההודעה מעובדת ללא אימות (בניגוד ל-Meta שנכשל-סגור).
- **ניצול:** `POST` עם `From/To/Body/MessageSid` ללא חתימה → הזרקת הודעה לשיחת הדייר, תשובת Claude אמיתית על חשבונו, שריפת מכסה, prompt injection.
- **תיקון:** לאמת תמיד; לדחות (403) כשהכותרת חסרה.

### 3. נקודת "Downgrade" היא שדרוג תוכנית ללא תשלום
- **קובץ:** `app/src/app/api/billing/downgrade/route.ts:20-23`
- מקבל כל `plan` תקין וכותב ל-`users.plan` ללא בדיקה שזה נמוך יותר וללא תשלום.
- **ניצול:** משתמש basic/trial עושה `POST {"plan":"enterprise"}` → מקבל מגבלות enterprise בחינם.
- **תיקון:** לדחות אלא אם דרגת היעד נמוכה ממש מהנוכחית; שדרוג רק דרך checkout.

## 🟠 גבוהים

### 4. CRON_SECRET / אימות הרצת-סוכנים אופציונלי (fail open)
- **קבצים:** `app/src/app/api/agents/run/[agent]/route.ts:22-24`, `app/src/app/api/cron/trial/route.ts:13-15`
- `if (process.env.CRON_SECRET && ...)` — אם הסוד לא מוגדר, הנקודות פתוחות לכולם. הסוכנים רצים עם service-role על כל הדיירים.
- **ניצול:** `GET /api/agents/run/conversation-analyst?mode=live` ללא סוד → הרצת סוכן חוצה-דיירים, חשיפת `proposedActions` מנתוני דיירים אחרים, בזבוז טוקנים. `cron/trial` → השבתת בוטים ע"י כל אחד.
- **תיקון:** fail closed — אם הסוד חסר, 401/503.

### 5. הפעלה מחדש של בוט עוקפת מגבלת הבוטים בתוכנית
- **קובץ:** `app/src/app/api/bots/[id]/activate/route.ts:21-27` (+ PUT `bots/[id]/route.ts:62`, `connect-meta/route.ts:75`)
- מגבלת מספר הבוטים נאכפת רק ב-POST create. activate/update לא בודקים שוב.
- **ניצול:** משתמש basic (1 בוט) יוצר בוטים כבויים / מדרג למטה, ואז מפעיל כל אחד → ריצת בוטים מעבר לתוכנית.
- **תיקון:** לפני `active:true`, לספור בוטים פעילים ולדחות אם `>= PLAN_LIMITS[plan].bots`.

### 6. מנויים מבוטלים/מושהים עדיין מקבלים תשובות AI
- **קובץ:** `app/src/lib/whatsapp/inbound.ts:29-104`
- הפייפליין בודק `bot.active` ומכסה, אך לא את `users.subscription_status`. משתמש paused — הבוטים לא מושבתים.
- **תיקון:** לסרב לענות (ולסמן כבוי) כש-status הוא cancelled/paused; ב-`apply.ts` על subscription_paused גם להשבית בוטים.

### 7. מספר וואטסאפ ניתן לתפיסה ע"י כל דייר → חטיפת inbound
- **קובץ:** `app/src/app/api/bots/[id]/connect/route.ts:51-56`
- אין בדיקת ייחודיות ל-`bots.whatsapp_number` בין דיירים; ה-inbound מזהה בוט ע"י `numbersMatch` מטושטש (9 ספרות אחרונות).
- **ניצול:** דייר B קובע מספר שמתנגש עם A → הודעות לקוחות של A מנותבות ל-B.
- **תיקון:** unique constraint על `whatsapp_number` (+ `meta_phone_number_id`); השוואה מדויקת מנורמלת.

## 🟡 בינוניים

### 8. Stripe webhook פעיל גם כש-Grow הוא הספק הפעיל
- **קובץ:** `app/src/app/api/webhook/stripe/route.ts:9-22` — אם מוגדר Stripe כ-fallback בזמן `PAYMENT_PROVIDER=grow`, הנקודה נשארת חיה. (החתימה עצמה תקינה — defense-in-depth.)

### 9. נתיב תשובת נציג אנושי שולח וואטסאפ ללא מכסה/rate-limit
- **קובץ:** `app/src/app/api/conversations/[id]/reply/route.ts:24-62` — דייר מאומת יכול להציף הודעות ללא throttle (RLS תקין, אך אין הגבלת קצב).

### 10. זיכוי חבילה אדיטיבי ללא תקרה/idempotency
- **קובץ:** `app/src/lib/payments/apply.ts:41-55` — `pack_balance = current + messages` ללא event-id dedup; re-delivery מזכה פעמיים.

## ⚪ נמוכים
- **11.** אין rate-limit/lockout בכניסת אדמין ו-TOTP — `admin/login/route.ts`, `2fa/verify/route.ts:30-31` (brute-force).
- **12.** מינימום סיסמה signup=6 חלש מ-admin=8 — `auth/signup/route.ts:17`.

## ✅ נמצא תקין
RLS על כל הטבלאות (`schema.sql:112-146`); כל ה-routes למשתמש קוראים `getSessionUser()`; כל `/api/admin/*` קורא `requireAdmin()` (password+role+2FA חתום); חתימות Stripe/Meta נכשלות-סגור; idempotency של הודעות; decrement/increment אטומיים; service-role רק server-side.
