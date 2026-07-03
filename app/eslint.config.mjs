import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  {
    ignores: [
      ".next/**",
      "out/**",
      "next-env.d.ts",
      "test-results/**",
      "playwright-report/**",
      "e2e/baseline/**",
    ],
  },
  {
    extends: [...nextCoreWebVitals, ...nextTypescript],
  },
  {
    // הכללים החדשים של react-hooks v7 תופסים את דפוס ה-fetch+useEffect ורכיבים
    // מקוננים בקוד הקיים (דשבורד/אדמין) — קוד שמוחלף ב-SWR ובפירוק לרכיבים
    // בגלים 6–7 של תוכנית הטרנספורמציה. עד אז: אזהרה, לא שגיאה. קוד חדש לא
    // אמור לייצר אותן. להחזיר ל-error בגל 10 (הליטוש הסופי).
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);
