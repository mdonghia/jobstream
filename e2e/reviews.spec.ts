import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Reviews Page Tests -- Redesigned
// ---------------------------------------------------------------------------
// Tests for the new tabbed Reviews page with Google Reviews and
// Review Requests tabs.
// ---------------------------------------------------------------------------

async function loginViaForm(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('demo@jobstream.app');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

test.describe("Reviews Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  // -------------------------------------------------------------------------
  // Page Load
  // -------------------------------------------------------------------------
  test("Reviews page loads with heading and tabs", async ({ page }) => {
    await page.goto("/reviews");

    // Page heading
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reviews", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Subtext
    await expect(
      page.getByText("Monitor your online reputation and track review request performance.")
    ).toBeVisible();

    // Tab triggers should be visible
    await expect(page.getByRole("tab", { name: /google reviews/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /review requests/i })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Tab Switching
  // -------------------------------------------------------------------------
  test("Can switch between Google Reviews and Review Requests tabs", async ({
    page,
  }) => {
    await page.goto("/reviews");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reviews", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Click on Review Requests tab
    await page.getByRole("tab", { name: /review requests/i }).click();

    // Review Requests tab content should be visible -- look for stats labels
    await expect(page.getByText("Requests Sent")).toBeVisible();
    await expect(page.getByText("Customers Clicked")).toBeVisible();
    await expect(page.getByText("Conversion Rate")).toBeVisible();

    // Click on Google Reviews tab
    await page.getByRole("tab", { name: /google reviews/i }).click();

    // Google Reviews tab content should be visible
    // Since Google is not connected in test env, should show the connect prompt
    await expect(
      page.getByText(/connect google business profile/i)
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Google Reviews Tab -- Not Connected State
  // -------------------------------------------------------------------------
  test("Google Reviews tab shows connect prompt when not connected", async ({
    page,
  }) => {
    await page.goto("/reviews");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reviews", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Navigate to Google Reviews tab
    await page.getByRole("tab", { name: /google reviews/i }).click();

    // Should show the not-connected card
    await expect(
      page.getByText(/connect your google business profile/i)
    ).toBeVisible();

    // Should have a link to settings
    await expect(
      page.getByRole("link", { name: /go to review settings/i })
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Review Requests Tab -- Stats Cards
  // -------------------------------------------------------------------------
  test("Review Requests tab shows stat cards with correct labels", async ({
    page,
  }) => {
    await page.goto("/reviews");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reviews", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Navigate to Review Requests tab
    await page.getByRole("tab", { name: /review requests/i }).click();

    // Stat cards should show
    await expect(page.getByText("Requests Sent")).toBeVisible();
    await expect(page.getByText("Customers Clicked")).toBeVisible();
    await expect(page.getByText("Conversion Rate")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Review Requests Tab -- Date Range Filter
  // -------------------------------------------------------------------------
  test("Review Requests tab has a date range filter", async ({ page }) => {
    await page.goto("/reviews");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reviews", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Navigate to Review Requests tab
    await page.getByRole("tab", { name: /review requests/i }).click();

    // Date range select should be visible
    const dateRangeTrigger = page.getByRole("combobox");
    await expect(dateRangeTrigger).toBeVisible();

    // Click the trigger
    await dateRangeTrigger.click();

    // Verify date range options
    await expect(page.getByRole("option", { name: "This Month" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Last Month" })).toBeVisible();
    await expect(page.getByRole("option", { name: "This Quarter" })).toBeVisible();
    await expect(page.getByRole("option", { name: "All Time" })).toBeVisible();

    // Close dropdown
    await page.keyboard.press("Escape");
  });

  // -------------------------------------------------------------------------
  // Review Requests Tab -- Table Structure
  // -------------------------------------------------------------------------
  test("Review Requests tab shows table with correct columns", async ({
    page,
  }) => {
    await page.goto("/reviews");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reviews", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Navigate to Review Requests tab
    await page.getByRole("tab", { name: /review requests/i }).click();

    // Table header columns should be visible
    await expect(page.getByRole("columnheader", { name: "Customer" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Job" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Sent" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Clicked?" })).toBeVisible();
  });
});
