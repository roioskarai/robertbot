// Website Builder / CMS — shared types.
//
// Content is modeled as JSON documents. A page's content is an ordered list of
// sections; global chrome (header/footer/announcement/SEO/code) is a settings
// document. Both keep separate draft/published copies in the DB. These types are
// the contract between the admin builder, the data layer, and the public
// renderer (the section registry).

// ── Sections ─────────────────────────────────────────────────

export type SectionType =
  | "hero"
  | "announcement-bar"
  | "stats"
  | "how-it-works"
  | "features"
  | "pricing"
  | "testimonials"
  | "faq"
  | "gallery"
  | "video"
  | "countdown"
  | "newsletter"
  | "cta-band"
  | "richtext"
  | "custom-html";

export interface SectionSchedule {
  start: string | null; // ISO datetime; null = always
  end: string | null;
}

export interface PageSection<P = Record<string, unknown>> {
  id: string;
  type: SectionType;
  enabled: boolean;
  schedule?: SectionSchedule;
  props: P;
}

export interface PageDoc {
  sections: PageSection[];
}

export interface PageMeta {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  canonical?: string;
}

export type PageKind = "home" | "page" | "post";
export type PageStatus = "draft" | "published";

export interface SitePage {
  id: string;
  site_id: string;
  slug: string;
  kind: PageKind;
  title: string;
  status: PageStatus;
  meta: PageMeta;
  draft_doc: PageDoc;
  published_doc: PageDoc;
  author_id: string | null;
  category_id: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Section prop shapes (the ones we port from the current site) ──

export interface CtaLink {
  label: string;
  href: string;
  variant?: "primary" | "ghost";
}

export interface HeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctas?: CtaLink[];
  trustText?: string;
  trustAvatars?: string[];
  /** Demo chat bubbles shown in the hero stage. */
  chat?: { name?: string; status?: string; messages?: { from: "in" | "out"; text: string; time?: string }[] };
  floatTags?: { icon?: string; text: string }[];
}

export interface StatsProps {
  items: { value: string; label: string }[];
}

export interface StepItem {
  num: string;
  icon: string;
  title: string;
  text: string;
}
export interface HowItWorksProps {
  tag?: string;
  title: string;
  subtitle?: string;
  steps: StepItem[];
}

export interface FeatureItem {
  icon: string;
  iconClass?: string; // ic-g / ic-p / ic-o / ic-r (locked palette classes)
  title: string;
  text: string;
}
export interface FeaturesProps {
  tag?: string;
  title: string;
  subtitle?: string;
  items: FeatureItem[];
}

export interface PricingProps {
  tag?: string;
  title: string;
  subtitle?: string;
  showToggle?: boolean;
  footnote?: string;
}

export interface TestimonialItem {
  stars?: number;
  text: string;
  name: string;
  role: string;
  avatar?: string;
  avatarBg?: string;
  avatarColor?: string;
}
export interface TestimonialsProps {
  tag?: string;
  title: string;
  items: TestimonialItem[];
}

export interface FaqProps {
  tag?: string;
  title: string;
  items: { q: string; a: string }[];
}

export interface CtaBandProps {
  title: string;
  subtitle?: string;
  cta?: CtaLink;
}

// New section shapes (added by the builder)
export interface GalleryProps {
  title?: string;
  images: { url: string; alt?: string }[];
}
export interface VideoProps {
  title?: string;
  provider: "youtube" | "vimeo" | "file";
  url: string;
}
export interface CountdownProps {
  message?: string;
  endsAt: string; // ISO
}
export interface NewsletterProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
}
export interface CustomHtmlProps {
  html: string;
}
export interface RichTextProps {
  html: string;
}

// ── Themes / design ──────────────────────────────────────────

export interface ThemeColors {
  bg: string;
  bgGrad?: string;
  white: string;
  green: string; // primary
  greenD: string; // primary dark / hover
  greenPale: string;
  purple: string;
  purplePale: string;
  t1: string; // heading text
  t2: string;
  t3: string;
  t4: string;
  bdr: string;
  bdr2: string;
}

export interface ThemeTypography {
  fontFamily: string; // CSS font-family value
  googleFont?: string; // Google Fonts family to <link> (e.g. "Heebo")
  baseSize: number; // px
  lineHeight: number;
  letterSpacing: number; // px
}

export interface ThemeLayout {
  radius: number; // px → --r
  radiusLg: number; // px → --r-lg
  shadow: string;
  shadowMd: string;
  /** Container width / boxed are advisory: the locked CSS bakes some widths in. */
  containerWidth: number;
  boxed: boolean;
}

export interface ThemeTokens {
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
  dark: { enabled: boolean; bg?: string; t1?: string; white?: string };
}

export interface SiteTheme {
  id: string;
  site_id: string;
  name: string;
  tokens: ThemeTokens;
  is_active: boolean;
  is_default: boolean;
}

// ── Global site settings (chrome) ────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[]; // mega-menu
}

export interface HeaderConfig {
  logoText?: string;
  logoImage?: string;
  sticky?: boolean;
  navItems: NavItem[];
  ctaLabel?: string;
  ctaHref?: string;
  loginLabel?: string;
  loginHref?: string;
}

export interface FooterConfig {
  logoText?: string;
  text?: string;
  copyright?: string;
  links: { label: string; href: string }[];
  social: { platform: string; href: string }[];
  contactEmail?: string;
}

export interface AnnouncementConfig {
  enabled: boolean;
  text?: string;
  bg?: string;
  color?: string;
  speed?: number; // seconds for marquee loop
  link?: string;
}

export interface WhatsAppWidgetConfig {
  enabled: boolean;
  phone?: string;
  message?: string;
}

export interface SiteSettingsDoc {
  header: HeaderConfig;
  footer: FooterConfig;
  announcement: AnnouncementConfig;
  seo: PageMeta;
  whatsappWidget: WhatsAppWidgetConfig;
  customCss?: string;
  customJs?: string;
  headerScripts?: string;
  footerScripts?: string;
}

export interface Site {
  id: string;
  domain: string;
  name: string;
  is_primary: boolean;
}

// ── Banners / popups ─────────────────────────────────────────

export type BannerKind = "announcement" | "homepage" | "floating" | "popup" | "exit_intent";

export interface BannerConfig {
  title?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
  bg?: string;
  color?: string;
  position?: "bottom-start" | "bottom-end";
  delaySeconds?: number;
  showOnce?: boolean;
}

export interface SiteBanner {
  id: string;
  kind: BannerKind;
  name: string;
  config: BannerConfig;
  status: "draft" | "published" | "archived";
  targeting: Record<string, unknown>;
  schedule_start: string | null;
  schedule_end: string | null;
  position: number;
}

/** Everything the public renderer needs for one request, resolved + cached. */
export interface ResolvedSite {
  site: Site;
  theme: ThemeTokens;
  settings: SiteSettingsDoc;
}

// ── Admin roles ──────────────────────────────────────────────

export type AdminRole = "super_admin" | "admin" | "editor" | "support";

/** Coarse permission buckets used by requirePermission(). */
export type Permission =
  | "content.read"
  | "content.write"
  | "design.write"
  | "settings.write"
  | "code.write"
  | "team.manage"
  | "backup.manage";
