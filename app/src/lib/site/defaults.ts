// Canonical default site content — the SINGLE SOURCE OF TRUTH.
//
// Used for BOTH:
//   • demo-mode rendering (no Supabase) — the public site renders from here, so
//     the site is never blank and looks identical to the pre-builder version;
//   • seeding the database (POST /api/admin/site/seed) and "restore defaults".
//
// The home document is ported verbatim from the original hardcoded JSX in
// app/src/app/page.tsx so the visual output is unchanged after cutover.

import type {
  PageDoc,
  SiteSettingsDoc,
  ThemeTokens,
  PageMeta,
} from "./types";

/** Fixed id used everywhere for "the" site in single-site mode. */
export const PRIMARY_DOMAIN = "robertbot.co.il";

// ── Default theme (mirrors :root in landing.module.css + globals.css) ──
export const DEFAULT_THEME: ThemeTokens = {
  colors: {
    bg: "#f0f6f3",
    bgGrad: "radial-gradient(900px 600px at 50% -6%, #e8faf0, transparent 60%)",
    white: "#ffffff",
    green: "#25D366",
    greenD: "#18a84f",
    greenPale: "#e8faf0",
    purple: "#6d28d9",
    purplePale: "#ede9fe",
    t1: "#111827",
    t2: "#374151",
    t3: "#6b7280",
    t4: "#9ca3af",
    bdr: "#e5e7eb",
    bdr2: "#d1d5db",
  },
  typography: {
    fontFamily: "var(--font-rubik), 'Rubik', sans-serif",
    googleFont: "",
    baseSize: 16,
    lineHeight: 1.6,
    letterSpacing: 0,
  },
  layout: {
    radius: 14,
    radiusLg: 20,
    shadow: "0 1px 4px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.05)",
    shadowMd: "0 4px 12px rgba(0,0,0,.08), 0 12px 40px rgba(0,0,0,.08)",
    containerWidth: 1100,
    boxed: false,
  },
  dark: { enabled: true, bg: "#1e1e1e", t1: "#f3f4f6", white: "#2a2a2a" },
};

