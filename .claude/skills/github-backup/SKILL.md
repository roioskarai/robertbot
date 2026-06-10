---
name: github-backup
description: Safely back up the Robert project to GitHub. Use whenever work is finished and should be committed + pushed, or when the user says "גבה", "תעלה ל-github", "שמור", "backup", "commit and push". Enforces the secret-scan-before-push rule. Pushes to BOTH GitHub accounts automatically.
---

# גיבוי בטוח ל-GitHub (שני חשבונות)

מקודד את חוק הגיבוי של הפרויקט (ראה `CLAUDE.md`): **כל שינוי מגובה — ואף פעם לא
עם סוד**. דוחף אוטומטית לשני חשבונות:
- **RoiOskar/robertbot** — החשבון הראשי (gh credential helper)
- **roioskarai/robertbot** — חשבון הגיבוי (GITHUB_BACKUP_TOKEN מ-settings.local.json)

## הערת סביבה (Windows/PowerShell)
`git` מותקן דרך scoop ולא תמיד ב-PATH. רענן פעם אחת בתחילת הפקודה:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```
משתנה: `$root = "c:\Users\רועי\Desktop\AI\robertbot"`

## השלבים

### 1. מה השתנה
```powershell
git -C $root status --short
```

### 2. Staging
```powershell
git -C $root add -A
```

### 3. סריקת-סודות על ה-staged (חובה — לפני כל commit)
```powershell
git -C $root diff --cached | Select-String -Pattern "sk_live_[A-Za-z0-9]{12}|sk_test_[A-Za-z0-9]{12}|sk-ant-[A-Za-z0-9]{16}|whsec_[A-Za-z0-9]{16}|re_[A-Za-z0-9]{16}|AC[0-9a-f]{32}|eyJ[A-Za-z0-9_-]{30}|EAAA[A-Za-z0-9]{20}"
```
אם יש התאמה אמיתית → **לעצור**, להוציא את הקובץ מ-staging, ולבטל את הטוקן בספק.
(התאמה לטקסט תיעוד שמסביר תבנית = התראת-שווא; ודא שזה לא מפתח אמיתי.)

### 4. Commit
הודעה תיאורית. ב-PowerShell השתמש ב-here-string `@'...'@`:
```powershell
git -C $root commit -m @'
תיאור השינוי
'@
```

### 5. Push לשני החשבונות
```powershell
# חשבון ראשי (RoiOskar) — דרך gh credential helper
git -C $root push origin main

# חשבון גיבוי (roioskarai) — דרך token מ-settings.local.json
$t = $env:GITHUB_BACKUP_TOKEN
$u = $env:GITHUB_BACKUP_USER
$r = $env:GITHUB_BACKUP_REPO
if ($t -and $u -and $r) {
    git -C $root push "https://${u}:${t}@github.com/${u}/${r}.git" main
    Write-Output "גיבוי ל-$u/$r הושלם"
} else {
    Write-Output "⚠️ GITHUB_BACKUP_TOKEN לא מוגדר — דחיפה רק ל-RoiOskar"
}
```

### 6. אימות
```powershell
git -C $root log --oneline -1
git -C $root status -sb
```
לוודא שורה `## main...origin/main` (ללא ahead/behind).

## כללי ברזל
- אסור `git add -f` על קבצי `.env*` · אסור force-push · אסור `--no-verify`.
- `node_modules`/`.next`/`.env*.local`/`.claude/settings.local.json` כבר ב-`.gitignore` — לא נכנסים ל-git.
- `.mcp.json` בטוח **רק** כי מכיל `${ENV}` בלבד — ודא לפני push.
- אם `GITHUB_BACKUP_TOKEN` פג תוקף: בעלים מחדש טוקן ב-github.com/settings/tokens ומעדכן ב-`.claude/settings.local.json`.
