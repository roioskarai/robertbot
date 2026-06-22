// Declarative form schema for each section type. Drives the generic
// form-based section editor (SectionFields.tsx). Keys may be dotted paths
// (e.g. "chat.name") to edit nested objects.

import type { SectionType } from "@/lib/site/types";

export type FieldDef =
  | { key: string; label: string; type: "text" | "textarea" | "number" | "color" | "csv" | "bool" }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; type: "list"; itemLabel?: string; fields: FieldDef[] };

const VARIANT = { key: "variant", label: "סגנון", type: "select" as const, options: [
  { value: "primary", label: "ראשי" }, { value: "ghost", label: "משני" },
] };

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: "כותרת ראשית (Hero)",
  "announcement-bar": "פס הכרזה",
  stats: "רצועת נתונים",
  "how-it-works": "איך זה עובד",
  features: "יתרונות",
  pricing: "מחירים",
  testimonials: "המלצות",
  faq: "שאלות נפוצות",
  gallery: "גלריית תמונות",
  video: "וידאו",
  countdown: "טיימר ספירה לאחור",
  newsletter: "הרשמה לניוזלטר",
  "cta-band": "רצועת קריאה לפעולה",
  richtext: "טקסט עשיר (בלוג)",
  "custom-html": "HTML מותאם אישית",
};

export const SECTION_SCHEMA: Record<SectionType, FieldDef[]> = {
  hero: [
    { key: "eyebrow", label: "תווית עליונה", type: "text" },
    { key: "title", label: "כותרת", type: "textarea" },
    { key: "subtitle", label: "תת-כותרת", type: "textarea" },
    { key: "ctas", label: "כפתורים", type: "list", itemLabel: "כפתור", fields: [
      { key: "label", label: "טקסט", type: "text" },
      { key: "href", label: "קישור", type: "text" },
      VARIANT,
    ] },
    { key: "trustText", label: "טקסט אמון", type: "text" },
    { key: "trustAvatars", label: "אווטרים (מופרד בפסיקים)", type: "csv" },
    { key: "floatTags", label: "תגיות צפות", type: "list", itemLabel: "תגית", fields: [
      { key: "icon", label: "אייקון", type: "text" },
      { key: "text", label: "טקסט", type: "text" },
    ] },
    { key: "chat.name", label: "שם בצ'אט הדגמה", type: "text" },
    { key: "chat.status", label: "סטטוס בצ'אט", type: "text" },
    { key: "chat.messages", label: "הודעות הדגמה", type: "list", itemLabel: "הודעה", fields: [
      { key: "from", label: "צד", type: "select", options: [
        { value: "in", label: "לקוח" }, { value: "out", label: "בוט" },
      ] },
      { key: "text", label: "טקסט", type: "textarea" },
      { key: "time", label: "שעה", type: "text" },
    ] },
  ],
  "announcement-bar": [
    { key: "text", label: "טקסט", type: "text" },
    { key: "bg", label: "צבע רקע", type: "color" },
    { key: "color", label: "צבע טקסט", type: "color" },
    { key: "speed", label: "מהירות (שניות)", type: "number" },
    { key: "link", label: "קישור", type: "text" },
  ],
  stats: [
    { key: "items", label: "נתונים", type: "list", itemLabel: "נתון", fields: [
      { key: "value", label: "ערך", type: "text" },
      { key: "label", label: "תווית", type: "text" },
    ] },
  ],
  "how-it-works": [
    { key: "tag", label: "תווית", type: "text" },
    { key: "title", label: "כותרת", type: "textarea" },
    { key: "subtitle", label: "תת-כותרת", type: "textarea" },
    { key: "steps", label: "שלבים", type: "list", itemLabel: "שלב", fields: [
      { key: "num", label: "מספר", type: "text" },
      { key: "icon", label: "אייקון", type: "text" },
      { key: "title", label: "כותרת", type: "text" },
      { key: "text", label: "תיאור", type: "textarea" },
    ] },
  ],
  features: [
    { key: "tag", label: "תווית", type: "text" },
    { key: "title", label: "כותרת", type: "textarea" },
    { key: "subtitle", label: "תת-כותרת", type: "textarea" },
    { key: "items", label: "יתרונות", type: "list", itemLabel: "יתרון", fields: [
      { key: "icon", label: "אייקון", type: "text" },
      { key: "iconClass", label: "צבע", type: "select", options: [
        { value: "ic-g", label: "ירוק" }, { value: "ic-p", label: "סגול" },
        { value: "ic-o", label: "כתום" }, { value: "ic-r", label: "אדום" },
      ] },
      { key: "title", label: "כותרת", type: "text" },
      { key: "text", label: "תיאור", type: "textarea" },
    ] },
  ],
  pricing: [
    { key: "tag", label: "תווית", type: "text" },
    { key: "title", label: "כותרת", type: "textarea" },
    { key: "subtitle", label: "תת-כותרת", type: "textarea" },
    { key: "showToggle", label: "הצג מתג חודשי/שנתי", type: "bool" },
    { key: "footnote", label: "הערת שוליים", type: "text" },
  ],
  testimonials: [
    { key: "tag", label: "תווית", type: "text" },
    { key: "title", label: "כותרת", type: "text" },
    { key: "items", label: "המלצות", type: "list", itemLabel: "המלצה", fields: [
      { key: "text", label: "ציטוט", type: "textarea" },
      { key: "name", label: "שם", type: "text" },
      { key: "role", label: "תפקיד", type: "text" },
      { key: "avatar", label: "אות אווטר", type: "text" },
      { key: "avatarBg", label: "רקע אווטר", type: "color" },
      { key: "avatarColor", label: "צבע אות", type: "color" },
      { key: "stars", label: "כוכבים", type: "number" },
    ] },
  ],
  faq: [
    { key: "tag", label: "תווית", type: "text" },
    { key: "title", label: "כותרת", type: "text" },
    { key: "items", label: "שאלות", type: "list", itemLabel: "שאלה", fields: [
      { key: "q", label: "שאלה", type: "text" },
      { key: "a", label: "תשובה", type: "textarea" },
    ] },
  ],
  gallery: [
    { key: "title", label: "כותרת", type: "text" },
    { key: "images", label: "תמונות", type: "list", itemLabel: "תמונה", fields: [
      { key: "url", label: "כתובת תמונה", type: "text" },
      { key: "alt", label: "טקסט חלופי", type: "text" },
    ] },
  ],
  video: [
    { key: "title", label: "כותרת", type: "text" },
    { key: "provider", label: "ספק", type: "select", options: [
      { value: "youtube", label: "YouTube" }, { value: "vimeo", label: "Vimeo" }, { value: "file", label: "קובץ" },
    ] },
    { key: "url", label: "כתובת/מזהה", type: "text" },
  ],
  countdown: [
    { key: "message", label: "הודעה", type: "text" },
    { key: "endsAt", label: "תאריך סיום (ISO)", type: "text" },
  ],
  newsletter: [
    { key: "title", label: "כותרת", type: "text" },
    { key: "subtitle", label: "תת-כותרת", type: "text" },
    { key: "buttonLabel", label: "טקסט כפתור", type: "text" },
  ],
  "cta-band": [
    { key: "title", label: "כותרת", type: "text" },
    { key: "subtitle", label: "תת-כותרת", type: "text" },
    { key: "cta.label", label: "טקסט כפתור", type: "text" },
    { key: "cta.href", label: "קישור כפתור", type: "text" },
  ],
  richtext: [
    // Edited via the RichText WYSIWYG (special-cased in SectionFields).
  ],
  "custom-html": [
    { key: "html", label: "קוד HTML", type: "textarea" },
  ],
};

