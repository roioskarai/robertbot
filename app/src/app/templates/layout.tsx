import type { Metadata } from "next";
import { guardPublicMaintenance } from "@/lib/system-settings";

export const metadata: Metadata = {
  title: "תבניות בוט מוכנות",
  description:
    "תבניות בוט וואטסאפ מוכנות לפי סוג עסק: מספרות, קוסמטיקה, מסעדות, קליניקות, חנויות ובעלי מקצוע. התחל תוך דקות.",
  alternates: { canonical: "/templates" },
  openGraph: {
    title: "תבניות בוט מוכנות · Robert",
    description: "בחר תבנית לפי סוג העסק שלך והבוט מוכן תוך דקות.",
    url: "/templates",
  },
};

export default async function TemplatesLayout({ children }: { children: React.ReactNode }) {
  await guardPublicMaintenance();
  return children;
}
