import { defineConfig } from "@playwright/test";

// Smoke suite runs against a dev server FORCED into demo mode (placeholder
// Supabase keys override .env.local) — so it exercises exactly what CI runs
// and never touches production data.
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "he-IL",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder",
      SUPABASE_SERVICE_ROLE_KEY: "placeholder",
      ANTHROPIC_API_KEY: "",
      STRIPE_SECRET_KEY: "",
      TWILIO_ACCOUNT_SID: "",
      TWILIO_AUTH_TOKEN: "",
      RESEND_API_KEY: "",
    },
  },
});
