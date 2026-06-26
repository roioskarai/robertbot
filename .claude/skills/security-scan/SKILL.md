---
name: security-scan
description: Run a full security sweep of the Robert repo — exposed secrets, vulnerable dependencies, and multi-tenant isolation checks. Use for "סריקת אבטחה", "בדוק סודות חשופים", "npm audit", "האם המידע מאובטח", or before any release/deploy. Pairs with the security agent.
---

# סריקת אבטחה לפרויקט Robert

צ'קליסט מקודד לסריקה יסודית. read-only — לא משנה קוד; מדווח ממצאים לפי חומרה.

## 1. מפתחות/סודות חשופים
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$root = "c:\Users\רועי\Desktop\AI\robertbot"
# האם קובצי סוד במעקב git? (חייב להיות ריק)
git -C $root ls-files | Select-String -Pattern "env.local|\.pem$|\.key$|secret|credential"
```
- חיפוש מחרוזות מפתח אמיתיות (Grep): `sk_live_`, `sk-ant-`, `whsec_`, `re_…`,
  `AC[0-9a-f]{32}`, JWT `eyJ…` — בכל הריפו מחוץ ל-`node_modules`.
- ודא ש-`.mcp.json` מכיל **רק** `${ENV}` ולא טוקן גולמי.
- ודא שרק משתני `NEXT_PUBLIC_*` מגיעים לצד הלקוח.

## 2. חולשות בתלויות
```powershell
# מתוך app/
npm audit
```
דווח רק על high/critical עם המלצת תיקון (`npm audit fix` או שדרוג ממוקד).

## 3. בידוד multi-tenant (הסיכון #1)
- כל שימוש ב-`createAdminClient()` (webhooks/cron/agents) — לוודא שהשאילתה מסננת
  לפי `user_id`/`bot_id` (admin client עוקף RLS).
- כל טבלה חדשה ב-`app/supabase/*.sql` — `ENABLE ROW LEVEL SECURITY` + policy תקין.
- routes משתמשים ב-server client (RLS) ולא ב-admin client לבקשות משתמש.
- לעומק → הפעל את הסוכן `security`.

## 4. אימות webhooks
- Twilio (חתימה) ו-Stripe (`STRIPE_WEBHOOK_SECRET`) מאומתים לפני עיבוד.

## פלט
טבלה: ממצא · חומרה (🔴/🟠/🟢) · `file:line` · תיקון מוצע. אם נקי — לומר זאת
במפורש ולפרט מה נבדק.
