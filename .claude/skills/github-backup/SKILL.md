---
name: github-backup
description: Safely back up the Robert project to GitHub. Use whenever work is finished and should be committed + pushed, or when the user says "גבה", "תעלה ל-github", "שמור", "backup", "commit and push". Enforces the secret-scan-before-push rule.
---

# גיבוי בטוח ל-GitHub

מקודד את חוק הגיבוי של הפרויקט (ראה `CLAUDE.md`): **כל שינוי מגובה — ואף פעם לא
עם סוד**. בצע בדיוק לפי הסדר.

## הערת סביבה (Windows/PowerShell)
`git` מותקן דרך scoop ולא תמיד ב-PATH. רענן פעם אחת בתחילת הפקודה:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```
הרץ עם `git -C "c:\Users\רועי\Desktop\AI\robertbot"`.

## השלבים
1. **מה השתנה:** `git -C $root status --short`
2. **Staging:** `git -C $root add -A`
3. **סריקת-סודות על ה-staged (חובה לפני commit):**
   ```powershell
   git -C $root diff --cached | Select-String -Pattern "sk_live_[A-Za-z0-9]{12}|sk_test_[A-Za-z0-9]{12}|sk-ant-[A-Za-z0-9]{16}|whsec_[A-Za-z0-9]{16}|re_[A-Za-z0-9]{16}|AC[0-9a-f]{32}|eyJ[A-Za-z0-9_-]{30}"
   ```
   אם יש התאמה אמיתית → **לעצור**, להוציא את הקובץ מ-staging, ולבטל את הטוקן בספק.
   (התאמה לטקסט תיעוד שמסביר את התבנית = התראת-שווא; ודא שזו לא מחרוזת מפתח אמיתית.)
4. **Commit:** הודעה תיאורית. ב-PowerShell השתמש ב-here-string `@'...'@` **ללא מרכאות
   כפולות בתוך ההודעה** (5.1 מפצל אותן).
5. **Push:** `git -C $root push origin main`
6. **אימות:** `git -C $root status -sb` → לוודא `## main...origin/main` (מסונכרן).

## כללי ברזל
- אסור `git add -f` על קבצי `.env*` · אסור force-push · אסור `--no-verify`.
- `node_modules`/`.next`/`.env*.local`/`.claude/settings.local.json` כבר ב-`.gitignore`.
- `.mcp.json` בטוח לגיבוי **רק** כי הוא מכיל `${ENV}` בלבד — ודא שכך לפני push.
