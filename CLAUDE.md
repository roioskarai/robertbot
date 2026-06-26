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
- אחראי-על: הסוכן `security` (ראה רוסטר למטה).

### 💾 2. גיבוי — כל שינוי בפרויקט מגובה ל-GitHub
- אחרי כל יחידת עבודה משמעותית (פיצ'ר/תיקון/קובץ חדש), **לבצע commit + push** ל-
  `origin main`. אסור להשאיר עבודה שהושלמה רק על הדיסק המקומי.
- מה **לא** מגבים (כבר ב-`.gitignore`): `node_modules`, `.next`, `.env*.local`, `.vercel`.
- הודעות commit בעברית או אנגלית, תיאוריות. לא לדלג על hooks, לא לעשות force-push.
- שלבי הגיבוי המדויקים (כולל הערת PATH ל-git) — בחלק "פקודות Git / גיבוי" למטה.

### ✅ 3. אימות לפני "סיימתי"
- כל שינוי קוד עובר `npx tsc --noEmit` → `npm run lint` → `npm run build` (מתוך `app/`),
  והכול ירוק לפני שמכריזים שעובד ולפני push. לא מצהירים "תוקן" בלי להריץ.
- אחראי-על: הסוכן `qa-operations`.

### 🔑 4. שרשרת אישורים — אין פעולה רגישה בלי אישור מפורש
- שום deploy, שינוי מסד נתונים, פעולה הרסנית, או שינוי פרודקשן לא מתבצע בלי שהבעלים
  מקליד את משפט האישור המדויק:
  - `APPROVED FOR PRODUCTION DEPLOYMENT` — לכל deploy / שחרור לפרודקשן.
  - `APPROVED - DATABASE` — לכל שינוי סכמה/נתונים (migrations, כתיבות `mcp__supabase`).
  - `APPROVED - PRODUCTION` — לכל שינוי אחר שמשפיע על פרודקשן.
- עד שהמשפט המתאים ניתן, הסוכן **מכין** את השינוי (טיוטה/migration/תוכנית) אך **לא מבצע**.
- אחראי-על (אוכף): `project-director`. כל סוכן מבצע מציית.

---

## מבנה הריפו

```
robertbot/                 ← שורש הריפו + git repo. כאן יושב הקובץ הזה.
├─ .mcp.json               ← שרתי MCP (playwright/supabase/stripe) — ${ENV} בלבד, ללא סודות
├─ .claude/
│  ├─ agents/              ← 7 סוכני Claude Code (ראה רוסטר)
│  ├─ skills/              ← 8 מיומנויות ארוזות (SKILL.md)
│  └─ settings.local.json  ← טוקני MCP מקומיים (מוגן ב-.gitignore, לא ב-git)
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

## מערכת הסוכנים — מערכת הפעלה: קודקוד + 6 (7 סוכנים)

> כל סוכני ה-`.claude/agents/` רצים **מיד** בתוך Claude Code, אפס תשתית. פותחים את
> Claude Code בתיקיית הפרויקט ומדברים בעברית; הסוכן הנכון נבחר אוטומטית לפי הבקשה,
> או קוראים לו בשם. `/agents` מציג את כולם. הארכיטקטורה: **שכבה 1** = מנהל יחיד;
> **שכבה 2** = 6 בעלי-תחום עם בעלות ברורה ולא-חופפת.

### 👑 שכבה 1 — קודקוד (מתחילים כאן לכל יוזמה; הוא המתאם היחיד)
| סוכן | תפקיד |
|---|---|
| `project-director` | **המנכ"ל והמתאם היחיד.** מכיר את כל הסוכנים, מתכנן מההתחלה עד הסוף, מתעדף, מאציל, מנהל סיכונים, מקבל החלטות סופיות, ואוכף את שרשרת האישורים. כולל את התפקיד האסטרטגי (go-to-market, צמיחה, הכנה למשקיעים). אינו מבצע קוד — מתכנן ומתאם. הכול עובר דרכו, ושום סוכן אחר אינו מתאם רוחבי. |

### שכבה 2 — 6 בעלי-תחום (מדברים איתם ישירות, או דרך הקודקוד)
| סוכן | כמו לשכור | מה עושה |
|---|---|---|
| `product-engineering` | מחלקת הנדסה | Frontend, Backend, APIs, מסד נתונים (סכמה/RLS/migrations), אינטגרציות (Twilio/Stripe/Resend/Anthropic), כוונון הבוטים, **סוכני התפעול האוטומטיים** ואוטומציות, קוד ה-CMS, ותשתית |
| `security` | מומחה אבטחה + עו"ד | אבטחת אפליקציה/תשתית/ענן/AI, בידוד multi-tenant, סריקת סודות/`npm audit`, סקירת RLS, ומשפט/פרטיות (תקנון, מדיניות, GDPR) + סקירות ציות. אוכף את חוק הסודות |
| `qa-operations` | QA + בקרת איכות | בדיקות, אימות UI/UX, build/runtime, demo mode, ציון מוכנות לשחרור (go/no-go), ניטור/אמינות. **דיווח בלבד** — לא מתקן ולא מעלה לאוויר (תיקון → product-engineering; deploy → הבעלים). הבודק לפני "סיימתי" |
| `growth` | צוות צמיחה | שיווק, SEO ותוכן, מכירות, שירות לקוחות, מחקר מתחרים, דאטה/KPI, וניתוח הכנסות (MRR/churn/כלכלת יחידה/תמחור) |
| `brand-design` | מותג + אולפן עיצוב | זהות מותג, קול וטון, מערכת עיצוב, UI, דפי נחיתה, נכסי פרסום, **פרומפטים לסרטון/תמונה** (Sora/Veo/Midjourney) |
| `admin-platform-manager` | מנהל פלטפורמת אדמין | **פאנל האדמין בלבד:** אבטחת אדמין, הרשאות/תפקידים, הגדרות, דשבורדים/כלים פנימיים, ניהול משתמשים, **ניהול מנויים אדמיניסטרטיבי**, ותהליכים פנימיים. אינו אחראי על האתר הציבורי |

> **חלוקת בנאי האתר (CMS):** הקוד/תשתית → `product-engineering`; הכלי הפנימי (גישה/
> הרשאות/פרסום) → `admin-platform-manager`; התוכן/העיצוב הציבורי → `brand-design` + `growth`.

### שכבת תפעול רצה — סוכנים אוטומטיים (קוד ב-`app/src/lib/agents/`, בבעלות `product-engineering`)
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

## יכולות הסוכנים — Skills & MCP

לסוכנים יש, מעבר לכלים המובנים, שתי שכבות יכולת:

### MCP servers (כלים חדשים) — `.mcp.json` בשורש
| Server | מקור | טוקן? | סטטוס | משרת |
|---|---|---|---|---|
| `playwright` | Microsoft (רשמי) | ❌ | פעיל | דפדפן אמיתי: ניווט, לחיצות, צילומי מסך, גריפה — growth, qa-operations, brand-design |
| `supabase` | Supabase (רשמי) | ✅ read-only | ממתין לטוקן | product-engineering, security, growth, admin-platform-manager |
| `stripe` | Stripe (רשמי) | ✅ restricted | ממתין לטוקן | growth, admin-platform-manager |

**הרשאת כלי MCP לסוכן** מתבצעת ב-frontmatter שלו (`tools: ..., mcp__playwright`).

### Skills — מיומנויות ארוזות (`.claude/skills/<name>/SKILL.md`)
זמינות אוטומטית לכל סוכן (לא דורש הרשאה ב-`tools`). מותאמים שלנו (אמינים 100%):
`github-backup`, `security-scan`, `competitor-report`, `social-post-pack`,
`video-image-prompt`, `brand-kit`, `seo-article`, `finance-report`.

**Skills רשמיים (Anthropic)** — מותקנים פעם אחת בתוך Claude Code:
```
/plugin marketplace add anthropics/skills
/plugin install document-skills
```
(נותן PDF/Word/Excel/PowerPoint — ל-growth ו-security.)

### 🔐 אבטחת טוקני MCP (חובה)
- **`.mcp.json` מכיל רק `${ENV}` — אף פעם לא טוקן גולמי.** בטוח לגיבוי ל-GitHub.
- הטוקנים נכנסים ל-`.claude/settings.local.json` (מוגן ב-`.gitignore`), תחת `env`:
  ```json
  {
    "env": {
      "SUPABASE_ACCESS_TOKEN": "sbp_...",
      "SUPABASE_PROJECT_REF": "<project-ref>",
      "STRIPE_RESTRICTED_KEY": "rk_live_..."
    }
  }
  ```
- **תמיד least-privilege:** Supabase `--read-only`; Stripe **restricted key** (קריאה בלבד).
- `security` בודק כל MCP חדש לפני הוספה. גרסאות — לשקול נעילה (במקום `@latest`).
- הערת Windows: אם MCP לא מתחבר, נסה לעטוף `"command": "cmd"`, `"args": ["/c","npx",...]`.

## איך התפעול היום-יומי רץ חלק

0. **יוזמה גדולה? מתחילים מהקודקוד** — לכל מטרה רב-שלבית פונים תחילה ל-`project-director`;
   הוא בונה תוכנית-על ומאציל לסוכנים הנכונים בסדר הנכון. הכול עובר דרכו.
1. **הבעלים מאציל** — פותח Claude Code ומבקש מבעל-תחום (למשל *"brand-design, תן 3
   פרומפטים לסרטון"* / *"growth, מי מתחרה בישראל?"*), או נותן ל-`project-director` לרכז.
2. **בנייה/תיקון** — `product-engineering` כותב/מתקן את הקוד (כולל ביצועים/תלויות);
   `qa-operations` **מאמת** (tsc/lint/build + בדיקות) ונותן ציון מוכנות — דיווח בלבד, לא מתקן ולא מעלה.
3. **אבטחה** — `security` סורק תקופתית ולפני כל שחרור; אוכף את חוק הסודות.
4. **אישורים** — פעולות פרודקשן/DB/deploy דורשות משפט אישור מפורש (חוק 4 למעלה).
   שום סוכן לא מעלה לאוויר — אחרי ציון מוכנות ירוק מ-`qa-operations` ואישור, **הבעלים** מבצע את ה-deploy.
5. **גיבוי** — בסוף כל שינוי: commit + push ל-GitHub (אחרי בדיקת סודות). ראה למטה.
6. **אוטומציה** — שכבת התפעול הרצה (orchestrator) רצה ברקע יומית ושולחת דוח עם הצעות לאישור.

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
