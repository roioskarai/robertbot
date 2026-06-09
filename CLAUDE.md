# CLAUDE.md — מדריך-על לפרויקט Robert 🤖

> קובץ זה נטען אוטומטית לכל סשן של Claude Code שעובד מתיקיית השורש של הריפו.
> הוא מתאר את **כל מערכת הסוכנים** ואת **חוקי התפעול המחייבים**. כל סוכן וכל
> סשן חייבים לקרוא ולציית לחלק "חוקי תפעול מחייבים" שלמטה.
>
> לארכיטקטורה הטכנית המעמיקה של האפליקציה עצמה — ראה [app/CLAUDE.md](app/CLAUDE.md).

---

## מה זה Robert

SaaS שמאפשר לעסק קטן בישראל לבנות **בוט וואטסאפ חכם בלחיצת כפתור, תוך 10 דקות**,
ללא ידע טכני. הבוט עונה ללקוחות, קובע תורים ומוכר 24/7.

- **Stack:** Next.js 14 (App Router) · Supabase (PostgreSQL + Auth + RLS) · Vercel ·
  Stripe · Twilio WhatsApp · Anthropic Claude · Resend. TypeScript לכל אורך הדרך.
- **קהל יעד:** עסקים קטנים — מספרות, קוסמטיקאיות, מסעדות, קליניקות, בעלי מקצוע, חנויות.
- **מחירים:** בסיסי ₪99 · מקצועי ₪199 · עסקים ₪399 · ארגוני ₪699 (חודשי) · 7 ימי ניסיון חינם.
- **דומיין:** robertbot.co.il · **GitHub:** `RoiOskar/robertbot` (branch `main`).
- **בעלים:** משתמש יחיד, **לא-מתכנת** — לכן כל הסוכנים מדברים עברית ומסבירים בפשטות.
- **חזון (roadmap שלב 4):** "המערכת מנהלת את עצמה" עם סוכני AI. יעד ₪15K+/חודש, ~0 עבודה ידנית.

---

## ⚠️ חוקי תפעול מחייבים (כל סוכן מציית)

### 🔐 1. אבטחת מידע — אסור לחשוף מפתחות/סודות, גם ב-GitHub
- **לעולם לא** לכתוב מפתח/סיסמה/טוקן אמיתי לתוך קוד, תיעוד, או הודעת commit.
- כל הסודות חיים **אך ורק** ב-`app/.env.local` (מקומי) וב-Environment Variables של
  Vercel (פרודקשן). הקובץ `.env.local` **מוגן** ב-`.gitignore` (`*.env.local`) —
  לעולם לא להסיר את ההגנה הזו ולעולם לא לעשות `git add -f` עליו.
- רק משתנים בקידומת `NEXT_PUBLIC_*` מותרים בצד הלקוח. כל השאר — שרת בלבד.
- **לפני כל commit:** לוודא שאין סוד ב-staged. ריצה מהירה:
  `git diff --cached | Select-String -Pattern "sk_live_|sk-ant-|whsec_|service_role|AUTH_TOKEN"` —
  אם יש התאמה, **לעצור** ולנקות לפני push.
- אם סוד דלף בטעות → לבטל אותו (revoke) בספק ולהנפיק חדש; מחיקה מ-git לבדה לא מספיקה.
- אחראי-על: הסוכן `cyber-guardian` (ראה רוסטר למטה).

