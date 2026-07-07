import { test, expect } from "@playwright/test";

// Batch-1 fix: the Inbox chat panel used to be a hardcoded mock ("מספרת מיטל"
// bubbles rendered in ALL modes). Now it renders a real per-conversation
// thread; in demo mode a deterministic fixture stands in for it.

test("Inbox — בחירת שיחה מציגה שרשור אמיתי (fixture בדמו) ושדה תגובה", async ({ page }) => {
  await page.goto("/dashboard");
  // sidebar is an off-canvas drawer (closed by default) — open it via the hamburger
  await page.locator('[class*="hamburger-btn"]').click();
  await page.getByRole("complementary").getByText("Inbox").click();

  // demo conversations list renders; pick the first one
  await page.locator('[class*="conv-item"]').first().click();

  // chat header shows the conversation's real customer name (not the "—" placeholder)
  await expect(page.locator('[class*="chat-hdr"]')).toContainText("רחל לוי");

  // the demo thread fixture renders as bubbles
  await expect(page.getByText("יש לך מקום פנוי ביום שישי בבוקר?")).toBeVisible();
  await expect(page.getByText(/ביום שישי יש מקומות ב-09:00/)).toBeVisible();

  // reply input + actions are present
  await expect(page.locator("#reply-input")).toBeVisible();
  await expect(page.getByRole("button", { name: "שלח", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "החזר ל-Robert" })).toBeVisible();

  // sending a reply appends it to the thread (demo: client-side)
  await page.locator("#reply-input").fill("בודקים את התגובה");
  await page.getByRole("button", { name: "שלח", exact: true }).click();
  await expect(page.getByText("בודקים את התגובה").last()).toBeVisible();

  await page.screenshot({ path: "e2e/baseline/inbox-thread.png", fullPage: true });
});
