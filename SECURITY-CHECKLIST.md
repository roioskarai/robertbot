# SECURITY-CHECKLIST.md — צ'קליסט אבטחה קבוע ל-Robert

> קובץ זה נוצר בעקבות אירוע אבטחה קריטי (זליגת סשן לקוח↔אדמין, יולי 2026).
> **חובה** לעבור על החלק "תרחישי Cross-Role" לפני כל שחרור שנוגע ב-auth, middleware,
> קוקיז, RLS, או פאנל האדמין. תרחישים אלו נבדקים **בזרימה חיה** — לא רק בקריאת קוד.

---

## 1. פוסט-מורטם — אירוע זליגת סשן לקוח↔אדמין

### מה קרה
לקוח רגיל (role=`tenant`) התחבר למערכת הלקוח. כשניגש ל-`/admin`, הפאנל הציג "לא מחובר",
אבל בקונטקסט האדמין היה סשן פעיל עם המייל של הלקוח. בנוסף: אי אפשר היה להתחבר לאדמין
כשטאב לקוח היה פתוח באותו דפדפן.

### שורש הבעיה
מערכת הלקוח ופאנל האדמין חלקו **קוקי סשן יחיד** של Supabase (`sb-<ref>-auth-token`):
- `client.ts` / `server.ts` נוצרו ללא `cookieOptions.name` → שם קוקי ברירת מחדל אחד.
- גם `POST /api/auth/login` וגם `POST /api/admin/login` קראו ל-`signInWithPassword` על אותו
  namespace של קוקי.
- טאב לקוח פתוח מריץ `autoRefreshToken` ברקע ודורס את סשן האדמין שנכתב זה עתה → "האדמין לא
  מצליח להתחבר".
- הרשאת האדמין נאכפה רק ב-layout (`requireAdmin()`), בעוד ה-middleware בדק ל-`/admin` רק
  *שקיים משתמש* (לא role) → לקוח מחובר "עבר" את ה-middleware, וה-UI קרא את הסשן שלו.

### התיקון (יולי 2026)
הפרדת namespace מלאה: קוקי אדמין ייעודי `rb-admin-auth` (דרך `cookieOptions.name`, שהופך גם ל-
`storageKey`), factory נפרד `admin-session.ts`, ובדיקת role בצד-שרת ב-middleware לנתיבי `/admin`.
שני הסשנים חיים במקביל ולא דורסים זה את זה.

### 🔑 למה הבדיקות הקודמות פספסו — והלקח הקבוע
1. **נבדק קוד סטטי, לא זרימת סשן חיה.** סקירות קודמות אימתו ש-`requireAdmin()`/RLS "נראים
   תקינים" בקוד, אבל אף פעם לא הריצו **לקוח אמיתי מחובר → ניסיון גישה לאדמין** בדפדפן/HTTP אמיתי.
   שכבת האימות הייתה נכונה; שכבת ה-**קוקי המשותף** מתחתיה לא נבדקה כי בדיקת קוד לא חושפת אותה.
2. **התרחיש cross-role לא היה ברשימה.** בדקו "אדמין ניגש לאדמין" ו"לקוח ניגש ללקוח", אבל לא
   "לקוח ניגש לאדמין" ולא "אדמין + לקוח באותו דפדפן".
3. **הנחת שכבה יחידה.** הונח שגייט אחד (layout) מספיק; לא נבדק מה קורה *מתחת* לו (מאיפה מגיע הסשן).

**הלקח:** כל בדיקת auth חייבת לכלול תרחישי cross-role **בהרצה חיה** (סעיף 2), ולא להסתפק ב-
"הקוד נראה תקין".

---

## 2. תרחישי Cross-Role — חובה בכל שחרור שנוגע ב-auth/admin/cookies/RLS

מריצים **בזרימה חיה** (שרת dev + HTTP אמיתי). סקריפט אוטומטי: ראה סעיף 3.

