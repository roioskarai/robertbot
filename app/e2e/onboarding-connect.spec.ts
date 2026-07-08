import { test, expect } from "@playwright/test";

// Batch-2 feature: onboarding step 5 is the REAL guided connect wizard
// (1 מספר → 2 קוד → 3 הצלחה) instead of a static explainer, and the success
// screen adapts: connected → "הבוט שלך מוכן!", skipped → "הבוט שלך כמעט מוכן!".
// Demo mode keeps every transition client-side — deterministic in CI.

// Drives the wizard through steps 1-4 with the minimum required input
// (subtype required at step 1, business name at step 2; services are
// pre-populated by the category, style has a default).
async function reachStep5(page: import("@playwright/test").Page, bizName: string) {
  await page.goto("/onboarding?new=1");
  await page.getByText("יופי וטיפוח").first().click();
  await page.getByText("ספר / מספרה").click();
  await page.getByRole("button", { name: "המשך" }).click();
  await page.getByPlaceholder('לדוגמה: "מספרת מיטל"').fill(bizName);
  await page.getByRole("button", { name: "המשך" }).click(); // → services
  await page.getByRole("button", { name: "המשך" }).click(); // → style
  await page.getByRole("button", { name: "המשך" }).click(); // → whatsapp
  await expect(page.getByText("שלב 5 מתוך 5")).toBeVisible();
}

test("אשף חיבור בשלב 5 — שגיאת טלפון, אימות מלא, ומסך סיום 'מוכן' עם סטטוס מחובר", async ({ page }) => {
  await reachStep5(page, "מספרת בדיקה");

  // the guided wizard renders with its step badges
  await expect(page.locator('[class*="wa-step-label"]').filter({ hasText: "מספר" })).toBeVisible();

  // invalid phone → inline error
  const phoneInput = page.getByPlaceholder("05X-XXXXXXX");
  await phoneInput.fill("123");
  await page.getByRole("button", { name: "שלח קוד" }).click();
  await expect(page.locator('[class*="field-err"]')).toContainText("מספר טלפון לא תקין");

  // valid phone → code pane → any code (demo) → verified
  await phoneInput.fill("0501234567");
  await page.getByRole("button", { name: "שלח קוד" }).click();
  await expect(page.getByText(/שלחנו קוד אימות אל/)).toBeVisible();
  await page.getByPlaceholder("קוד אימות").fill("1234");
  await page.getByRole("button", { name: "אמת וחבר" }).click();
  await expect(page.getByText("המספר אומת בהצלחה!")).toBeVisible();

  // Verified → the wizard auto-continues to the connected success screen
  // (requirement 2: "Connection confirmed → Continue automatically").
  await expect(page.getByText("הבוט שלך מוכן!")).toBeVisible();
  await expect(page.getByText("מחובר לוואטסאפ", { exact: true })).toBeVisible();
  await expect(page.locator('[class*="sd-val"]').filter({ hasText: "0501234567" })).toBeVisible();
  await expect(page.getByRole("button", { name: "כניסה ל-Dashboard" })).toBeVisible();

  await page.screenshot({ path: "e2e/baseline/onboarding-connected.png", fullPage: true });
});

test("שלב 5 — 'דלג לעכשיו' יוצר בוט לא-מחובר עם מסך 'כמעט מוכן'", async ({ page }) => {
  await reachStep5(page, "עסק דילוג");

  await page.getByText("דלג לעכשיו — אחבר מאוחר יותר מה-Dashboard").click();

  await expect(page.getByText("הבוט שלך כמעט מוכן!")).toBeVisible();
  await expect(page.getByText("ממתין לחיבור וואטסאפ")).toBeVisible();
  await expect(page.locator('[class*="sd-val"]').filter({ hasText: "---" })).toBeVisible();
  await expect(page.getByRole("button", { name: "חבר וואטסאפ ב-Dashboard" })).toBeVisible();

  await page.screenshot({ path: "e2e/baseline/onboarding-skipped.png", fullPage: true });
});
