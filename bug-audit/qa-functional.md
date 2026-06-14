# דוח בדיקת באגים — Robert SaaS
**תאריך:** 2026-06-14  
**בודק:** qa-verifier  
**גרסה:** מבוסס על קוד ב-branch main (ריפו נקי, ללא שינויים)  
**כיסוי:** tsc + lint + build + סריקת קוד סטטית על כל דפי האפליקציה

---

> **הערה:** TSC/Lint/Build לא הורצו בפועל (אין הרשאת שרת מקומי), אולם הסריקה הסטטית מכסה
> את כל שגיאות הטיפוס, ה-import וה-API הגלויות לעין.

---

## באגים — מסודר מהחמור לקל

---

### BUG-01 — URL שגוי לצ'אט AI בדף Preview
**חומרה:** 🔴 קריטי  
**קובץ:** `src/app/preview/page.tsx:242`  
**תיאור:**  
הפונקציה `sendMsg()` קוראת ל-`/api/bots/preview/preview` — URL שאינו קיים. ה-route handler
נמצא ב-`/api/bots/[id]/preview` וה-`id` הדינמי מצפה לפרמטר בנתיב. הניסיון לגשת ל-
`preview/preview` יחזיר 404 בכל פעם שמשתמש שולח הודעה ידנית בדמו.  
**איך לשחזר:** פתח `/preview` → הקלד הודעה חופשית בשדה הטקסט → לחץ שלח → fetch נכשל.  
**תיקון מוצע:** שנה את ה-URL ל-`/api/bots/demo/preview` (ה-route handler תומך ב-inline `bot` בלי id) או הפרד endpoint ייעודי ל-preview ללא id.

---

### BUG-02 — אימות OTP ב-onboarding לא מחובר לשרת
**חומרה:** 🔴 קריטי  
**קובץ:** `src/app/onboarding/page.tsx:676–683`  
**תיאור:**  
כפתור "אמת קוד" ב-Step 5 (חיבור וואטסאפ) קורא ל-`toast("המספר אומת בהצלחה")` — ללא קריאה לשרת. קוד ה-SMS שהמשתמש הזין בשדה (שורה 680) לא נשלח לאף API. בתרחיש אמיתי הקוד לעולם לא מאומת, והמספר מסומן כמחובר רק אם השלים את ה-onboarding ללא תיקוף אמיתי.  
**איך לשחזר:** שלח קוד לאימות → הזן כל קוד ב-6 ספרות → לחץ "אמת קוד" → Toast מוצג אך אין POST ל-API.  
**תיקון מוצע:** הוסף state לשמירת ה-OTP המוזן, וקרא ל-`/api/bots/[id]/connect` עם `{ number, code }` בלחיצה.

---

### BUG-03 — הרשמה מקבלת סיסמה באורך 6 תווים, UI מבטיח 8
**חומרה:** 🟠 גבוה  
**קובץ:** `src/app/api/auth/signup/route.ts:17` ו-`src/app/onboarding/page.tsx:283`  
**תיאור:**  
ה-API מאשר סיסמה מ-6 תווים (`password.length < 6`), בעוד ה-UI מציג placeholder "לפחות 8 תווים". 
הסתירה גורמת לחוויית משתמש מבולבלת ועלולה לאפשר סיסמאות חלשות (6–7 תווים) שלא הוצגו כ"קצרות מדי".  
**איך לשחזר:** הרשמה עם סיסמה בת 7 תווים → API מאשר, אך המשתמש חשב שהיא לא תתקבל.  
**תיקון מוצע:** אחד את הבדיקה: שנה את ה-API ל-`< 8` (או ה-UI ל-"לפחות 6 תווים").

---

### BUG-04 — אימייל אדמין מקודד-קשה בקוד המקור
**חומרה:** 🟠 גבוה  
**קובץ:** `src/lib/admin-auth.ts:17`  
**תיאור:**  
`export const ADMIN_EMAIL = "roioskarai@gmail.com"` — כתובת מייל פרטית מקודדת בקוד שנכנס ל-GitHub.
כל מי שיוצר fork או רואה את הקוד יודע מי האדמין. בנוסף, שינוי האדמין דורש שינוי קוד ו-deploy.  
**איך לשחזר:** קרא את הקובץ ב-GitHub.  
**תיקון מוצע:** העבר ל-`process.env.ADMIN_EMAIL` ועדכן `.env.local` ו-Vercel env.

---

