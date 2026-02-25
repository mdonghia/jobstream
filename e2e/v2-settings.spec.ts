import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// V2 Settings & Notification Settings Tests
// ---------------------------------------------------------------------------
// These tests verify the settings page layout (sidebar navigation, heading),
// the communications/notifications page (three audience sections with specific
// notification types), toggle switches, and channel checkboxes.
//
// All tests use the demo account (demo@jobstream.app / password123).
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "demo@jobstream.app";
const DEMO_PASSWORD = "password123";

/** Helper: log in with the demo account. */
async function loginAsDemo(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
test.describe("V2 Settings & Notification Settings", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  // -----------------------------------------------------------------------
  // 1. Settings page loads
  // -----------------------------------------------------------------------
  test("Settings page loads with heading and navigation links", async ({
    page,
  }) => {
    await page.goto("/settings");

    // /settings redirects to /settings/general
    await expect(page).toHaveURL(/\/settings\/general/, { timeout: 10000 });

    // The main "Settings" heading should be visible
    await expect(
      page.getByRole("main").locator("h1", { hasText: "Settings" })
    ).toBeVisible({ timeout: 10000 });

    // Verify key navigation links are present in the settings layout
    const navLinks = [
      "General",
      "Team Members",
      "Services",
      "Payments",
      "Communications",
      "Billing",
    ];

    for (const linkText of navLinks) {
      await expect(
        page.getByRole("link", { name: linkText })
      ).toBeVisible();
    }
  });

  // -----------------------------------------------------------------------
  // 2. Navigate to Communications / Notification Settings
  // -----------------------------------------------------------------------
  test("Communications page shows Notification Settings heading and three sections", async ({
    page,
  }) => {
    await page.goto("/settings/communications");

    // "Notification Settings" heading (h2 in the component)
    await expect(
      page.getByRole("heading", { name: "Notification Settings" })
    ).toBeVisible({ timeout: 15000 });

    // Three section headings
    await expect(
      page.getByRole("heading", { name: "Customer Notifications" })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Admin Notifications" })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Technician Notifications" })
    ).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // 3. Customer notification types
  // -----------------------------------------------------------------------
  test("Customer Notifications section lists all expected notification types", async ({
    page,
  }) => {
    await page.goto("/settings/communications");

    await expect(
      page.getByRole("heading", { name: "Notification Settings" })
    ).toBeVisible({ timeout: 15000 });

    const customerNotificationTypes = [
      "Visit Confirmed",
      "Visit Reminder",
      "Tech On the Way",
      "Quote Ready",
      "Quote Approved Confirmation",
      "Invoice Sent",
      "Invoice Reminder",
      "Payment Received",
    ];

    for (const label of customerNotificationTypes) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  // -----------------------------------------------------------------------
  // 4. Admin notification types
  // -----------------------------------------------------------------------
  test("Admin Notifications section lists all expected notification types", async ({
    page,
  }) => {
    await page.goto("/settings/communications");

    await expect(
      page.getByRole("heading", { name: "Notification Settings" })
    ).toBeVisible({ timeout: 15000 });

    const adminNotificationTypes = [
      "New Scheduled Job",
      "New Unscheduled Job",
      "Quote Approved",
      "Invoice Overdue",
    ];

    for (const label of adminNotificationTypes) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  // -----------------------------------------------------------------------
  // 5. Tech notification types
  // -----------------------------------------------------------------------
  test("Technician Notifications section lists all expected notification types", async ({
    page,
  }) => {
    await page.goto("/settings/communications");

    await expect(
      page.getByRole("heading", { name: "Notification Settings" })
    ).toBeVisible({ timeout: 15000 });

    const techNotificationTypes = [
      "New Visit Assigned",
      "Visit Rescheduled",
    ];

    for (const label of techNotificationTypes) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  // -----------------------------------------------------------------------
  // 6. Toggle switch works (auto-save)
  // -----------------------------------------------------------------------
  test("Notification toggle switch can be clicked to toggle on/off", async ({
    page,
  }) => {
    await page.goto("/settings/communications");

    await expect(
      page.getByRole("heading", { name: "Notification Settings" })
    ).toBeVisible({ timeout: 15000 });

    // Find the first toggle switch on the page (there should be many)
    const switches = page.getByRole("switch");
    const switchCount = await switches.count();
    expect(switchCount).toBeGreaterThan(0);

    // Get the first switch and capture its initial state
    const firstSwitch = switches.first();
    const initialState = await firstSwitch.getAttribute("data-state");

    // Click to toggle
    await firstSwitch.click();

    // Wait briefly for the auto-save debounce to settle
    await page.waitForTimeout(600);

    // Verify the state changed
    const newState = await firstSwitch.getAttribute("data-state");
    expect(newState).not.toBe(initialState);

    // Toggle back to restore original state
    await firstSwitch.click();
    await page.waitForTimeout(600);

    // Verify it's back to the original state
    const restoredState = await firstSwitch.getAttribute("data-state");
    expect(restoredState).toBe(initialState);
  });

  // -----------------------------------------------------------------------
  // 7. Channel checkboxes exist
  // -----------------------------------------------------------------------
  test("Channel checkboxes exist: Email/SMS for customer, Email/SMS/In-App for admin and tech", async ({
    page,
  }) => {
    await page.goto("/settings/communications");

    await expect(
      page.getByRole("heading", { name: "Notification Settings" })
    ).toBeVisible({ timeout: 15000 });

    // --- Customer section should have Email and SMS column headers ---
    // The table headers contain "EMAIL" and "SMS" (uppercase) in the
    // customer notifications table. We check by looking for the column
    // header text "Email" and "SMS" in the table.

    // Verify checkboxes exist on the page. With 8 customer types x 2 channels
    // + 4 admin types x 3 channels + 2 tech types x 3 channels = 34 checkboxes
    // (at minimum -- some may be more or fewer depending on toggle state).
    const checkboxes = page.getByRole("checkbox");
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBeGreaterThanOrEqual(14); // At least 14 visible

    // Verify that "In-App" column header appears (only in admin and tech sections)
    // The notification-settings-v2.tsx uses "In-App" as a channel label
    await expect(page.getByText("In-App").first()).toBeVisible();

    // Verify specific aria-labels on checkboxes to confirm channel assignment.
    // Customer notifications have Email and SMS checkboxes with aria-labels
    // like "Visit Confirmed Email" and "Visit Confirmed SMS".
    await expect(
      page.getByRole("checkbox", { name: "Visit Confirmed Email" })
    ).toBeVisible();

    await expect(
      page.getByRole("checkbox", { name: "Visit Confirmed SMS" })
    ).toBeVisible();

    // Admin notifications have Email, SMS, and In-App checkboxes
    await expect(
      page.getByRole("checkbox", { name: "New Scheduled Job Email" })
    ).toBeVisible();

    await expect(
      page.getByRole("checkbox", { name: "New Scheduled Job SMS" })
    ).toBeVisible();

    await expect(
      page.getByRole("checkbox", { name: "New Scheduled Job In-App" })
    ).toBeVisible();

    // Tech notifications also have Email, SMS, and In-App
    await expect(
      page.getByRole("checkbox", { name: "New Visit Assigned Email" })
    ).toBeVisible();

    await expect(
      page.getByRole("checkbox", { name: "New Visit Assigned SMS" })
    ).toBeVisible();

    await expect(
      page.getByRole("checkbox", { name: "New Visit Assigned In-App" })
    ).toBeVisible();
  });
});
