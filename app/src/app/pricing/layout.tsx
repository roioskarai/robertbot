import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מחירים ומסלולים",
  description:
    "מסלולי Robert לעסקים: בסיסי ₪99, מקצועי ₪199, עסקים ₪399 וארגוני ₪699 לחודש. 7 ימי ניסיון חינם, ללא התחייבות.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "מחירים ומסלולים · Robert",
    description: "בוט וואטסאפ חכם לעסק שלך החל מ-₪99 לחודש. 7 ימי ניסיון חינם.",
    url: "/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