### BUG-05 — הכפתור "שכחת סיסמה?" לא מבצע איפוס סיסמה
**חומרה:** 🟠 גבוה  
**קובץ:** `src/app/login/page.tsx:124`  
**תיאור:**  
`onClick={() => toast("קישור לאיפוס סיסמה נשלח לאימייל שלך")` — אין קריאת API לשליחת מייל. 
המשתמש רואה toast כאילו נשלח מייל, אבל לא נשלח כלום. לא ניתן לאפס סיסמה.  
**איך לשחזר:** לחץ "שכחת סיסמה?" → Toast מוצג → לא מגיע מייל.  
**תיקון מוצע:** קרא ל-`supabase.auth.resetPasswordForEmail(form.email)` לפני ה-toast.

---

### BUG-06 — אפשרות "חם ואישי" בסגנון בוט לא נשמרת נכון
**חומרה:** 🟠 גבוה  
**קובץ:** `src/app/onboarding/page.tsx:31`  
**תיאור:**  
`STYLE_OPTIONS[3]` (אפשרות "חם ואישי") מוגדרת עם `value: "friendly"` — אותו ערך כמו option[0] 
("חברותי ונעים"). ה-`BotStyle` type תומך ב-`"friendly" | "professional" | "short"` בלבד, אין 
`"warm"`. המשתמש שבוחר "חם ואישי" למעשה בוחר את אותו סגנון כמו "חברותי ונעים" — ההבחנה 
הוויזואלית נעלמת ב-runtime.  
**איך לשחזר:** בחר "חם ואישי" ב-Step 4 → בדוק ב-DB: הסגנון נשמר כ-`friendly`, זהה לאפשרות הראשונה.  
**תיקון מוצע:** הוסף `"warm"` ל-BotStyle type ול-`buildSystemPrompt`, או מחק את option[3] ותשאיר 3 אפשרויות.

---

### BUG-07 — `sendReply` בדשבורד קורא `getElementById` ולא React state
**חומרה:** 🟠 גבוה  
**קובץ:** `src/app/dashboard/page.tsx:934`  
**תיאור:**  
`const input = document.getElementById("reply-input") as HTMLInputElement | null` — גישה ישירה ל-DOM
בתוך React. זה עוקף את state management ועלול להיכשל אם הרכיב טרם נטען, 
אם מועבר SSR, או אם ה-id כפול. כמו-כן, `input.value = ""` מרוקן את ה-DOM אך לא מעדכן state,
מה שיגרום ל-React להחזיר את הערך הקודם אם יגרם re-render.  
**איך לשחזר:** שלח הודעה ב-Inbox → עשה פעולה שגורמת re-render → שדה הטקסט עשוי לחזור לערך הקודם.  
**תיקון מוצע:** הוסף `useState` ל-reply input ו-`useRef` ל-input element במקום `getElementById`.

---

### BUG-08 — `confirm()` נמצא בדף Preview (לא תקין ב-SSR/Next.js)
**חומרה:** 🟠 גבוה  
**קובץ:** `src/app/preview/page.tsx:263`  
**תיאור:**  
`if (confirm("להפעיל את הבוט עכשיו?..."))` — שימוש ב-`window.confirm` שהוא Blocking UI, 
מיושן, ואינו ניתן לעיצוב. ב-Next.js App Router על שרת זה יזרוק. ב-client זה עובד 
אבל מנוגד לנורמות UX וחוסם את ה-thread.  
**איך לשחזר:** לחץ "הפעל בוט" → popup ישן של הדפדפן מוצג.  
**תיקון מוצע:** החלף ב-modal/dialog React או לפחות toast עם CTA.

---

### BUG-09 — היסטוריית שיחות משתמשת בנתוני mock קשיחים, לא בטעינת API
**חומרה:** 🟠 גבוה  
**קובץ:** `src/app/dashboard/page.tsx:641–646` (renderHistory)  
**תיאור:**  
`renderHistory()` מגדיר `const rows = [...]` עם 5 שורות hardcoded — לעולם לא נטענות שיחות אמיתיות. 
גם בדשבורד אמיתי מחובר Supabase, ההיסטוריה תציג תמיד את אותן 5 שורות הדמו.  
**איך לשחזר:** צור שיחות אמיתיות → עבור ל"היסטוריית שיחות" → יוצגו 5 שיחות Demo בלבד.  
**תיקון מוצע:** טען שיחות מ-`/api/conversations` עם status filter וצרף ל-state.

---

