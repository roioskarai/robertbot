/** @type {import('next').NextConfig} */

// כותרות אבטחה תקניות לכל הנתיבים. CSP מושאר בכוונה בחוץ (מחמיר מדי לשלב הזה,
// עלול לשבור סקריפטים/סטיילים של Next.js — נוסיף בנפרד עם בדיקה).
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // שלב 1 של CSP: דיווח-בלבד (לא חוסם כלום). הפרות נראות ב-DevTools Console.
  // בגל 8 עוברים לאכיפה מבוססת-nonce דרך proxy.ts אחרי מחזור איסוף.
  {
    key: 'Content-Security-Policy-Report-Only',
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co https://graph.facebook.com; frame-src https://www.facebook.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
  },
];

// הערה: ה-alias של "@" מוגדר ב-tsconfig.json (paths) — Next פותר אותו נטיבית,
// גם תחת Turbopack (ברירת המחדל מ-Next 16). אין צורך ב-webpack override.
const nextConfig = {
  poweredByHeader: false,
  // כפתור ה-DevTools הצף של Next (dev בלבד) יושב בפינה השמאלית-תחתונה וחוסם
  // קליקים על כפתורי footer ב-RTL — גם בבדיקות Playwright שרצות מול next dev.
  // אין לו שום השפעה על פרודקשן.
  devIndicators: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
