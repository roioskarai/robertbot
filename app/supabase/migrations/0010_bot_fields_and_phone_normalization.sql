-- 0010: הרחבת עריכת בוט + נרמול מספרי וואטסאפ ל-E.164
--
-- שני שינויים בלתי-תלויים:
--   סעיף 1 — עמודות חדשות לבוט (website, custom_instructions) לתמיכה בעורך
--            הבוט המורחב (טאב "מידע כללי" + טאב "ידע והנחיות").
--   סעיף 2 — נרמול whatsapp_number קיימים לפורמט E.164 (‎+972…), כדי
--            שבדיקות הייחודיות והתאמת המספר יעבדו על צורה אחת ויחידה.
--
-- הקוד עובד גם לפני וגם אחרי ההרצה: עורך הבוט מזהה עמודות חסרות ומסתיר
-- את השדות, ובדיקות הייחודיות משוות דו-צורנית עד להרצה. אין תלות בסדר.
--
-- ⚠️ להרצה ב-Supabase SQL Editor אך ורק אחרי אישור `APPROVED - DATABASE`.
-- לא להריץ אוטומטית.

------------------------------------------------------------------------
-- סעיף 1 — עמודות עורך בוט מורחב
------------------------------------------------------------------------
ALTER TABLE bots ADD COLUMN IF NOT EXISTS website TEXT;              -- אתר / אינסטגרם / פייסבוק
ALTER TABLE bots ADD COLUMN IF NOT EXISTS custom_instructions TEXT; -- הנחיות חופשיות לפרומפט הבוט

------------------------------------------------------------------------
-- סעיף 2 — נרמול whatsapp_number ל-+972
------------------------------------------------------------------------
-- בדיקה מקדימה (חובה — מצפים ל-0 שורות): לוודא שאין התנגשויות אחרי הנרמול.
-- אם חוזרות שורות, יש שני בוטים עם אותו מספר בצורות שונות — לטפל ידנית
-- לפני ההרצה, אחרת ה-UPDATE ייכשל על אינדקס הייחודיות bots_whatsapp_unique.
--
--   SELECT '+972' || substr(regexp_replace(whatsapp_number, '[^0-9]', '', 'g'),
--            CASE WHEN whatsapp_number LIKE '0%' THEN 2 WHEN whatsapp_number ~ '^\+?972' THEN 4 ELSE 1 END
--          ) AS e164, count(*)
--   FROM bots
--   WHERE whatsapp_number IS NOT NULL
--   GROUP BY 1 HAVING count(*) > 1;

-- מספרים בפורמט מקומי (0501234567) → +972501234567
UPDATE bots
  SET whatsapp_number = '+972' || substr(regexp_replace(whatsapp_number, '[^0-9]', '', 'g'), 2)
  WHERE whatsapp_number LIKE '0%';

-- מספרים עם 972 ללא + (972501234567) → +972501234567
UPDATE bots
  SET whatsapp_number = '+' || whatsapp_number
  WHERE whatsapp_number ~ '^972\d+$';

-- אימות (מצפים ל-0 שורות): כל מספר שנשאר צריך להתאים לתבנית E.164 הישראלית.
--   SELECT id, whatsapp_number FROM bots
--   WHERE whatsapp_number IS NOT NULL AND whatsapp_number !~ '^\+972\d{8,9}$';