### BUG-10 — שמות/פרטים בדשבורד קשיחים (Demo user לא מוחלף)
**חומרה:** 🟠 גבוה  
**קובץ:** `src/app/dashboard/page.tsx:344,405,884–886`  
**תיאור:**  
ה-sidebar מציג "דני כהן" ו"מסלול מקצועי" (שורה 344). ה-overview מציג "בוקר טוב, דני" (405). 
הגדרות החשבון מציגות `defaultValue="דני כהן"` ו-`defaultValue="dani@gmail.com"` (884–886).  
אף אחד מהפרטים האלה לא נטען מה-session/API — כל משתמש אמיתי רואה "דני כהן" בשמו.  
**איך לשחזר:** התחבר עם כל חשבון → Sidebar מציג תמיד "דני כהן".  
**תיקון מוצע:** הוסף שדה `userName` ל-loadData, מלא מ-`/api/analytics` או session.

---

### BUG-11 — כפתורי "מרכז עזרה" ו"צ'אט תמיכה" בדשבורד לא עושים כלום
**חומרה:** 🟡 בינוני  
**קובץ:** `src/app/dashboard/page.tsx:915,919`  
**תיאור:**  
`onClick={() => toast("פותח את מרכז העזרה...")}` ו-`onClick={() => toast("פותח צ'אט תמיכה...")}` 
— שניהם מציגים toast אבל לא פותחים כלום. אין URL חיצוני, אין chat widget, אין העברה לדף.  
**איך לשחזר:** לחץ על "מרכז עזרה" → Toast מוצג, שום דבר לא נפתח.  
**תיקון מוצע:** הפנה ל-URL תמיכה חיצוני (Intercom/HelpDesk) או הסר עד שיהיה URL.

---

### BUG-12 — כפתור "הורד חשבונית" בחיוב לא מוריד כלום
**חומרה:** 🟡 בינוני  
**קובץ:** `src/app/dashboard/page.tsx:773`  
**תיאור:**  
`onClick={() => toast("החשבונית הורדה")}` — מציג toast אך אין קריאה ל-API להורדת PDF.  
**איך לשחזר:** לחץ "הורד" בטבלת החשבוניות → Toast "הורדה" ללא כל קובץ.  
**תיקון מוצע:** קרא לנקודת קצה של ספק התשלום (Stripe `/invoice.pdf` / Grow) להורדת חשבונית אמיתית.

---

### BUG-13 — כפתור "הוסף כפתור" בעמוד Templates אינו פונקציונלי
**חומרה:** 🟡 בינוני  
**קובץ:** `src/app/templates/page.tsx:322`  
**תיאור:**  
`<button className={c("add-btn-link")}>+ הוסף כפתור</button>` — אין `onClick`. לחיצה עליו לא עושה כלום.
המשתמש שמנסה להוסיף כפתור מותאם אישית ב"מצב כתוב בעצמי" לא יכול.  
**איך לשחזר:** עמוד Templates → מצב "כתוב בעצמי" → לחץ "+ הוסף כפתור" → אין תגובה.  
**תיקון מוצע:** הוסף state לניהול כפתורים והוסף `onClick` שמוסיף שדה קלט חדש.

---

### BUG-14 — Drag-and-drop ל-services ב-Onboarding הוא decoration בלבד
**חומרה:** 🟡 בינוני  
**קובץ:** `src/app/onboarding/page.tsx:544`  
**תיאור:**  
האלמנט `<span className={c("si-drag")} title="גרור לסידור מחדש">⠿</span>` מציג אינדיקטור גרירה
אבל אין שום event handler של drag-and-drop מחובר. הגרירה לא עובדת.  
**איך לשחזר:** Step 3 ב-onboarding → נסה לגרור שירות לסדר אחר → לא קורה כלום.  
**תיקון מוצע:** הסר את האינדיקטור עד שה-DND יוטמע, או טמע עם `HTML5 DnD API` / `@dnd-kit`.

---

