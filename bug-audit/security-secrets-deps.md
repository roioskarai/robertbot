# דוח אבטחה — סודות, תלויות והגנת מידע (cyber-guardian)

## סעיף 1 — סודות חשופים

### 🔴 1.1 PAT של GitHub בטקסט גלוי ב-`.git/config`
- **מיקום:** `.git/config` — remote `backup`, פורמט `https://roioskarai:ghp_****@github.com/...`
- לא דלף לאינטרנט (לא ב-index), אך יושב לא-מוצפן על הדיסק. PAT עם הרשאות repo.
- **פעולה:** (1) revoke ב-GitHub + הנפקת חדש. (2) `git config --global credential.helper manager`. (3) `git remote set-url backup https://github.com/roioskarai/robertbot.git`.

### 🔴 1.2 אותו PAT + Supabase token ב-`.claude/settings.local.json`
- **מיקום:** `.claude/settings.local.json` — `GITHUB_BACKUP_TOKEN` + `SUPABASE_ACCESS_TOKEN` (sbp_****). הקובץ מוגן ב-.gitignore (לא דלף), אך לרענן את שני הטוקנים יחד.

### 🟡 1.3 שימוש חוזר בסוד אחד ל-3 תפקידים
- `CRON_SECRET`, `META_VERIFY_TOKEN`, `GROW_WEBHOOK_SECRET` חולקים אותה מחרוזת ב-`.env.local`. אם אחד נחשף — שלושתם. בפרודקשן (Vercel) להגדיר ערך אקראי שונה לכל אחד.

### 🟢 1.4 `.mcp.json` נקי (רק `${ENV}`), `.env.local` מוגן נכון (לא ב-git).

## סעיף 2 — תלויות פגיעות
**לא נמצאה אף תלות פגיעה ידועה.** (אומת ידנית מול `package-lock.json`; מומלץ להריץ `npm audit` בפועל לאימות.)

| חבילה | גרסה | סטטוס |
|---|---|---|
| next | 14.2.35 | 🟢 כולל תיקון CVE-2025-29927 (middleware bypass) |
| cookie | 1.1.1 | 🟢 |
| brace-expansion | 1.1.15 | 🟢 |
| nanoid | 3.3.12 | 🟢 |
| semver | 7.8.1 | 🟢 |
| axios | 1.16.1 | 🟢 |
| stripe/twilio/supabase-js/otplib/qrcode | עדכניות | 🟢 |

- 🟡 `.mcp.json` משתמש ב-`@latest` ל-3 שרתי MCP — שקול נעילת גרסאות (reproducibility).

## סעיף 3 — הגנת מידע
- **🟠 3.1** אימות Twilio נדלג ללא כותרת — `whatsapp/route.ts:35` (כפול מדוח האבטחה #2).
- **🟠 3.2** Cron/Agents fail-open אם `CRON_SECRET` ריק — (כפול מדוח האבטחה #4).
- **🟡 3.3** fallback חלש לסודות חסרים: `admin-auth.ts:25` (`"dev-admin-secret"`), `crypto.ts:27` (plaintext כשאין `WA_TOKEN_ENC_KEY` → טוקני WABA לא מוצפנים). חובה env חזק בפרודקשן.
- **🟢 3.4** אין דליפת PII בלוגים. **🟢 3.5** בידוד server/client תקין, AES-256-GCM, webhooks חתומים.

## הדחוף ביותר
1. **לבטל מיד את ה-PAT של GitHub** (פעולת משתמש ב-GitHub).
2. לתקן אימות Twilio (`whatsapp/route.ts:35`).
3. לוודא `CRON_SECRET`, `ADMIN_SESSION_SECRET`, `WA_TOKEN_ENC_KEY` מוגדרים בפרודקשן.
