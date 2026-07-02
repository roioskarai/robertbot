-- 0007 — remove the hardcoded owner email from the signup trigger.
--
-- Admin bootstrap now happens in the app layer via the ADMIN_EMAIL env var
-- (src/lib/admin-auth.ts + /api/admin/login) — the DB no longer embeds a
-- personal address. Existing role='admin' rows are untouched.
--
-- ⚠️ Run AFTER setting ADMIN_EMAIL in the deployment environment (Vercel),
-- otherwise a fresh signup of the owner would land as 'tenant' with no
-- app-side bootstrap to promote it.
-- Requires owner approval: APPROVED - DATABASE.

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    'tenant'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
