// Business categories + subcategories — from robert-onboarding.html.
// `__ADD__` marks the "add custom" tile.

import type { Service } from "@/lib/types";

export interface SubItem {
  icon: string;
  name: string;
}
export interface Category {
  key: string;
  icon: string;
  label: string;
  items: SubItem[];
}

export const MAIN_CATEGORIES: { key: string; icon: string; name: string }[] = [
  { key: "beauty", icon: "💇", name: "יופי וטיפוח" },
  { key: "food", icon: "🍽️", name: "מזון ומשקאות" },
  { key: "fitness", icon: "💪", name: "כושר ובריאות" },
  { key: "professional", icon: "💼", name: "שירות מקצועי" },
  { key: "medical", icon: "🏥", name: "בריאות ורפואה" },
  { key: "retail", icon: "🛍️", name: "קמעונאות ואיקומרס" },
  { key: "realestate", icon: "🏠", name: 'נדל"ן' },
  { key: "education", icon: "📚", name: "חינוך והדרכה" },
  { key: "events", icon: "🎉", name: "אירועים ובידור" },
  { key: "automotive", icon: "🚗", name: "רכב ותחבורה" },
  { key: "home", icon: "🔧", name: "בית ותחזוקה" },
  { key: "travel", icon: "✈️", name: "תיירות ונסיעות" },
  { key: "other", icon: "⚙️", name: "אחר" },
];

