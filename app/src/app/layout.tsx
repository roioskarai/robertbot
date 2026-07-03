import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-rubik",
  display: "swap",
});

const SITE_DESCRIPTION =
  "Robert עונה, מסביר וקובע פגישות ללקוחות שלך בוואטסאפ — בשמך, 24/7. הקמה תוך 5 דקות, ללא קוד.";

export const metadata: Metadata = {
  metadataBase: new URL("https://robertbot.co.il"),
  title: {
    default: "Robert — הבוט שעובד בשבילך",
    template: "%s · Robert",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: "Robert",
    title: "Robert — בוט וואטסאפ חכם לעסק שלך",
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Robert — בוט וואטסאפ חכם לעסק שלך",
    description: SITE_DESCRIPTION,
  },
  // ?v=2 busts cached copies of the old "R" favicon across browsers/CDN.
  icons: {
    icon: [{ url: "/favicon.svg?v=2", type: "image/svg+xml" }],
    shortcut: "/favicon.svg?v=2",
    apple: "/favicon.svg?v=2",
  },
  manifest: "/site.webmanifest",
};

// Organization + product schema for rich results (Google Israel).
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://robertbot.co.il/#org",
      name: "Robert",
      url: "https://robertbot.co.il",
      logo: "https://robertbot.co.il/favicon.svg",
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "SoftwareApplication",
      name: "Robert",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "he",
      description: SITE_DESCRIPTION,
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "ILS",
        lowPrice: "99",
        highPrice: "699",
        offerCount: 4,
      },
      provider: { "@id": "https://robertbot.co.il/#org" },
    },
  ],
};

export const viewport: Viewport = {
  themeColor: "#101828",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint to avoid a flash of the wrong mode.
            "system" resolves via prefers-color-scheme; no preference = light
            (dark-by-OS becomes the default only after the wave-10 dark QA pass). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var p=localStorage.getItem('robert-theme');var t=p;if(p==='system'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}else if(p!=='dark'&&p!=='light'){t='light';}document.documentElement.dataset.theme=t;}catch(e){}})();",
          }}
        />
      </head>
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </body>
    </html>
  );
}
