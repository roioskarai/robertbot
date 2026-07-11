-- 0011: יומן פעולות אדמין גלובלי (admin_audit_log) + תיקון FK למחיקת משתמש.
--
-- עד היום פעולות רגישות (שינוי מסלול/comp/חסימה/שינוי role, שינוי סיסמה,
-- 2FA, הרצת סוכנים) לא נרשמו בשום מקום — audit_log הקיים (0006) כבול
-- ל-site_id וכל האינדקסים/UI שלו בנויים לבנאי האתר. טבלה חדשה, נפרדת:
--   * actor_id/target_id בכוונה בלי FK — שורות היומן שורדות מחיקת משתמש.
--   * diff = { before: {...}, after: {...} } — רק מפתחות ששונו.
--   * אין policy לכתיבה/עדכון/מחיקה — כתיבה דרך service-role בלבד;
--     היומן אינו ניתן לעריכה לעולם (append-only).
--
-- בנוסף: usage_logs נוצרה (schema.sql) עם FK ללא ON DELETE — מה שחוסם
-- מחיקת משתמש ברמת DB. מיושר ל-CASCADE כמו bots/conversations/messages.
-- (route המחיקה מוחק usage_logs מפורשות גם כן, כך שהקוד עובד גם לפני
-- החלת המיגרציה הזו.)
--
-- להרצה ב-Supabase SQL Editor אחרי אישור `APPROVED - DATABASE`.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,          -- 'subscription.change' | 'user.suspend' | 'user.delete' |
                                 -- 'auth.login' | 'auth.login_failed' | 'agent.trigger' | ...
  target_type TEXT,              -- 'user' | 'bot' | 'agent' | 'system'
  target_id TEXT,
  target_label TEXT,             -- תווית אנושית (אימייל) שהוקפאה בזמן הכתיבה
  diff JSONB,                    -- { before: {...}, after: {...} }
  meta JSONB,                    -- { ip, note, mode, ... }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_target_idx  ON admin_audit_log (target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_action_idx  ON admin_audit_log (action, created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_audit" ON admin_audit_log;
CREATE POLICY "admin_read_audit" ON admin_audit_log FOR SELECT USING (is_admin());

-- יישור FK של usage_logs ל-ON DELETE CASCADE (מאפשר מחיקת משתמש/בוט).
ALTER TABLE usage_logs DROP CONSTRAINT IF EXISTS usage_logs_user_id_fkey;
ALTER TABLE usage_logs ADD CONSTRAINT usage_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE usage_logs DROP CONSTRAINT IF EXISTS usage_logs_bot_id_fkey;
ALTER TABLE usage_logs ADD CONSTRAINT usage_logs_bot_id_fkey
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE;
