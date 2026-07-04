import { test, expect } from "@playwright/test";

// The dark-mode toggle must change the theme in ONE click, from any
// starting state (the old 3-state cycle needed two clicks in some states).

test("מתג מצב כהה — לחיצה אחת ממצב בהיר", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.locator('button[title="מצב כהה"], button[title="מצב בהיר"]').first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("מתג מצב כהה — לחיצה אחת כשמאוחסן dark ומערכת ההפעלה כהה", async ({ browser }) => {
  // the exact combination that used to require two clicks
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("robert-theme", "dark"));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator('button[title="מצב בהיר"]').first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await context.close();
});

test("העדפת theme נשמרת אחרי רענון", async ({ page }) => {
  await page.goto("/");
  await page.locator('button[title="מצב כהה"]').first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