### 💾 2. גיבוי — כל שינוי בפרויקט מגובה ל-GitHub
- אחרי כל יחידת עבודה משמעותית (פיצ'ר/תיקון/קובץ חדש), **לבצע commit + push** ל-
  `origin main`. אסור להשאיר עבודה שהושלמה רק על הדיסק המקומי.
- מה **לא** מגבים (כבר ב-`.gitignore`): `node_modules`, `.next`, `.env*.local`, `.vercel`.
- הודעות commit בעברית או אנגלית, תיאוריות. לא לדלג על hooks, לא לעשות force-push.
- שלבי הגיבוי המדויקים (כולל הערת PATH ל-git) — בחלק "פקודות Git / גיבוי" למטה.

### ✅ 3. אימות לפני "סיימתי"
- כל שינוי קוד עובר `npx tsc --noEmit` → `npm run lint` → `npm run build` (מתוך `app/`),
  והכול ירוק לפני שמכריזים שעובד ולפני push. לא מצהירים "תוקן" בלי להריץ.
- אחראי-על: הסוכנים `qa-verifier` ו-`site-keeper`.

---

## מבנה הריפו

```
robertbot/                 ← שורש הריפו + git repo. כאן יושב הקובץ הזה.
├─ .claude/agents/         ← 19 סוכני Claude Code (ראה רוסטר)
├─ robert-*.html           ← קבצי העיצוב המקוריים (מקור אמת לעיצוב — לא לשנות)
├─ robert-roadmap.html     ← תוכנית הדרך (4 שלבים)
├─ robert-claude-code-prompt.md  ← מסמך האפיון המקורי
└─ app/                    ← אפליקציית Next.js (כל הקוד הרץ)
   ├─ CLAUDE.md            ← ארכיטקטורת האפליקציה המעמיקה
   ├─ src/lib/agents/      ← סוכני התפעול הרצים (runner, analyst, retention, ...)
   ├─ src/app/api/agents/  ← נקודות הקצה להרצת סוכנים
   ├─ supabase/*.sql       ← סכמת מסד הנתונים (schema.sql + agents.sql)
   └─ .env.local           ← סודות (מוגן, לא ב-git)
```

---

## מערכת הסוכנים — קודקוד + 3 שכבות (20 סוכנים)

> כל סוכני ה-`.claude/agents/` רצים **מיד** בתוך Claude Code, אפס תשתית. פותחים את
> Claude Code בתיקיית הפרויקט ומדברים בעברית; הסוכן הנכון נבחר אוטומטית לפי הבקשה,
> או קוראים לו בשם. `/agents` מציג את כולם.

### 👑 קודקוד — מנהל הפרויקט (מתחילים כאן לכל יוזמה גדולה)
| סוכן | תפקיד |
|---|---|
| `project-director` | **המנהל-על.** מכיר את כל הסוכנים, מתכנן את הפרויקט מההתחלה עד הסוף, מתעדף, ומתאם את כולם — הכול עובר דרכו. מפיק תוכנית-על עם האצלה מסודרת לכל סוכן, ואוכף את חוקי האבטחה/גיבוי/אימות. אינו מבצע קוד בעצמו — מתכנן ומתאם. |

### שכבה A — 13 "עובדים וירטואליים" (מדברים איתם)
כל אחד = תפקיד/מחלקה בחברה. הבעלים מאציל לו עבודה בשפה פשוטה.

| סוכן | כמו לשכור | מה עושה |
|---|---|---|
| `marketing-strategist` | צוות שיווק | קמפיינים, מודעות Meta/Google, פוסטים, לוח תוכן |
| `creative-studio` | אולפן קריאייטיב | **פרומפטים מוכנים לסרטונים/תמונות** (Sora/Veo/Midjourney), סטוריבורד |
| `content-seo` | קופירייטר | מאמרי בלוג, ניוזלטרים, תסריטים, קידום בגוגל |
| `competitor-scout` | אנליסט שוק | מחקר מתחרים (WebSearch) → טבלת השוואה + הזדמנויות |
| `brand-guardian` | מנהל מותג | קול וטון, הנחיות ויזואליות, שמירת אחידות |
| `sales-closer` | איש מכירות | תסריטי מכירה, התנגדויות, הצעות מחיר, מעקב לידים |
| `customer-support` | נציג שירות | תשובות מוכנות, FAQ, מאמרי עזרה, תבניות |
| `finance-billing` | מנהל כספים | **מעקב סליקות/חיובים**, חורים בגבייה, כלכלת יחידה, תמחור |
| `data-analyst` | אנליסט דאטה | **שיפור איסוף דאטה על לקוחות**, פילוח, KPI, פירוש מספרים |
| `cyber-guardian` | מומחה אבטחה | סריקת חורים, מפתחות חשופים, `npm audit`, הגנת מידע, אכיפת חוק האבטחה למעלה |
| `legal-privacy` | עו"ד (עזר) | תקנון, מדיניות פרטיות, חוזים, GDPR/חוק הגנת הפרטיות |
| `strategy-advisor` | יועץ/שותף | אסטרטגיה, תעדוף, go-to-market, הכנה למשקיעים |
| `site-keeper` | מנהל אתר | **כל הקמת ותחזוקת האתר** — באגים, deploy, ביצועים; מתאם את שכבה B |

### שכבה B — 6 סוכני הנדסה (מומחי קוד; `site-keeper` מתאם אותם)
| סוכן | תחום |
|---|---|
| `supabase-architect` | סכמה, RLS, migrations, triggers — בידוד multi-tenant |
| `api-route-builder` | route handlers ב-Next.js לפי הקונבנציות הקיימות |
| `integrations-engineer` | Twilio/Stripe/Resend — אימות webhook, idempotency |
| `bot-prompt-engineer` | כיוונון הבוטים — `buildSystemPrompt`, `[BUTTONS]`/`[HANDOFF]` |
| `multitenant-security-reviewer` | סקירת קוד עמוקה לדליפות RLS/סודות |
| `qa-verifier` | מריץ tsc + lint + build, בודק demo mode |

### שכבה C — סוכני תפעול רצים (קוד ב-`app/src/lib/agents/`)
סוכנים אוטומטיים שרצים על השרת/cron ומנהלים את ה-SaaS. **עיקרון: draft-only** —
לעולם לא משנים בוט חי ולא שולחים כסף/הודעה ללקוח ישירות; הם כותבים `proposed_actions`
לאישור אנושי. כל ריצה נרשמת בטבלת `agent_runs` ו-idempotent ליום.

| רכיב | קובץ | תפקיד |
|---|---|---|
| Runner | `app/src/lib/agents/runner.ts` | תשתית: קריאת Claude (`callClaude`), פרסור JSON (`extractJson`), לוגינג ל-`agent_runs`, dry-mode, fallback ב-demo |
| Registry | `app/src/lib/agents/registry.ts` | מיפוי שם→סוכן עבור ה-route וה-orchestrator |
| מנתח שיחות | `conversation-analyst.ts` | מנתח שיחות כל הבוטים → טיוטות שיפור prompt+FAQ |
| שימור | `retention.ts` | מזהה סיכון נטישה → טיוטות הצעות שימור (draft-only) |
| ידע | `knowledge.ts` | `extractBusinessKnowledge` — טקסט עסק → description+services+faq (אונבורדינג) |
| מנצח | `orchestrator.ts` | מריץ את הסוכנים יומית + דוח יומי לבעלים (Resend) |

**נקודות קצה:**
- `GET /api/agents/run/[agent]?secret=CRON_SECRET&mode=dry|live` — מריץ סוכן/orchestrator
  (מאומת ב-`CRON_SECRET`, גם דרך `Authorization: Bearer` של Vercel Cron).
- `POST /api/agents/knowledge` — סוכן הידע (מאומת login).
- **Cron:** `app/vercel.json` מתזמן את ה-orchestrator יומית ב-07:00 UTC.
- **DB:** להריץ את `app/supabase/agents.sql` ב-Supabase (אחרי `schema.sql`) ליצירת `agent_runs`.

---

## איך התפעול היום-יומי רץ חלק

0. **יוזמה גדולה? מתחילים מהקודקוד** — לכל מטרה רב-שלבית פונים תחילה ל-`project-director`;
   הוא בונה תוכנית-על ומאציל לסוכנים הנכונים בסדר הנכון. הכול עובר דרכו.
1. **הבעלים מאציל** — פותח Claude Code ומבקש מ"עובד" וירטואלי (למשל *"קריאייטיב,
   תן 3 פרומפטים לסרטון"* / *"בדיקת מתחרים, מי מתחרה בישראל?"*), או נותן ל-`project-director` לרכז.
2. **בנייה/תיקון באתר** — מבקשים מ-`site-keeper`; הוא מאתר, מתקן, מאציל למומחי שכבה B
   במידת הצורך, ו**מאמת** (tsc/lint/build) לפני שמכריז שגמר.
3. **אבטחה** — `cyber-guardian` סורק תקופתית ולפני כל שחרור; אוכף את חוק הסודות.
4. **גיבוי** — בסוף כל שינוי: commit + push ל-GitHub (אחרי בדיקת סודות). ראה למטה.
5. **אוטומציה** — שכבה C (orchestrator) רצה ברקע יומית ושולחת דוח עם הצעות לאישור.

---

## פקודות Git / גיבוי

> **הערת סביבה (Windows/PowerShell):** `git` מותקן דרך scoop ולא תמיד ב-PATH של
> ה-shell. רענן PATH פעם אחת בתחילת הפקודה:
> ```powershell
> $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
> ```
> אם עדיין לא נמצא: `C:\Users\רועי\scoop\apps\git\current\cmd\git.exe`.

זרימת גיבוי סטנדרטית (מתוך שורש הריפו):
```powershell
git status --short                 # מה השתנה
git diff --cached                  # לבדוק שאין סוד לפני commit (אחרי add)
git add -A
git commit -m "תיאור השינוי"
git push origin main
```
- **אסור:** `git add -f .env.local` · force-push · `--no-verify` · commit עם סוד.
- `node_modules`/`.next`/`.env*.local`/`.vercel` כבר ב-`.gitignore` — לא להסיר.

---

## משתני סביבה (כולם ב-`.env.local` / Vercel בלבד — אף פעם לא ב-git)

Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
· Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
· Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`
· Anthropic: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_AGENT_MODEL` (אופציונלי)
· Resend: `RESEND_API_KEY`, `RESEND_FROM`
· אפליקציה/סוכנים: `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `OWNER_EMAIL` (יעד הדוח היומי)

התבנית המלאה (ערכים ריקים, בטוח ל-git): [app/.env.example](app/.env.example).

---

## פקודות פיתוח (מתוך `app/`)
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")  # אם npm לא נמצא
npm run dev      # שרת פיתוח http://localhost:3000
npm run build    # build מלא (tsc + eslint + next build)
npm run lint     # ESLint
npx tsc --noEmit # type-check מהיר
```
