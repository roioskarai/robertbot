import { test, expect } from "@playwright/test";

// Baseline screenshots land in e2e/baseline/ (gitignored) — kept as CI
// artifacts and for eyeballing V2 regressions against the pre-redesign state.
const shot = (name: string) => ({ path: `e2e/baseline/${name}.png`, fullPage: true as const });

test("דף הבית נטען בעברית, RTL, עם קריאה לפעולה", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  // CMS hero renders with a signup CTA somewhere on the page
  await expect(page.locator('a[href*="onboarding"], a[href*="login"]').first()).toBeVisible();
  await page.screenshot(shot("landing"));
});

test("עמוד ההתחברות מציג טופס אימייל+סיסמה", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
  await expect(page.locator('button[type="submit"], button').first()).toBeVisible();
  await page.screenshot(shot("login"));
});

test("הדשבורד נטען במצב דמו בלי הפניה להתחברות", async ({ page }) => {
  await page.goto("/dashboard");
  // demo mode bypasses the auth guard — we must stay on /dashboard
  await expect(page).toHaveURL(/\/dashboard/);
  // the sidebar/content renders meaningful demo data (not a blank shell)
  await expect(page.getByText(/סקירה|הבוטים שלי/).first()).toBeVisible();
  await page.screenshot(shot("dashboard"));
});

test("עמוד התמחור מציג מחירים בשקלים", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText(/₪/).first()).toBeVisible();
  await page.screenshot(shot("pricing"));
});

test("כניסת אדמין מציגה טופס מאובטח", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
  await page.screenshot(shot("admin-login"));
});

test("האונבורדינג נטען ומציג את האשף", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.locator("body")).toContainText(/בוט|עסק/);
  await page.screenshot(shot("onboarding"));
});
