// Business categories + subcategories — from robert-onboarding.html.
// `__ADD__` marks the "add custom" tile.

import type { Service, FaqItem } from "@/lib/types";

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

// Contextual PLACEHOLDER examples per business category (#10) — realistic
// sample business name + description + a couple of FAQs so the wizard doesn't
// always show the same hair-salon example. These are placeholders only; the
// owner replaces them with real data.
export interface CategoryExamples {
  namePh: string;
  descPh: string;
  faq: FaqItem[];
  styleExample?: string;
}

const f = (question: string, answer: string): FaqItem => ({ question, answer });

const GENERIC_EXAMPLES: CategoryExamples = {
  namePh: 'לדוגמה: "העסק של ישראל"',
  descPh: "ספר על העסק שלך — מה אתה מציע, למי, ומה מיוחד בך.",
  faq: [
    f("מה שעות הפעילות?", "א'-ה' 9:00-18:00, שישי עד 13:00, שבת סגור"),
    f("איך יוצרים קשר?", "אפשר לכתוב לי כאן בוואטסאפ ואחזור אליך בהקדם."),
  ],
};

export const EXAMPLES_BY_CATEGORY: Record<string, CategoryExamples> = {
  beauty: {
    namePh: 'לדוגמה: "מספרת מיטל"',
    descPh: "מספרה שכונתית עם צוות מנוסה, אווירה נעימה ותורים גמישים.",
    faq: [
      f("מה שעות הפעילות?", "א'-ה' 9:00-19:00, שישי 9:00-14:00, שבת סגור"),
      f("צריך לקבוע תור מראש?", "מומלץ! שלח לי תאריך ושעה נוחים ואשריין לך מקום."),
    ],
    styleExample: '"שלום! תספורת נשים ₪120. לתור — שלחי לי תאריך ושעה 💇"',
  },
  food: {
    namePh: 'לדוגמה: "הגריל של אבי"',
    descPh: "מסעדת בשרים משפחתית עם משלוחים לכל האזור והזמנת שולחנות.",
    faq: [
      f("יש משלוחים?", "כן, לכל האזור. שלח לי כתובת ואבדוק זמן הגעה ועלות."),
      f("אפשר להזמין שולחן?", "בהחלט — כמה סועדים ולאיזו שעה?"),
    ],
    styleExample: '"היי! משלוח מגיע תוך 40 דק\'. מה בא לך להזמין? 🍔"',
  },
  fitness: {
    namePh: 'לדוגמה: "סטודיו כושר של דן"',
    descPh: "סטודיו אימונים אישיים וקבוצתיים עם מאמנים מוסמכים.",
    faq: [
      f("יש שיעור ניסיון?", "כן! שיעור ניסיון ראשון חינם. מתי נוח לך לבוא?"),
      f("מה כולל המנוי החודשי?", "אימונים ללא הגבלה + תוכנית אישית. אשלח לך פרטים."),
    ],
    styleExample: '"מעולה שאתה רוצה להתחיל! 💪 שיעור ניסיון ראשון עלינו."',
  },
  professional: {
    namePh: 'לדוגמה: "משרד עו"ד ישראלי"',
    descPh: "שירות מקצועי אמין עם פגישת ייעוץ ראשונית וליווי אישי.",
    faq: [
      f("כמה עולה פגישת ייעוץ?", "פגישת ההיכרות הראשונה חינם. מתי נוח לך?"),
      f("כמה זמן לוקח?", "תלוי בתיק — אחרי פגישת ההיכרות אתן לך הערכה מדויקת."),
    ],
    styleExample: '"שלום, אשמח לעזור. נקבע פגישת ייעוץ ראשונית ללא עלות?"',
  },
  medical: {
    namePh: 'לדוגמה: "מרפאת שיניים ד"ר כהן"',
    descPh: "מרפאה עם צוות מקצועי, טיפול אישי ותורים גמישים.",
    faq: [
      f("איך קובעים תור?", "שלח לי מה אתה צריך ואציע כמה מועדים קרובים."),
      f("יש טיפול דחוף?", "כן, במקרים דחופים נשתדל לשבץ אותך היום."),
    ],
    styleExample: '"שלום! לקביעת תור — כתוב לי מה הבעיה ואציע מועדים 🦷"',
  },
  retail: {
    namePh: 'לדוגמה: "חנות התכשיטים של רוני"',
    descPh: "חנות עם מגוון מוצרים, משלוחים ושירות לקוחות אישי בוואטסאפ.",
    faq: [
      f("יש את המוצר במלאי?", "שלח לי שם או תמונה ואבדוק לך מיד."),
      f("איך מזמינים?", "בוחרים מוצר, שולחים כתובת, ואני מסדר משלוח 📦"),
    ],
    styleExample: '"היי! המוצר במלאי ✅ רוצה שאסדר לך משלוח?"',
  },
  realestate: {
    namePh: 'לדוגמה: "נדל"ן אלי"',
    descPh: "תיווך נכסים למכירה והשכרה עם ליווי אישי לאורך כל התהליך.",
    faq: [
      f("אפשר לתאם צפייה?", "בטח! איזה נכס עניין אותך ומתי נוח לך לבוא?"),
      f("עושים הערכת שווי?", "כן — שלח פרטי נכס ואחזור אליך עם הערכה."),
    ],
    styleExample: '"שלום! יש לי כמה נכסים שיתאימו לך. נתאם צפייה? 🏠"',
  },
  education: {
    namePh: 'לדוגמה: "לימודי אנגלית עם שרה"',
    descPh: "שיעורים פרטיים וקבוצתיים עם מורים מנוסים והתאמה אישית.",
    faq: [
      f("יש שיעור ניסיון?", "כן! שיעור ניסיון ראשון במחיר מוזל. מתי מתאים לך?"),
      f("איך נרשמים לקורס?", "בחר קורס ואשלח לך את כל הפרטים וההרשמה."),
    ],
    styleExample: '"שמח שבחרת ללמוד! 📚 בוא נקבע שיעור ניסיון."',
  },
  events: {
    namePh: 'לדוגמה: "הפקות אירועים של נועה"',
    descPh: "הפקת אירועים בהתאמה אישית — חתונות, ימי הולדת ואירועים עסקיים.",
    faq: [
      f("התאריך שלי פנוי?", "שלח לי תאריך ואבדוק זמינות מיד."),
      f("כמה זה עולה?", "תלוי בגודל האירוע — אשמח לשלוח הצעת מחיר מותאמת."),
    ],
    styleExample: '"מזל טוב! 🎉 שלח לי תאריך ואבדוק אם אנחנו פנויים."',
  },
  automotive: {
    namePh: 'לדוגמה: "מוסך רכב של משה"',
    descPh: "מוסך אמין לכל סוגי הרכבים — טיפולים, בדיקות ושירות דרך.",
    faq: [
      f("אפשר לתאם טיפול?", "בטח — איזה רכב יש לך ומתי נוח לך להביא?"),
      f("יש שירות דרך?", "כן, 24/7. שלח מיקום ונגיע אליך בהקדם."),
    ],
    styleExample: '"שלום! נשמע שהרכב צריך טיפול 🔧 מתי נוח לך להביא?"',
  },
  home: {
    namePh: 'לדוגמה: "שיפוצים של יוסי"',
    descPh: "שירותי בית ותחזוקה מקצועיים עם הצעת מחיר וביקור בבית.",
    faq: [
      f("אפשר לקבל הצעת מחיר?", "כן! ספר לי מה צריך ואחזור אליך עם הצעה."),
      f("מתי אפשר להגיע?", "אתן לך כמה מועדים קרובים — מה מתאים לך?"),
    ],
    styleExample: '"שלום! ספר לי מה צריך לתקן ואשלח הצעת מחיר 🛠️"',
  },
  travel: {
    namePh: 'לדוגמה: "סוכנות הנסיעות של דנה"',
    descPh: "תכנון חופשות וחבילות נופש בהתאמה אישית ליעדים בכל העולם.",
    faq: [
      f('יש חבילות לחו"ל?', "בטח! לאיזה יעד ובאילו תאריכים? אבנה לך חבילה."),
      f("אפשר לתכנן טיול?", "כן — ספר לי מה אתה מחפש ואבנה מסלול מותאם."),
    ],
    styleExample: '"שלום! ✈️ לאן בא לך לטוס? אבנה לך חבילה מושלמת."',
  },
  other: GENERIC_EXAMPLES,
};

export function examplesFor(category: string | null): CategoryExamples {
  return (category && EXAMPLES_BY_CATEGORY[category]) || GENERIC_EXAMPLES;
}
