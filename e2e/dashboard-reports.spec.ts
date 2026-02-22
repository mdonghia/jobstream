import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 15 -- Dashboard & Reports Page Tests
// ---------------------------------------------------------------------------
// Tests for the Dashboard page (summary cards, charts, schedule, activity)
// and the Reports page (tab navigation, date range picker, CSV export).
// ---------------------------------------------------------------------------

async function loginViaForm(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('demo@jobstream.app');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  // Wait for the topbar heading to confirm we landed on the dashboard
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

// =============================================================================
// Dashboard Tests
// =============================================================================

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("Dashboard loads with 4 summary cards (Revenue This Month, Jobs Completed, Outstanding Invoices, Quote Conversion)", async ({
    page,
  }) => {
    // After login, we should already be on the dashboard (/)
    await expect(page).toHaveURL("/", { timeout: 15000 });

    // The dashboard heading includes the user's first name
    await expect(
      page.getByRole("heading", { name: /welcome back/i, level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Verify all 4 summary cards are visible by their label text.
    // The component renders <p class="text-sm text-[#8898AA] font-medium">
    await expect(page.getByText("Revenue This Month")).toBeVisible();
    await expect(page.getByText("Jobs Completed")).toBeVisible();
    await expect(page.getByText("Outstanding Invoices")).toBeVisible();
    await expect(page.getByText("Quote Conversion")).toBeVisible();
  });

  test("Dashboard shows Revenue Over Time chart", async ({ page }) => {
    await expect(page).toHaveURL("/", { timeout: 15000 });

    await expect(
      page.getByRole("heading", { name: /welcome back/i, level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The revenue chart card has the title "Revenue (Last 12 Months)"
    await expect(
      page.getByText("Revenue (Last 12 Months)")
    ).toBeVisible();

    // The recharts LineChart renders inside a <svg> element within its container
    const revenueChartContainer = page.locator("text=Revenue (Last 12 Months)").locator("..").locator("..");
    await expect(revenueChartContainer.locator("svg").first()).toBeVisible();
  });

  test("Dashboard shows Jobs by Status chart", async ({ page }) => {
    await expect(page).toHaveURL("/", { timeout: 15000 });

    await expect(
      page.getByRole("heading", { name: /welcome back/i, level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The pie chart card has the title "Jobs by Status"
    await expect(page.getByText("Jobs by Status")).toBeVisible();
  });

  test("Dashboard shows upcoming schedule section", async ({ page }) => {
    await expect(page).toHaveURL("/", { timeout: 15000 });

    await expect(
      page.getByRole("heading", { name: /welcome back/i, level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The upcoming schedule card has the title "Upcoming Schedule"
    await expect(page.getByText("Upcoming Schedule")).toBeVisible();

    // It also has a "View Full Schedule" link
    await expect(
      page.getByRole("link", { name: /view full schedule/i })
    ).toBeVisible();
  });

  test("Dashboard shows recent activity feed", async ({ page }) => {
    await expect(page).toHaveURL("/", { timeout: 15000 });

    await expect(
      page.getByRole("heading", { name: /welcome back/i, level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The recent activity card has the CardTitle "Recent Activity".
    // With no activity in a fresh seed, it shows "No recent activity" empty state.
    // Either the card title or the empty-state text should be visible.
    await expect(
      page.getByRole("main").getByText(/recent activity/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// Reports Tests
// =============================================================================

test.describe("Reports Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("Reports page loads at /reports", async ({ page }) => {
    await page.goto("/reports");

    // Page heading
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reports", level: 1 })
    ).toBeVisible({ timeout: 15000 });
  });

  test("Reports page has tab navigation (Revenue, Jobs, Quotes, Team, Customers)", async ({
    page,
  }) => {
    await page.goto("/reports");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reports", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The Tabs component renders TabsTrigger elements with role="tab"
    await expect(page.getByRole("tab", { name: /revenue/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /jobs/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /quotes/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /team/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /customers/i })).toBeVisible();
  });

  test("Can switch between report tabs", async ({ page }) => {
    await page.goto("/reports");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reports", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Revenue tab is active by default (aria-selected="true")
    const revenueTab = page.getByRole("tab", { name: /revenue/i });
    await expect(revenueTab).toHaveAttribute("aria-selected", "true");

    // Switch to Jobs tab
    const jobsTab = page.getByRole("tab", { name: /jobs/i });
    await jobsTab.click();
    await expect(jobsTab).toHaveAttribute("aria-selected", "true");
    await expect(revenueTab).toHaveAttribute("aria-selected", "false");

    // Switch to Quotes tab
    const quotesTab = page.getByRole("tab", { name: /quotes/i });
    await quotesTab.click();
    await expect(quotesTab).toHaveAttribute("aria-selected", "true");
    await expect(jobsTab).toHaveAttribute("aria-selected", "false");

    // Switch to Team tab
    const teamTab = page.getByRole("tab", { name: /team/i });
    await teamTab.click();
    await expect(teamTab).toHaveAttribute("aria-selected", "true");

    // Switch to Customers tab
    const customersTab = page.getByRole("tab", { name: /customers/i });
    await customersTab.click();
    await expect(customersTab).toHaveAttribute("aria-selected", "true");
  });

  test("Date range picker has preset options", async ({ page }) => {
    await page.goto("/reports");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reports", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The date range picker is a Select component. Its trigger defaults to
    // "This Month" (the default datePreset is "this_month").
    const datePickerTrigger = page.getByRole("combobox").filter({
      hasText: /this month/i,
    });
    await expect(datePickerTrigger).toBeVisible();
    await datePickerTrigger.click();

    // Verify all preset options exist in the dropdown
    await expect(page.getByRole("option", { name: "This Week" })).toBeVisible();
    await expect(page.getByRole("option", { name: "This Month" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Last Month" })).toBeVisible();
    await expect(page.getByRole("option", { name: "This Quarter" })).toBeVisible();
    await expect(page.getByRole("option", { name: "This Year" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Last 12 Months" })).toBeVisible();

    // Close the dropdown
    await page.keyboard.press("Escape");
  });

  test("Export CSV button exists on each tab", async ({ page }) => {
    await page.goto("/reports");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "Reports", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Revenue tab (default) -- wait for tab content to load, then check for CSV button.
    // The CSV button has text "CSV" with a Download icon.
    // There may be multiple CSV buttons on one tab (e.g., Revenue by Category + Top Customers).
    // We just need at least one to be visible.
    await expect(
      page.getByRole("button", { name: /csv/i }).first()
    ).toBeVisible({ timeout: 15000 });

    // Jobs tab
    await page.getByRole("tab", { name: /jobs/i }).click();
    await expect(
      page.getByRole("button", { name: /csv/i }).first()
    ).toBeVisible({ timeout: 15000 });

    // Quotes tab
    await page.getByRole("tab", { name: /quotes/i }).click();
    await expect(
      page.getByRole("button", { name: /csv/i }).first()
    ).toBeVisible({ timeout: 15000 });

    // Team tab
    await page.getByRole("tab", { name: /team/i }).click();
    await expect(
      page.getByRole("button", { name: /csv/i }).first()
    ).toBeVisible({ timeout: 15000 });

    // Customers tab
    await page.getByRole("tab", { name: /customers/i }).click();
    await expect(
      page.getByRole("button", { name: /csv/i }).first()
    ).toBeVisible({ timeout: 15000 });
  });
});
