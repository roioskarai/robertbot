import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "תקנון ומדיניות פרטיות",
  description: "תנאי השימוש ומדיניות הפרטיות של Robert — בוט וואטסאפ חכם לעסקים.",
  alternates: { canonical: "/legal" },
  robots: { index: true, follow: true },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