/** Sensible starter props when adding a new section. */
export function defaultPropsFor(type: SectionType): Record<string, unknown> {
  switch (type) {
    case "hero":
      return { title: "כותרת חדשה", subtitle: "תיאור קצר", ctas: [{ label: "התחל", href: "/onboarding", variant: "primary" }] };
    case "stats":
      return { items: [{ value: "100%", label: "תווית" }] };
    case "how-it-works":
      return { tag: "איך זה עובד", title: "שלושה צעדים", steps: [{ num: "01", icon: "📝", title: "שלב", text: "תיאור" }] };
    case "features":
      return { tag: "יתרונות", title: "למה אנחנו", items: [{ icon: "⭐", iconClass: "ic-g", title: "יתרון", text: "תיאור" }] };
    case "pricing":
      return { tag: "מחירים", title: "מחירים", showToggle: true };
    case "testimonials":
      return { tag: "המלצות", title: "לקוחות מספרים", items: [{ text: "המלצה", name: "שם", role: "תפקיד", stars: 5 }] };
    case "faq":
      return { tag: "שאלות", title: "שאלות נפוצות", items: [{ q: "שאלה?", a: "תשובה" }] };
    case "gallery":
      return { title: "גלריה", images: [] };
    case "video":
      return { title: "וידאו", provider: "youtube", url: "" };
    case "countdown":
      return { message: "המבצע נגמר בעוד", endsAt: new Date(Date.now() + 7 * 864e5).toISOString() };
    case "newsletter":
      return { title: "הישארו מעודכנים", buttonLabel: "הרשמה" };
    case "cta-band":
      return { title: "מוכנים להתחיל?", cta: { label: "התחל עכשיו", href: "/onboarding" } };
    case "announcement-bar":
      return { text: "הכרזה חדשה", bg: "#18a84f", color: "#ffffff", speed: 20 };
    case "richtext":
      return { html: "<h2>כותרת</h2><p>כתוב כאן את תוכן הכתבה…</p>" };
    case "custom-html":
      return { html: "<div>תוכן מותאם</div>" };
    default:
      return {};
  }
}
