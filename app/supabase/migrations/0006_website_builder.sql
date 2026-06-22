-- ════════════════════════════════════════════════════════════
-- 0006 — Website Builder + CMS
-- Run in the Supabase SQL editor (after 0001–0005).
-- Adds the schema for the admin Website Builder / CMS that makes the
-- Robert marketing site fully DB-driven and editable with no code.
--
-- Design notes:
--   • Multi-tenant ready: every table carries site_id → sites.id. Today there
--     is ONE site row (robertbot.co.il); the model supports many later.
--   • Content model = JSON documents. Pages and global settings keep separate
--     draft_doc / published_doc JSONB so we get draft→preview→publish, version
--     history, undo/redo and backup/restore for free.
--   • Access model: all reads/writes are mediated by server code using the
--     service-role client (admin API routes gated by requireAdmin()+permission;
--     public rendering via cached service-role reads of *published* columns).
--     RLS is therefore defense-in-depth: enabled + is_admin() policy (anon gets
--     nothing through RLS; service role bypasses). Mirrors the existing schema.
--   • Seeding of the actual default content is done by the seed route
--     (POST /api/admin/site/seed) from src/lib/site/defaults.ts — the single
--     source of truth shared with demo-mode rendering. No content lives in SQL.
-- ════════════════════════════════════════════════════════════

-- ── Sites (multi-tenant root) ────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- At most one primary site (the data layer resolves "the site" via this).
CREATE UNIQUE INDEX IF NOT EXISTS sites_primary_unique ON sites (is_primary) WHERE is_primary = true;

-- ── Site settings (global chrome: header/footer/announcement/SEO/code) ──
-- One row per site. draft_doc / published_doc shape (see SiteSettingsDoc):
--   { header, footer, announcement, seo, whatsappWidget,
--     customCss, customJs, headerScripts, footerScripts }
CREATE TABLE IF NOT EXISTS site_settings (
  site_id UUID PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
  active_theme_id UUID,
  draft_doc JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_doc JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Themes (design presets) ──────────────────────────────────
-- tokens shape: { colors:{...}, typography:{...}, layout:{...}, dark:{...} }
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tokens JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS themes_site_idx ON themes(site_id);

-- ── Pages (home, static pages, blog posts) ───────────────────
-- *_doc shape: { sections: [{ id, type, enabled, schedule:{start,end}, props }] }
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'page' CHECK (kind IN ('home', 'page', 'post')),
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,          -- { metaTitle, metaDescription, ogImage, canonical }
  draft_doc JSONB NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  published_doc JSONB NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  author_id UUID,        -- loose ref → authors.id (no FK to avoid ordering coupling)
  category_id UUID,      -- loose ref → blog_categories.id
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (site_id, slug)
);
CREATE INDEX IF NOT EXISTS pages_site_kind_idx ON pages(site_id, kind);

-- Immutable snapshots for version history / restore (one row per publish).
CREATE TABLE IF NOT EXISTS page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  doc JSONB NOT NULL,
  meta JSONB,
  label TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS page_versions_page_idx ON page_versions(page_id, created_at DESC);

-- ── Media library (manifest over Supabase Storage) ───────────
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  path TEXT NOT NULL,             -- storage object path within the bucket
  url TEXT NOT NULL,              -- public URL
  mime TEXT,
  width INT,
  height INT,
  size INT,                       -- bytes
  alt TEXT,
  folder TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS media_site_idx ON media(site_id, folder);

-- Public-read bucket for site media. Writes happen only via the authenticated
-- admin upload route (service role), which bypasses Storage RLS.
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-media', 'site-media', true)
ON CONFLICT (id) DO NOTHING;

-- ── Banners + popups (unified) ───────────────────────────────
-- config shape varies by kind (see BannerConfig): text/colors/speed/link for
-- announcement; design/timing/trigger for popups; etc.
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('announcement', 'homepage', 'floating', 'popup', 'exit_intent')),
  name TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  targeting JSONB DEFAULT '{}'::jsonb,        -- { pages:[], devices:[], trigger:{...} }
  schedule_start TIMESTAMPTZ,
  schedule_end TIMESTAMPTZ,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS banners_site_kind_idx ON banners(site_id, kind, status);

-- ── Blog taxonomy + newsletter ───────────────────────────────
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (site_id, slug)
);

CREATE TABLE IF NOT EXISTS authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (site_id, email)
);

-- ── Audit log + site analytics events ────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,            -- e.g. 'page.publish', 'theme.activate'
  entity_type TEXT,
  entity_id TEXT,
  diff JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_log_site_idx ON audit_log(site_id, created_at DESC);

CREATE TABLE IF NOT EXISTS site_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pageview', 'click', 'conversion')),
  path TEXT,
  referrer TEXT,
  session_id TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS site_events_site_idx ON site_events(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS site_events_type_idx ON site_events(site_id, type, created_at DESC);

-- ── Granular admin roles ─────────────────────────────────────
-- Applies when users.role = 'admin'. NULL for tenants. Owner → super_admin.
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_role TEXT
  CHECK (admin_role IN ('super_admin', 'admin', 'editor', 'support'));
UPDATE users SET admin_role = 'super_admin'
  WHERE role = 'admin' AND admin_role IS NULL;

-- ════════════════════════════════════════════════════════════
-- Row Level Security (defense in depth — service role bypasses)
-- is_admin() is defined in schema.sql.
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sites','site_settings','themes','pages','page_versions','media',
    'banners','blog_categories','authors','newsletter_subscribers',
    'audit_log','site_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_admin_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (is_admin()) WITH CHECK (is_admin())',
      t || '_admin_all', t
    );
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════
-- updated_at maintenance (reuses touch_updated_at() from schema.sql)
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sites','site_settings','themes','pages','banners'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', t || '_touch', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
      t || '_touch', t
    );
  END LOOP;
END $$;