| # | תרחיש | תוצאה נדרשת |
|---|---|---|
| 1 | לקוח מחובר → `GET /admin`, `/admin/users`, `/admin/stats` | redirect ל-`/admin/login`, **אפס** דאטת אדמין נטענת, קוקי הלקוח נשאר |
| 2 | קוקי לקוח → `GET /api/admin/users`, `/api/admin/stats`, `PATCH /api/admin/users/[id]` | כולם **403** |
| 3 | JWT של לקוח → Supabase REST ישיר על `admin_audit_log`, `system_settings` | ריק/נדחה (RLS `is_admin()`) |
| 4 | לקוח מחובר (טאב פתוח, auto-refresh) **+** אדמין מתחבר + 2FA באותו דפדפן | שני הסשנים תקפים במקביל; קוקים נפרדים (`sb-*` ו-`rb-admin-auth`) |
| 5 | logout אדמין | מנקה **רק** `rb-admin-auth` + `robert_admin_2fa`; סשן הלקוח שורד. logout לקוח → הפוך |
| 6 | הופכים אדמין ל-`tenant` ב-DB | בבקשה הבאה ל-`/admin` → redirect; API אדמין → 403 (נאכף כל בקשה, לא רק בהתחברות) |

**עיקרון-על:** הרשאת אדמין נקבעת **תמיד** לפי `users.role` ב-DB, לעולם לא לפי "מי מחובר עכשיו
בדפדפן" ולא לפי metadata שהמשתמש יכול לערוך.

### תוצאת ההרצה האחרונה (2026-07-13)
**24/24 עברו.** קוקי לקוח = `sb-<ref>-auth-token`, קוקי אדמין = `rb-admin-auth` — namespaces
נפרדים, מתקיימים במקביל. כל 6 התרחישים ירוקים.

---

## 3. סקריפט הבדיקה האוטומטי
בדיקת cross-role חיה: יוצרת משתמשי לקוח+אדמין זמניים (service role), מריצה את זרימות ה-
login/2FA/logout האמיתיות מול שרת ה-dev, מוודאת בידוד, ומנקה אחריה. להריץ מול `npm run dev`
(ב-dev הקוקי `secure=false` אז עובד על http://localhost). לשמור/לשחזר את הסקריפט מתיקיית ה-
scratchpad של הסשן לפני הרצה (לא נשמר בריפו — יוצר משתמשים).

---

## 4. סקירה תקופתית (לפני כל שחרור)
- [ ] **סודות:** `git diff --cached | Select-String "sk_live_|sk-ant-|whsec_|service_role|AUTH_TOKEN|rk_live_"` — ריק.
- [ ] `.env.local` לא ב-staged; אף קובץ `_*.mjs`/סקריפט בדיקה זמני לא ב-commit.
- [ ] **תלויות:** `npm audit --omit=dev` — לתעד ממצאים. (ידוע: `postcss<8.5.10` דרך `next` —
      moderate, XSS ב-stringify של CSS, לא נצֹיל בזרימת ה-SSR שלנו; ה-"תיקון" מוריד את Next — לא לפעול.)
- [ ] **RLS:** כל טבלת אדמין (`admin_audit_log`, `system_settings`, `payment_events`) — SELECT מוגן
      ב-`is_admin()`, ואין policy של INSERT/UPDATE/DELETE ל-`authenticated`/`anon` (כתיבה רק service-role).
- [ ] **API אדמין:** כל route תחת `/api/admin/**` עובר `requireAdmin()` או `requirePermission()`.
      חריגים מותרים: `login` (עושה בדיקת role בעצמו) ו-`logout`.
- [ ] **בידוד סשן:** אין route של אדמין שקורא ל-`getSessionUser`/`createClient` הלקוחיים; אדמין
      קורא רק ל-`getAdminSessionUser`/`createAdminServerClient`.
- [ ] **webhooks:** אימות חתימה ל-Twilio, Grow, Stripe (signature verification) פעיל.
- [ ] תרחישי Cross-Role (סעיף 2) — ירוקים.

---

## 5. חוב אבטחה ידוע (לא חוסם, לתעדוף)
- **Rate-limit מבוזר (M3):** ה-rate-limit היום in-memory (single-instance). לפרודקשן רב-מופעים
  → Upstash Redis / Supabase. רלוונטי ל-login, webhooks, PATCH אדמין.
- **חיטוי `q` ב-PostgREST `.or()`:** קלט חיפוש שנכנס למחרוזת `.or()` חייב חיטוי (`,` `(` `)` `%`)
  לפני בנייה, אחרת אפשר לשבור את דקדוק ה-filter. (מיושם ב-`GET /api/admin/users`.)
- **`guardPublicMaintenance`:** אחרי הפרדת הסשנים, אדמין שמחובר רק לפאנל (לא כלקוח) יישלח ל-
  `/maintenance` בדפים ציבוריים. מקובל; אם רוצים bypass — להוסיף בדיקת `getAdminSessionUser` שם.
- **Error monitoring (Sentry):** עדיין לא מותקן — לתפוס תקלות בפרודקשן לפני שהלקוח מתלונן.
