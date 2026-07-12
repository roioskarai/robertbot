import type { Metadata } from "next";
import { guardPublicMaintenance } from "@/lib/system-settings";

export const metadata: Metadata = {
  title: "תקנון ומדיניות פרטיות",
  description: "תנאי השימוש ומדיניות הפרטיות של Robert — בוט וואטסאפ חכם לעסקים.",
  alternates: { canonical: "/legal" },
  robots: { index: true, follow: true },
};

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  await guardPublicMaintenance();
  return children;
}