### BUG-15 — אין ולידציה על שדות חובה ב-Onboarding Steps 2–5
**חומרה:** 🟡 בינוני  
**קובץ:** `src/app/onboarding/page.tsx:166–177`  
**תיאור:**  
הפונקציה `nextStep()` מתקדמת לשלב הבא ללא שום ולידציה (שם עסק ריק, שירותים ריקים, וכו').
אפשר ליצור בוט ללא שם עסק — `name` יהיה ריק, ה-API אמנם בודק, אבל ה-UI מציג
"הבוט שלך מוכן!" גם אחרי שה-API מחזיר שגיאה (ה-`catch` מדלג עליה שורה 234–236).  
**איך לשחזר:** ב-Step 2 השאר שם ריק → לחץ "המשך" → ממשיך לשלב 3. לחץ "סיום" → מציג "הצלחה" גם אם API נכשל.  
**תיקון מוצע:** הוסף ולידציה מינימלית: `if (!details.name.trim()) { toast("נא להזין שם עסק"); return; }` לפני nextStep.

---

### BUG-16 — reply-input ב-Inbox הוא `document.getElementById` ולא מאפשר פתיחה מחדש
**חומרה:** 🟡 בינוני  
**קובץ:** `src/app/dashboard/page.tsx:629`  
**תיאור:**  
`<input ... id="reply-input">` עם `onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}` —
אבל ה-input אינו מנוהל על-ידי React (אין `value`/`onChange`). זה uncontrolled input שגם 
קשה לאתחל לאחר שליחה.  
**תיקון מוצע:** הוסף `const [replyText, setReplyText] = useState("")` ו-`value={replyText}`.

---

### BUG-17 — `dangerouslySetInnerHTML` עם תוכן שהתקבל מ-AI (XSS פוטנציאלי)
**חומרה:** 🟡 בינוני  
**קובץ:** `src/app/preview/page.tsx:341`  
**תיאור:**  
`<div dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, "<br>") }} />` —  
`m.text` מגיע מ-Claude (AI), שעלול לכלול HTML. אם מחרוזת AI תכיל `<script>` או event handlers,
הם יבוצעו. בדף Preview זה פחות קריטי (אין לקוח אמיתי), אבל מהווה תבנית מסוכנת.  
**תיקון מוצע:** Sanitize את הפלט עם `DOMPurify` לפני הכנסה ל-innerHTML, או פרוד בלי dangerouslySetInnerHTML.

---

### BUG-18 — הערות גרסה `page.module.css` קיים אבל לא משומש
**חומרה:** 🟡 בינוני  
**קובץ:** `src/app/page.module.css` ו-`src/app/page.tsx:5`  
**תיאור:**  
`src/app/page.tsx` מייבא `./landing.module.css` (שורה 5), אבל קיים גם קובץ `src/app/page.module.css`.
זה לא שגיאה קריטית, אבל הקובץ `page.module.css` עלול להיות שאריה של Next.js starter שלא נמחקה
ולגרום לבלבול.  
**תיקון מוצע:** בדוק ומחק את `page.module.css` אם אינו בשימוש.

---

### BUG-19 — תצוגת בוטים בדשבורד תציג ריק כשאין בוטים (לא demo)
**חומרה:** 🟡 בינוני  
**קובץ:** `src/app/dashboard/page.tsx:150`  
**תיאור:**  
`setBots(b.bots?.length ? b.bots : [])` — אם המשתמש מחובר ואין לו בוטים, ה-state יוגדר ל-`[]`.
הרשת `bots-grid` תציג רק את כרטיס "+ הוסף בוט חדש". אין empty-state מסביר, הנחיה, או CTA ברורה.
**תיקון מוצע:** הוסף empty state מסודר כשה-`bots` array ריקה אחרי ה-load.

---

### BUG-20 — RPC `decrement_pack_balance` ו-`increment_usage` חסרות בסכמה הפומבית
**חומרה:** 🟡 בינוני  
**קובץ:** `src/lib/whatsapp/inbound.ts:150,187`  
**תיאור:**  
`supabase.rpc("decrement_pack_balance", ...)` ו-`supabase.rpc("increment_usage", ...)` נקראות
ב-runtime, אך חיפוש ב-`supabase/schema.sql` ו-`supabase/agents.sql` (הסכמות המתועדות) לא מצא
את ה-RPC functions. אם פונקציות אלה לא קיימות ב-DB, כל שימוש ב-Pack ב-Production יפסיק לעבוד בשקט.  
**תיקון מוצע:** ודא שה-migrations כוללות `CREATE FUNCTION decrement_pack_balance` ו-`CREATE FUNCTION increment_usage` (Migration 0004 כנזכר ב-comment).

---

### BUG-21 — ה-Landing page מציג כפתור "צפה בהדגמה" שמגלגל רק לsection (לא preview אמיתי)
**חומרה:** ⚪ נמוך  
**קובץ:** `src/app/page.tsx:126`  
**תיאור:**  
`<a href="#how" onClick={scrollTo("#how")}>צפה בהדגמה</a>` — הכפתור גולל לסקשן "איך זה עובד" 
ולא לדמו אינטרקטיבי. ה-CTA מטעה; משתמש ש"רוצה לראות הדגמה" מצפה לדף `/preview`.  
**תיקון מוצע:** שנה ל-`<Link href="/preview">צפה בהדגמה</Link>` או שנה את הטקסט ל-"ראה איך זה עובד".

---

### BUG-22 — "תנאי שימוש" ו"פרטיות" ב-Footer מפנים לאותו URL
**חומרה:** ⚪ נמוך  
**קובץ:** `src/app/page.tsx:421–422`  
**תיאור:**  
```
<Link href="/legal">תנאי שימוש</Link>
<Link href="/legal">פרטיות</Link>
```
שני הקישורים מפנים לאותו URL. דף `/legal` תומך ב-tabs, אבל אין query param שבוחר tab ספציפי.
משתמש שלוחץ על "פרטיות" נוחת על tab "תנאי שימוש".  
**תיקון מוצע:** הוסף `?tab=privacy` ל-URL ה-Privacy, וגרום ל-`/legal` לקרוא את ה-searchParam להגדרת tab ראשוני.

---

### BUG-23 — אין aria-label על כפתורי ×  למחיקה ב-onboarding/dashboard
**חומרה:** ⚪ נמוך  
**קובץ:** `src/app/onboarding/page.tsx:565,593` ; `src/app/dashboard/page.tsx:544`  
**תיאור:**  
כפתורי המחיקה (`<span onClick={...}>×</span>`) אינם כפתורים (`<button>`) ואין להם `aria-label`.
קורא מסך לא יזהה אותם. בנוסף, `<span>` ללא `role="button"` אינו accessible לניווט מקלדת.  
**תיקון מוצע:** החלף ל-`<button aria-label="מחק שירות" ...>×</button>`.

---

### BUG-24 — Toast component עלולה לאבד timeout בין renders
**חומרה:** ⚪ נמוך  
**קובץ:** `src/components/Toast.tsx:9–12`  
**תיאור:**  
```
window.clearTimeout((toast as unknown as { _t?: number })._t);
(toast as unknown as { _t?: number })._t = window.setTimeout(...)
```
שמירת ה-timeout ref כ-property על פונקציה `useCallback` היא pattern לא סטנדרטי. `useCallback`  
עלול ליצור reference חדש ב-re-render, מה שישבור את ה-clearTimeout. בנוסף, `window.clearTimeout` / 
`window.setTimeout` לא נבדקים לסביבת server.  
**תיקון מוצע:** השתמש ב-`useRef<ReturnType<typeof setTimeout>>` לשמירת ה-timeout.

---

### BUG-25 — Onboarding — ולידציית אימייל חסרה ב-Client-side
**חומרה:** ⚪ נמוך  
**קובץ:** `src/app/onboarding/page.tsx:114–130`  
**תיאור:**  
`doSignup()` שולח בקשה ללא ולידציה מקומית: ניתן לשלוח שם ריק / אימייל לא חוקי / סיסמה קצרה.
השרת יחזיר שגיאה, אבל ה-catch block (שורה 122–124) מציג toast ו-**ממשיך** לאונבורדינג גם אחרי שגיאה.  
**איך לשחזר:** הכנס אימייל לא חוקי → Toast "ממשיכים במצב הדגמה" → עוברים ל-Wizard בלי חשבון.  
**תיקון מוצע:** הוסף ולידציה לפני הקריאה, ואל תמשיך ל-`setScreen("ob")` בעקבות שגיאות אמיתיות (רק ב-503/network error לדמו).

---

### BUG-26 — Billing: ביטול בדף Cancel מגדיר DB מיידית ל-"cancelled" (לא period-end)
**חומרה:** ⚪ נמוך  
**קובץ:** `src/app/api/billing/cancel/route.ts:25`  
**תיאור:**  
ה-API מעדכן `subscription_status: "cancelled"` באופן מיידי (שורה 25–28), גם אחרי שהדפדפן
הסביר שהבוט ממשיך עד סוף תקופת החיוב. ה-Stripe-side מבצע `cancel_at_period_end: true`, 
אך ה-DB status משתנה מיד. לוגיקה שמסתמכת על `subscription_status === 'active'` תשבר תוך שניות מהביטול.  
**תיקון מוצע:** הגדר `subscription_status = 'cancelling'` (enum חדש) עד שמגיע Webhook `subscription_cancelled` מ-Stripe/Grow.

---

## טבלת סיכום

| חומרה | מספר באגים |
|-------|------------|
| 🔴 קריטי | 2 |
| 🟠 גבוה | 8 |
| 🟡 בינוני | 9 |
| ⚪ נמוך | 7 |
| **סה"כ** | **26** |
