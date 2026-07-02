# מצב מיגרציות — פרויקט Supabase‏ `irdpucdlxdtrvuuessvt`

> קובץ מצב ידני (אין ledger אוטומטי — המיגרציות הורצו דרך SQL Editor).
> אומת ב-**2026-07-02** בבדיקת קריאה-בלבד דרך PostgREST (בדיקת קיום טבלאות/עמודות).
> עדכן קובץ זה בכל החלת מיגרציה.

| קובץ | מה עושה | סטטוס בפרודקשן |
|---|---|---|
| `schema.sql` | טבלאות ליבה (users, bots, conversations, messages, usage_logs) + RLS + טריגרים | ✅ חל |
| `agents.sql` | טבלת `agent_runs` + RLS | ✅ חל |
| `migrations/0001_payment_provider.sql` | עמודות ספק תשלומים | ✅ חל |
| `migrations/0002_whatsapp_waba.sql` | עמודות Meta WABA | ✅ חל |
| `migrations/0003_provider_message_id.sql` | דדופ הודעות לפי provider_message_id | ✅ חל |
| `migrations/0004_admin_2fa.sql` | ‏2FA לאדמין (totp_secret/enabled, is_suspended) | ✅ חל |
| `migrations/0005_launch_hardening.sql` | אינדקס ייחודי למספר וואטסאפ, `payment_events`, ביטול-בתום-תקופה | ✅ חל (payment_events + עמודות אומתו) |
| `migrations/0006_website_builder.sql` | סכמת ה-CMS‏ (sites, pages, themes, media, banners, …) | ✅ חל |
| `migrations/0006_meta_unique.sql` | אינדקס ייחודי חלקי על `meta_phone_number_id` | ⏳ **ממתין** — אינדקס לא ניתן לאימות דרך PostgREST; לפי סריקת ה-QA מ-2026-06-24 נכתב ולא הורץ. דורש `APPROVED - DATABASE` |
| `migrations/0007_admin_email_cleanup.sql` | הסרת האימייל הקשיח מטריגר ההרשמה (bootstrap עובר ל-env‏ `ADMIN_EMAIL`) | ⏳ **ממתין** — להריץ רק אחרי הגדרת `ADMIN_EMAIL` ב-Vercel. דורש `APPROVED - DATABASE` |

## פעולות DB ממתינות נוספות (לא מיגרציות)

- **תיקון רשומת `home` הפגומה** (תוכן `?` במקום עברית): ‏`POST /api/admin/site/seed?force=1` — דורש `APPROVED - DATABASE`.
- **עדכון רשומת ה-theme לפלטת V2** — יבוצע בגל 10 של תוכנית הטרנספורמציה, דורש `APPROVED - DATABASE`.

## הערות

- הזיכרונות/מסמכים שסימנו את 0005/0006 כ"ממתינות" היו לא מעודכנים — שתיהן חלות בפועל (אומת 2026-07-02).
- כשיוגדר `SUPABASE_ACCESS_TOKEN` ל-MCP, אפשר לאמת גם אינדקסים ולעבור ל-`apply_migration` עם ledger אמיתי.