export const SUB_CATS: Record<string, Category> = {
  beauty: {
    key: "beauty",
    label: "יופי וטיפוח",
    icon: "💇",
    items: [
      { icon: "✂️", name: "ספר / מספרה" },
      { icon: "💅", name: "לק ג׳ל / ציפורניים" },
      { icon: "🧖", name: "טיפולי פנים" },
      { icon: "🤸", name: "גבות ושיוך" },
      { icon: "💆", name: "מסאז׳" },
      { icon: "💇‍♀️", name: "סלון שיער נשים" },
      { icon: "🧴", name: "טיפולי גוף" },
      { icon: "💋", name: "איפור מקצועי" },
      { icon: "➕", name: "__ADD__" },
    ],
  },
  food: {
    key: "food",
    label: "מזון ומשקאות",
    icon: "🍽️",
    items: [
      { icon: "🍖", name: "מסעדה" },
      { icon: "☕", name: "קפה / בית קפה" },
      { icon: "🥙", name: "מזון מהיר" },
      { icon: "🍰", name: "מאפייה / קונדיטוריה" },
      { icon: "🍕", name: "פיצרייה" },
      { icon: "🍣", name: "מסעדת דגים / סושי" },
      { icon: "🥗", name: "מסעדה בריאה / טבעוני" },
      { icon: "🚚", name: "קייטרינג" },
      { icon: "🍷", name: "בר / ברסטרו" },
    ],
  },
  fitness: {
    key: "fitness",
    label: "כושר ובריאות",
    icon: "💪",
    items: [
      { icon: "🏋️", name: "חדר כושר" },
      { icon: "🧘", name: "יוגה / פילאטיס" },
      { icon: "🥊", name: "אגרוף / קיק בוקסינג" },
      { icon: "🤸", name: "התעמלות / אקרובטיקה" },
      { icon: "🏊", name: "שחייה" },
      { icon: "🚴", name: "ספינינג / רכיבה" },
      { icon: "🎾", name: "ספורט מחבט" },
      { icon: "🏃", name: "ריצה / אתלטיקה" },
      { icon: "💪", name: "מאמן אישי" },
    ],
  },
  professional: {
    key: "professional",
    label: "שירות מקצועי",
    icon: "💼",
    items: [
      { icon: "⚖️", name: "עורך דין" },
      { icon: "📊", name: "רואה חשבון / יועץ מס" },
      { icon: "🏗️", name: "קבלן / שיפוצניק" },
      { icon: "💡", name: "יועץ עסקי" },
      { icon: "🖥️", name: "מפתח / IT" },
      { icon: "📸", name: "צלם / וידאוגרף" },
      { icon: "🎨", name: "מעצב גרפי / UX" },
      { icon: "📣", name: "שיווק / דיגיטל" },
      { icon: "🔧", name: "טכנאי / חשמלאי" },
    ],
  },
  medical: {
    key: "medical",
    label: "בריאות ורפואה",
    icon: "🏥",
    items: [
      { icon: "👨‍⚕️", name: "רופא / מרפאה" },
      { icon: "🦷", name: "דנטיסט" },
      { icon: "🧠", name: "פסיכולוג / מטפל" },
      { icon: "👁️", name: "אופטומטריסט" },
      { icon: "🦴", name: "פיזיותרפיסט / כירופרקטור" },
      { icon: "💊", name: "תזונאי / דיאטנית" },
      { icon: "👶", name: "רופא ילדים" },
      { icon: "🌿", name: "רפואה משלימה / נטורופת" },
      { icon: "🐾", name: "וטרינר" },
    ],
  },
  retail: {
    key: "retail",
    label: "קמעונאות ואיקומרס",
    icon: "🛍️",
    items: [
      { icon: "👗", name: "חנות בגדים / אופנה" },
      { icon: "📱", name: "אלקטרוניקה / סלולרי" },
      { icon: "🏠", name: "ריהוט / עיצוב הבית" },
      { icon: "📚", name: "ספרים / מוצרי תרבות" },
      { icon: "🌸", name: "פרחים / מתנות" },
      { icon: "🧸", name: "צעצועים / ילדים" },
      { icon: "🐕", name: "חיות מחמד" },
      { icon: "🛒", name: "חנות אונליין" },
      { icon: "🏪", name: "מכולת / סופר" },
    ],
  },
  realestate: {
    key: "realestate",
    label: 'נדל"ן',
    icon: "🏠",
    items: [
      { icon: "🏢", name: 'סוכן נדל"ן' },
      { icon: "🏗️", name: 'יזם נדל"ן' },
      { icon: "🔑", name: "ניהול נכסים" },
      { icon: "🏡", name: "השכרת דירות" },
      { icon: "🏨", name: "מלון / אירוח" },
      { icon: "📋", name: "שמאי מקרקעין" },
      { icon: "🏘️", name: "קבלן בנייה" },
      { icon: "🌴", name: "נופש ותיירות" },
      { icon: "➕", name: "__ADD__" },
    ],
  },
  education: {
    key: "education",
    label: "חינוך והדרכה",
    icon: "📚",
    items: [
      { icon: "📖", name: "מורה פרטי" },
      { icon: "🎓", name: "בית ספר / מכללה" },
      { icon: "💻", name: "קורסים דיגיטליים" },
      { icon: "🎵", name: "מוזיקה / נגינה" },
      { icon: "🎨", name: "אמנות / ציור" },
      { icon: "🗣️", name: "שפות / אנגלית" },
      { icon: "🚗", name: "בית ספר לנהיגה" },
      { icon: "🧒", name: "גן ילדים / פעוטון" },
      { icon: "➕", name: "__ADD__" },
    ],
  },
  events: {
    key: "events",
    label: "אירועים ובידור",
    icon: "🎉",
    items: [
      { icon: "🎉", name: "אולם אירועים" },
      { icon: "🎵", name: "DJ / מוזיקאי" },
      { icon: "📸", name: "צלם אירועים" },
      { icon: "🎂", name: "עוגות ועיצוב" },
      { icon: "🎭", name: "הופעות ובידור" },
      { icon: "💐", name: "עיצוב פרחים" },
      { icon: "🍽️", name: "קייטרינג לאירועים" },
      { icon: "🎪", name: "ארגון בר/בת מצווה" },
      { icon: "➕", name: "__ADD__" },
    ],
  },
  automotive: {
    key: "automotive",
    label: "רכב ותחבורה",
    icon: "🚗",
    items: [
      { icon: "🔧", name: "מוסך / תיקוני רכב" },
      { icon: "🚗", name: "מכירת רכבים" },
      { icon: "🚕", name: "שירות הסעות" },
      { icon: "🚛", name: "הובלות / מעברים" },
      { icon: "🔍", name: "בדיקת רכב לפני קנייה" },
      { icon: "🎨", name: "פחחות וצבע" },
      { icon: "🔋", name: "חשמלאי רכב" },
      { icon: "🚐", name: "השכרת רכב" },
      { icon: "➕", name: "__ADD__" },
    ],
  },
  home: {
    key: "home",
    label: "בית ותחזוקה",
    icon: "🔧",
    items: [
      { icon: "🔧", name: "שיפוצניק כללי" },
      { icon: "⚡", name: "חשמלאי" },
      { icon: "🚿", name: "אינסטלטור" },
      { icon: "❄️", name: "מיזוג אוויר" },
      { icon: "🧹", name: "ניקיון ביתי" },
      { icon: "🌿", name: "גינון ונוף" },
      { icon: "🔒", name: "מנעולן" },
      { icon: "🛋️", name: "ריהוט ועיצוב פנים" },
      { icon: "➕", name: "__ADD__" },
    ],
  },
  travel: {
    key: "travel",
    label: "תיירות ונסיעות",
    icon: "✈️",
    items: [
      { icon: "✈️", name: "סוכנות נסיעות" },
      { icon: "🏨", name: "מלון / צימר" },
      { icon: "🌴", name: "אטרקציות תיירות" },
      { icon: "🚌", name: "טיולים מאורגנים" },
      { icon: "🎒", name: "מדריך טיולים" },
      { icon: "⛵", name: "שייט / ספורט ים" },
      { icon: "📋", name: "ויזות ותיעוד" },
      { icon: "🏕️", name: "קמפינג ואוהלים" },
      { icon: "➕", name: "__ADD__" },
    ],
  },
  other: {
    key: "other",
    label: "אחר",
    icon: "⚙️",
    items: [
      { icon: "📦", name: "לוגיסטיקה / משלוחים" },
      { icon: "🔒", name: "אבטחה" },
      { icon: "🐾", name: "טיפול בחיות מחמד" },
      { icon: "📣", name: "פרסום ומדיה" },
      { icon: "🖨️", name: "דפוס והדפסות" },
      { icon: "♻️", name: "סביבה ומיחזור" },
      { icon: "🎓", name: "הכשרות מקצועיות" },
      { icon: "🏛️", name: "עמותה / מגזר שלישי" },
      { icon: "➕", name: "__ADD__" },
    ],
  },
};

