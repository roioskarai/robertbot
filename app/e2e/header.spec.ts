import { test, expect } from "@playwright/test";

// Batch-3 fixes: auth buttons visible on EVERY viewport (they used to live
// inside .nav-links which mobile CSS hides), logo navigates home everywhere,
// and the green circle-arrow logo mark is deleted across the app.

test("מובייל — כפתורי כניסה+הרשמה גלויים בהדר הציבורי (390px)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // demo/CI resolves auth to "out" → both buttons must be visible on mobile
  await expect(page.locator('nav a[href="/login"]')).toBeVisible();
  await expect(page.locator('nav a[href="/onboarding"]')).toBeVisible();
  await page.screenshot({ path: "e2e/baseline/header-mobile.png" });
});

test("לחיצה על הלוגו בעמוד ההתחברות חוזרת לדף הבית", async ({ page }) => {
  await page.goto("/login");
  await page.locator('[class*="lg-logo"]').first().click();
  await expect(page).toHaveURL(/\/$/);
});

test("לוגו האשף באונבורדינג מקושר לדף הבית", async ({ page }) => {
  await page.goto("/onboarding?new=1");
  const logo = page.locator('[class*="ob-logo"]').first();
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("href", "/");
});

test("סימן החץ-בעיגול נמחק מכל העמודים", async ({ page }) => {
  for (const path of ["/", "/login", "/dashboard", "/onboarding", "/pricing"]) {
    await page.goto(path);
    await expect(page.locator('[class*="logo-mark"]')).toHaveCount(0);
  }
});