// ── Home page document (ported from page.tsx) ──
export const DEFAULT_HOME_DOC: PageDoc = {
  sections: [
    {
      id: "hero",
      type: "hero",
      enabled: true,
      props: {
        eyebrow: "7 ימי ניסיון חינם — ללא כרטיס אשראי",
        title: "בוט מותאם אישית לעסק שלך,\nבלחיצת כפתור.",
        subtitle:
          "Robert עונה ללקוחות שלך בוואטסאפ, מסביר, מייעץ וקובע תורים — בשמך, מסביב לשעון. מגדירים פעם אחת, הוא עובד תמיד.",
        ctas: [
          { label: "בנה את הבוט שלך ←", href: "/onboarding", variant: "primary" },
          { label: "צפה בהדגמה", href: "#how", variant: "ghost" },
        ],
        trustText: "כבר +500 עסקים סומכים על Robert",
        trustAvatars: ["מ", "ד", "ר", "ש"],
        floatTags: [
          { icon: "✅", text: "אף לקוח לא נשאר בלי מענה" },
          { icon: "💬", text: "מענה אישי — אוטומטי לגמרי" },
        ],
        chat: {
          name: "Robert · מספרת מיטל",
          status: "מחובר · עונה עכשיו",
          messages: [
            { from: "in", text: "היי, אפשר לקבוע תור לתספורת לשבוע הבא?", time: "09:14" },
            { from: "out", text: "בשמחה! 😊 יש פנוי ביום שלישי ב-10:00 או ב-16:30. מה נוח לך?", time: "09:14" },
            { from: "in", text: "שלישי ב-16:30 מושלם. כמה זה עולה?", time: "09:15" },
            { from: "out", text: "קבעתי לך שלישי 16:30 ✅ תספורת ₪80, ואשלח תזכורת יום לפני 🙌", time: "09:15" },
            { from: "in", text: "איזה שירות! תודה רבה 🙏", time: "09:16" },
          ],
        },
      },
    },
    {
      id: "stats",
      type: "stats",
      enabled: true,
      props: {
        items: [
          { value: "5 דק'", label: "הקמת בוט מלא" },
          { value: "24/7", label: "זמינות מלאה" },
          { value: "+500", label: "עסקים פעילים" },
          { value: "98%", label: "שביעות רצון" },
          { value: "~3 שנ'", label: "זמן מענה ממוצע" },
          { value: "∞", label: "שיחות במקביל" },
        ],
      },
    },
    {
      id: "how",
      type: "how-it-works",
      enabled: true,
      props: {
        tag: "איך זה עובד",
        title: "מוכן תוך 3 צעדים פשוטים",
        subtitle: "בלי קוד, בלי טכנאים, בלי כאב ראש. הכל דרך האזור האישי שלך.",
        steps: [
          { num: "01", icon: "📝", title: "מגדיר את העסק שלך", text: "שם, תחום, שאלות נפוצות, מחירים, סגנון דיבור. אתה בוחר בדיוק איך Robert מדבר עם הלקוחות שלך." },
          { num: "02", icon: "⚡", title: "Robert נוצר תוך דקות", text: "המערכת בונה לך בוט מותאם אישית לעסק. שינית דעתך? עדכון בלחיצה — נכנס לתוקף מיידית." },
          { num: "03", icon: "🚀", title: "מחבר לוואטסאפ ויוצא לדרך", text: "מחבר את המספר העסקי בתהליך פשוט של 5 דקות. Robert מתחיל לענות — אתה נח ומכניס." },
        ],
      },
    },
    {
      id: "features",
      type: "features",
      enabled: true,
      props: {
        tag: "למה Robert",
        title: "הכל במקום אחד —\nבלי להתפשר",
        subtitle: "כל מה שנציג אנושי עושה, Robert עושה טוב יותר. וזול יותר.",
        items: [
          { iconClass: "ic-g", icon: "⏰", title: "זמין 24/7 — גם בשבת בלילה", text: "לקוחות שואלים בכל שעה. Robert תמיד שם, עונה תוך שניות, לא מתעייף ולא חולה ולא מבקש העלאה." },
          { iconClass: "ic-p", icon: "🎨", title: "גמישות מלאה — אתה שולט", text: "רוצה לשנות סגנון? לעדכן מחיר? להוסיף שירות חדש? שינוי בלחיצה אחת, בלי לשלם לאף אחד." },
          { iconClass: "ic-o", icon: "💸", title: "חוסך אלפי שקלים בחודש", text: "נציג שירות עולה ₪6,000+ בחודש. Robert עושה אותה עבודה בשבריר מהמחיר — כל חודש, כל שנה." },
          { iconClass: "ic-g", icon: "🔄", title: "מפסיק מתי שרוצה", text: "אין חוזים ואין קנסות. ביטול בלחיצה אחת. אתה תמיד בשליטה מלאה על המנוי שלך." },
          { iconClass: "ic-p", icon: "🧠", title: "לומד את העסק שלך", text: "Robert מכיר את המוצרים, השירותים, השעות והמחירים — ועונה בדיוק כמו שאתה היית עונה." },
          { iconClass: "ic-r", icon: "👤", title: "מסירה לאדם בלחיצה", text: "שאלה מסובכת? Robert מעביר את השיחה אליך עם כל ההיסטוריה. שום לקוח לא נאבד בדרך." },
        ],
      },
    },
    {
      id: "pricing",
      type: "pricing",
      enabled: true,
      props: {
        tag: "מחירים",
        title: "מחיר פשוט, שקוף,\nללא הפתעות",
        subtitle: "מתחילים בחינם. משדרגים כשרוצים. מבטלים מתי שרוצים.",
        showToggle: true,
        footnote: "מנויים פעילים יכולים לרכוש הודעות נוספות מתוך האזור האישי",
      },
    },
    {
      id: "testimonials",
      type: "testimonials",
      enabled: true,
      props: {
        tag: "לקוחות מספרים",
        title: "הם כבר עובדים עם Robert",
        items: [
          { stars: 5, text: "״הקמתי את הבוט תוך 10 דקות. עכשיו הוא עונה ללקוחות בזמן שאני ישן. פשוט מדהים.״", name: "מיכאל כהן", role: "בעל מוסך, תל אביב", avatar: "מ", avatarBg: "#dbeafe", avatarColor: "#1e40af" },
          { stars: 5, text: "״חסכתי ₪4,000 בחודש על מזכירה. הבוט עונה טוב יותר ממנה ולא לוקח הפסקות.״", name: "דנה לוי", role: "קוסמטיקאית, חיפה", avatar: "ד", avatarBg: "#dcfce7", avatarColor: "#166534" },
          { stars: 5, text: "״לקוחות כותבים לי בלילה ומקבלים תשובה מיידית. הסגרתי 3 עסקאות שפספסתי לפני.״", name: "רון אברהם", role: "יועץ עסקי, ירושלים", avatar: "ר", avatarBg: "#fef9c3", avatarColor: "#854d0e" },
        ],
      },
    },
    {
      id: "faq",
      type: "faq",
      enabled: true,
      props: {
        tag: "שאלות נפוצות",
        title: "יש לך שאלות?",
        items: [
          { q: "האם אני צריך ידע טכני?", a: "בכלל לא. אם אתה יודע למלא טופס — אתה יכול להקים את Robert. אין קוד, אין הגדרות מסובכות. תוך 5 דקות הבוט חי ועובד." },
          { q: "האם אפשר לחבר את המספר העסקי הקיים?", a: "כן. אפשר לחבר כל מספר וואטסאפ Business קיים. המערכת מדריכה אותך שלב אחר שלב — לוקח כ-5 דקות בלבד." },
          { q: "מה קורה אם הבוט לא יודע לענות?", a: "Robert מעביר את השיחה אליך עם כל ההיסטוריה. אתה רואה הכל ועונה ישירות מהממשק. שום לקוח לא נאבד." },
          { q: "האם אפשר לשנות את הבוט אחרי שהוא עולה?", a: "בוודאי. שינוי מחיר, הוספת שירות, עדכון שעות פעילות — כל שינוי נכנס לתוקף מיידית, בלי עלות נוספת." },
          { q: "מה קורה בסוף 7 ימי הניסיון?", a: "אם אהבת — עובר למסלול שבחרת. אם לא — הבוט מתנתק ואין שום חיוב. ללא התחייבות, ללא קנסות, ללא שיחות מכירה." },
        ],
      },
    },
    {
      id: "cta",
      type: "cta-band",
      enabled: true,
      props: {
        title: "מוכן ש- Robert יעבוד בשבילך?",
        subtitle: "7 ימים חינם. ללא כרטיס אשראי. מבטל מתי שרוצה.",
        cta: { label: "צור את הבוט שלך עכשיו — חינם", href: "/onboarding", variant: "primary" },
      },
    },
  ],
};