export const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

// Suggested services per main business category (#4). Loaded into the
// onboarding services step when a category is chosen, so the list matches the
// business type instead of always showing the hairdresser defaults. Prices are
// left blank for the owner to fill in.
const s = (name: string): Service => ({ name, price: "" });

export const GENERIC_SERVICES: Service[] = [
  s("בירור כללי"),
  s("תיאום פגישה"),
  s("הצעת מחיר"),
];

export const SERVICES_BY_CATEGORY: Record<string, Service[]> = {
  beauty: [s("תספורת גברים"), s("תספורת נשים"), s("צבע"), s("פן"), s("החלקה"), s("מניקור / פדיקור")],
  food: [s("הזמנת שולחן"), s("הזמנת משלוח"), s("איסוף עצמי"), s("תפריט אירועים"), s("קייטרינג")],
  fitness: [s("אימון אישי"), s("מנוי חודשי"), s("שיעור ניסיון"), s("אימון קבוצתי")],
  professional: [s("פגישת ייעוץ"), s("בדיקת חוזה / מסמכים"), s("ליווי מקצועי"), s("הצעת מחיר")],
  medical: [s("תור ראשון"), s("בדיקה"), s("ייעוץ"), s("מעקב"), s("טיפול")],
  retail: [s("בירור מלאי"), s("ביצוע הזמנה"), s("משלוח"), s("החזרה / החלפה")],
  realestate: [s("תיאום צפייה בנכס"), s("הערכת שווי"), s("ייעוץ"), s("רישום נכס")],
  education: [s("שיעור ניסיון"), s("הרשמה לקורס"), s("שיעור פרטי"), s("ייעוץ לימודי")],
  events: [s("בדיקת זמינות תאריך"), s("הצעת מחיר"), s("סיור / פגישת תיאום"), s("הזמנת אירוע")],
  automotive: [s("תיאום טיפול"), s("בדיקת רכב"), s("הצעת מחיר"), s("שירות דרך / גרירה")],
  home: [s("הזמנת בעל מקצוע"), s("הצעת מחיר"), s("ביקור בבית"), s("שירות דחוף")],
  travel: [s("תיאום נסיעה"), s("הצעת חבילה"), s("ייעוץ יעד"), s("הזמנת מקום")],
  other: GENERIC_SERVICES,
};
