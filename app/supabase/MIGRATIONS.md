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
| `migrations/0007_admin_email_cleanup.sql` | הסרת האימייל הקשיח מטריגר ההרשמה (bootstrap עובר ל-env‏ `ADMIN_EMAIL`) | ✅ **חל** — הבעלים הדביק ב-SQL Editor ב-2026-07-03 ("Success. No rows returned") |
| `migrations/0008_meta_phone_unique.sql` | אינדקס ייחודי חלקי על `meta_phone_number_id` | ✅ **חל** — הבעלים הדביק ב-SQL Editor ב-2026-07-03 (באותו בלוק) |
| `migrations/0009_comp_plans.sql` | מסלולי חינם (הענקות אדמין): `users.is_comp` + `users.comp_note` | ⏳ **ממתינה** — דורשת `APPROVED - DATABASE`; חובה להריץ **לפני** שחרור אצוות האדמין (4-5) לפרודקשן — הקוד קורא/כותב את העמודות |

**⚠️ מיגרציה 0009 ממתינה לאישור. כל השאר חלות.**

## פעולות DB שבוצעו ב-2026-07-03 (באישור `APPROVED - DATABASE`)

- ✅ **רשומת `home` שוחזרה לברירות המחדל** (title/meta/draft_doc/published_doc) דרך
  PostgREST עם service-role — שחזור נאמן של `seed?force=1` לעמוד בלבד.
- ✅ **רשומת ה-theme עודכנה לפלטת V2** ‏(tokens = DEFAULT_THEME) ו-active.
- ‏`site_settings` **לא נגעו** בכוונה (שימור התאמות הבעלים בפאנל).

## הערות

- הזיכרונות/מסמכים שסימנו את 0005/0006 כ"ממתינות" היו לא מעודכנים — שתיהן חלות בפועל (אומת 2026-07-02).
- כשיוגדר `SUPABASE_ACCESS_TOKEN` ל-MCP, אפשר לאמת גם אינדקסים ולעבור ל-`apply_migration` עם ledger אמיתי.