// ── Global site settings (header / footer / announcement / SEO) ──
export const DEFAULT_SETTINGS: SiteSettingsDoc = {
  header: {
    logoText: "Robert",
    sticky: true,
    navItems: [
      { label: "איך זה עובד", href: "#how" },
      { label: "יתרונות", href: "#features" },
      { label: "מחירים", href: "/pricing" },
      { label: "שאלות", href: "#faq" },
    ],
    ctaLabel: "הרשמה חינם",
    ctaHref: "/onboarding",
    loginLabel: "כניסה",
    loginHref: "/login",
  },
  footer: {
    logoText: "Robert",
    copyright: "© 2026 Robert. כל הזכויות שמורות.",
    links: [
      { label: "תנאי שימוש", href: "/legal" },
      { label: "פרטיות", href: "/legal" },
      { label: "צור קשר", href: "mailto:support@robertbot.co.il" },
    ],
    social: [],
    contactEmail: "support@robertbot.co.il",
  },
  announcement: { enabled: false, text: "", bg: "#18a84f", color: "#ffffff", speed: 20, link: "" },
  seo: {
    metaTitle: "Robert — הבוט שעובד בשבילך",
    metaDescription:
      "Robert עונה, מסביר וקובע פגישות ללקוחות שלך בוואטסאפ — בשמך, 24/7. הקמה תוך 5 דקות, ללא קוד.",
  },
  whatsappWidget: { enabled: false, phone: "", message: "" },
  customCss: "",
  customJs: "",
  headerScripts: "",
  footerScripts: "",
};

export const DEFAULT_HOME_META: PageMeta = {
  metaTitle: "Robert — הבוט שעובד בשבילך",
  metaDescription:
    "Robert עונה, מסביר וקובע פגישות ללקוחות שלך בוואטסאפ — בשמך, 24/7. הקמה תוך 5 דקות, ללא קוד.",
};
