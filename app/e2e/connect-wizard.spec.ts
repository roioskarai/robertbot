import { test, expect } from "@playwright/test";

// Batch 8 — the guided WhatsApp manual-connect wizard (1 מספר → 2 קוד → 3 הצלחה).
// Demo mode makes every step of this flow fully client-side (no network calls),
// so the whole idle→sent→success cycle is deterministic and safe to run in CI.

test("אשף חיבור וואטסאפ ידני — ניתוק, שגיאת טלפון, ואישור מלא עד הצלחה", async ({ page }) => {
  await page.goto("/dashboard");
  // sidebar is an off-canvas drawer (closed by default) — open it via the hamburger first
  await page.locator('[class*="hamburger-btn"]').click();
  await page.getByRole("complementary").getByText("הבוטים שלי").click();

  // demo bots already arrive connected — open the first one and go to the connect tab
  await page.locator('[class*="bot-card"]').first().click();
  await page.getByRole("button", { name: "חיבור וואטסאפ" }).click();
  await expect(page.getByText(/מחובר —/)).toBeVisible();

  // disconnect (demo mode: instant, client-side only) → wizard resets to step 1
  await page.getByRole("button", { name: "נתק מספר" }).click();
  await expect(page.getByText("לא מחובר")).toBeVisible();
  await expect(page.getByText("מספר", { exact: true })).toBeVisible();

  // invalid phone → inline field error, no step change
  const phoneInput = page.getByPlaceholder("05X-XXXXXXX");
  await phoneInput.fill("123");
  await page.getByRole("button", { name: "שלח קוד" }).click();
  await expect(page.locator('[class*="field-err"]')).toContainText("מספר טלפון לא תקין");

  // valid phone → advances to step 2 (code)
  await phoneInput.fill("0501234567");
  await page.getByRole("button", { name: "שלח קוד" }).click();
  await expect(page.getByText(/שלחנו קוד אימות אל/)).toBeVisible();

  // too-short code → inline field error, still on step 2
  const codeInput = page.getByPlaceholder("קוד אימות");
  await codeInput.fill("1");
  await page.getByRole("button", { name: "אמת וחבר" }).click();
  await expect(page.locator('[class*="field-err"]')).toContainText("הזן את הקוד שקיבלת");

  // any code (demo mode) → step 3 success screen shows the connected number
  await codeInput.fill("1234");
  await page.getByRole("button", { name: "אמת וחבר" }).click();
  await expect(page.getByText("המספר חובר בהצלחה!")).toBeVisible();
  await expect(page.getByText("0501234567")).toBeVisible();

  await page.screenshot({ path: "e2e/baseline/connect-wizard-success.png", fullPage: true });
});
