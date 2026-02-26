import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Full Page Screenshot Audit
// Takes full-page screenshots of every key page for visual comparison to spec.
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "demo@jobstream.app";
const DEMO_PASSWORD = "password123";

async function loginAsDemo(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

test.describe("Screenshot Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("01 -- Dashboard", async ({ page }) => {
    await page.screenshot({ path: "screenshots/01-dashboard.png", fullPage: true });
  });

  test("02 -- Jobs (Unscheduled tab)", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("main").getByRole("heading", { name: "Jobs" })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "screenshots/02-jobs-unscheduled.png", fullPage: true });
  });

  test("03 -- Jobs (Upcoming tab)", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("main").getByRole("heading", { name: "Jobs" })).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: /Upcoming/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "screenshots/03-jobs-upcoming.png", fullPage: true });
  });

  test("04 -- Jobs (Awaiting Approval tab)", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("main").getByRole("heading", { name: "Jobs" })).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: /Awaiting Approval/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "screenshots/04-jobs-awaiting-approval.png", fullPage: true });
  });

  test("05 -- Jobs (Needs Invoicing tab)", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("main").getByRole("heading", { name: "Jobs" })).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: /Needs Invoicing/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "screenshots/05-jobs-needs-invoicing.png", fullPage: true });
  });

  test("06 -- Jobs (Awaiting Payment tab)", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("main").getByRole("heading", { name: "Jobs" })).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: /Awaiting Payment/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "screenshots/06-jobs-awaiting-payment.png", fullPage: true });
  });

  test("07 -- Jobs (Closed tab)", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("main").getByRole("heading", { name: "Jobs" })).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: /^Closed/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "screenshots/07-jobs-closed.png", fullPage: true });
  });

  test("08 -- Jobs (Recurring tab)", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("main").getByRole("heading", { name: "Jobs" })).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: /Recurring/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "screenshots/08-jobs-recurring.png", fullPage: true });
  });

  test("09 -- New Job form", async ({ page }) => {
    await page.goto("/jobs/new");
    await expect(page.getByRole("heading", { name: "New Job" })).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: "screenshots/09-new-job.png", fullPage: true });
  });

  test("10 -- Job Detail", async ({ page }) => {
    // Find the first job in the list and navigate to its detail
    await page.goto("/jobs");
    await expect(page.getByRole("main").getByRole("heading", { name: "Jobs" })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);
    const firstJobLink = page.locator("table a.font-mono").first();
    if (await firstJobLink.count() > 0) {
      await firstJobLink.click();
      await expect(page).toHaveURL(/\/jobs\/[a-z0-9-]+/, { timeout: 10000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: "screenshots/10-job-detail.png", fullPage: true });
    }
  });

  test("11 -- Customers list", async ({ page }) => {
    await page.goto("/customers");
    await expect(page.getByRole("main").locator("h1", { hasText: "Customers" })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "screenshots/11-customers-list.png", fullPage: true });
  });

  test("12 -- Customer Detail", async ({ page }) => {
    await page.goto("/customers");
    await expect(page.getByText(/total/)).toBeVisible({ timeout: 10000 });
    const firstLink = page.getByRole("main").getByRole("link").filter({ hasNotText: /customers/i }).first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
      await expect(page).toHaveURL(/\/customers\/[a-z0-9-]+/, { timeout: 10000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: "screenshots/12-customer-detail.png", fullPage: true });
    }
  });

  test("13 -- Schedule (Day view)", async ({ page }) => {
    await page.goto("/schedule");
    await expect(page.getByRole("main").getByRole("heading", { name: "Schedule" })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "screenshots/13-schedule-day.png", fullPage: true });
  });

  test("14 -- Schedule (List view)", async ({ page }) => {
    await page.goto("/schedule");
    await expect(page.getByRole("main").getByRole("heading", { name: "Schedule" })).toBeVisible({ timeout: 10000 });
    const listBtn = page.getByRole("button", { name: /list/i });
    if (await listBtn.isVisible()) {
      await listBtn.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: "screenshots/14-schedule-list.png", fullPage: true });
  });

  test("15 -- Invoices (Draft tab)", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page.getByRole("main").getByRole("heading", { name: "Invoices" })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "screenshots/15-invoices-draft.png", fullPage: true });
  });

  test("16 -- Invoices (all tabs visible)", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page.getByRole("main").getByRole("heading", { name: "Invoices" })).toBeVisible({ timeout: 10000 });
    // Click through a few tabs to show they all work
    await page.getByRole("tab", { name: /Sent/i }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "screenshots/16-invoices-sent.png", fullPage: true });
  });

  test("17 -- Reports", async ({ page }) => {
    await page.goto("/reports");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "screenshots/17-reports.png", fullPage: true });
  });

  test("18 -- Settings > General", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings\/general/, { timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "screenshots/18-settings-general.png", fullPage: true });
  });

  test("19 -- Settings > Communications (Notification Settings)", async ({ page }) => {
    await page.goto("/settings/communications");
    await expect(page.getByRole("heading", { name: "Notification Settings" })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "screenshots/19-settings-notifications.png", fullPage: true });
  });

  test("20 -- Login page (logged out)", async ({ page }) => {
    // Log out first
    await page.locator("header").getByRole("button").last().click();
    await page.getByRole("menuitem", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await page.screenshot({ path: "screenshots/20-login.png", fullPage: true });
  });
});
