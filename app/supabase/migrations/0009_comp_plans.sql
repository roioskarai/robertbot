-- 0009: מסלולי חינם (comp) — הענקת אדמין, מוגבלת בזמן, ללא תשלום.
--
-- is_comp מסמן שהמנוי הפעיל הוא הענקה — כך שמדדי MRR/"לקוחות משלמים"
-- מחריגים אותו; comp_note מתעד סיבה/הקשר. תוקף ההענקה משתמש בעמודות
-- הקיימות subscription_ends_at + cancel_at_period_end=true, ולכן בלוק
-- האכיפה הקיים ב-/api/cron/trial מכבה אותה אוטומטית בפקיעה (סטטוס
-- cancelled + כיבוי בוטים + איפוס is_comp) — והדשבורד כבר מציג ללקוח
-- CTA לחידוש במצב cancelled.
--
-- להרצה ב-Supabase SQL Editor אחרי אישור `APPROVED - DATABASE`.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_comp BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS comp_note TEXT;
