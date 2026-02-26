import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// V2 Jobs Tests
// ---------------------------------------------------------------------------
// Tests exercise the V2 jobs workflow: list page with filter tabs, contextual
// columns per tab, search, job detail page, and create job flow.
// Uses the demo account which has seed data.
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "demo@jobstream.app";
const DEMO_PASSWORD = "password123";

/** Log in with the shared demo account. */
async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for the topbar heading to confirm we landed on the dashboard
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Tab name and expected column headers lookup
// ---------------------------------------------------------------------------

const TAB_COLUMNS: Record<string, string[]> = {
  Unscheduled: ["Job #", "Customer", "Service", "Emergency", "Date Created"],
  Upcoming: ["Job #", "Customer", "Service", "Next Visit", "Assigned Tech"],
  "Awaiting Approval": [
    "Job #",
    "Customer",
    "Quote #",
    "Quote Amount",
    "Sent Date",
    "Days Waiting",
  ],
  "Needs Invoicing": [
    "Job #",
    "Customer",
    "Service",
    "Visits Completed",
    "Line Items Total",
  ],
  "Awaiting Payment": [
    "Job #",
    "Customer",
    "Invoice #",
    "Invoice Amount",
    "Due Date",
    "Days Outstanding",
  ],
  Closed: ["Job #", "Customer", "Service", "Total Invoiced", "Date Closed"],
  Recurring: [
    "Job #",
    "Customer",
    "Service",
    "Frequency",
    "Next Visit",
    "Last Completed",
  ],
};

const ALL_TABS = Object.keys(TAB_COLUMNS);

// ---------------------------------------------------------------------------
// Jobs List -- Page Load
// ---------------------------------------------------------------------------
test.describe("V2 Jobs List", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/jobs");
    // Wait for the Jobs heading to appear inside <main>
    await expect(
      page.getByRole("main").locator("h1", { hasText: "Jobs" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("jobs list page loads with heading, New Job button, and search bar", async ({
    page,
  }) => {
    // 1. Page heading "Jobs"
    await expect(
      page.getByRole("main").locator("h1", { hasText: "Jobs" })
    ).toBeVisible();

    // 2. "New Job" button/link is visible
    await expect(
      page.getByRole("link", { name: /new job/i })
    ).toBeVisible();

    // 3. Search bar with the V2 placeholder text
    const searchInput = page.getByPlaceholder(
      "Search by job number, quote number, customer, service, address..."
    );
    await expect(searchInput).toBeVisible();
  });

  test("all 7 filter tabs are visible", async ({ page }) => {
    // Verify each of the 7 tabs is visible in the tab list
    for (const tabName of ALL_TABS) {
      await expect(
        page.getByRole("tab", { name: new RegExp(tabName) })
      ).toBeVisible({ timeout: 5000 });
    }
  });

  // -------------------------------------------------------------------------
  // Filter tabs work -- click each tab, verify it activates, no crash
  // -------------------------------------------------------------------------
  for (const tabName of ALL_TABS) {
    test(`clicking "${tabName}" tab activates it without error`, async ({
      page,
    }) => {
      const tab = page.getByRole("tab", { name: new RegExp(tabName) });
      await tab.click();

      // The tab should become the selected/active tab (aria-selected="true")
      await expect(tab).toHaveAttribute("aria-selected", "true", {
        timeout: 5000,
      });

      // The table element should still be on the page (no crash)
      await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
    });
  }

  // -------------------------------------------------------------------------
  // Tab shows contextual columns
  // -------------------------------------------------------------------------
  for (const [tabName, expectedColumns] of Object.entries(TAB_COLUMNS)) {
    test(`"${tabName}" tab shows correct column headers`, async ({ page }) => {
      // Click the tab
      const tab = page.getByRole("tab", { name: new RegExp(tabName) });
      await tab.click();

      // Wait for the tab to be active
      await expect(tab).toHaveAttribute("aria-selected", "true", {
        timeout: 5000,
      });

      // Wait for the table to render (may need a moment after transition)
      const headerRow = page.locator("thead tr");
      await expect(headerRow).toBeVisible({ timeout: 10000 });

      // Verify each expected column header exists
      for (const col of expectedColumns) {
        await expect(
          page.getByRole("columnheader", { name: col })
        ).toBeVisible({ timeout: 5000 });
      }

      // Verify the number of column headers matches expectations
      const headers = page.getByRole("columnheader");
      await expect(headers).toHaveCount(expectedColumns.length, {
        timeout: 5000,
      });
    });
  }

  // -------------------------------------------------------------------------
  // Search works
  // -------------------------------------------------------------------------
  test("search filters results or shows empty state", async ({ page }) => {
    const searchInput = page.getByPlaceholder(
      "Search by job number, quote number, customer, service, address..."
    );

    // Type a nonsense search to trigger the empty state
    await searchInput.fill("zzzznonexistent99999");

    // Wait for debounce (300ms) + server round-trip
    await page.waitForTimeout(1500);

    // Either the table has no body rows, or the empty state text appears
    const emptyStateText = page.getByText("No jobs match your search.");
    const noJobsInCategory = page.getByText("No jobs in this category.");
    const tableRows = page.locator("tbody tr");

    // At least one of these should be true: empty state visible OR zero rows
    const hasEmptySearch = await emptyStateText.isVisible().catch(() => false);
    const hasNoCategory = await noJobsInCategory.isVisible().catch(() => false);
    const rowCount = await tableRows.count();

    expect(hasEmptySearch || hasNoCategory || rowCount === 0).toBe(true);

    // Clear search and verify results come back (or table is still present)
    await searchInput.clear();
    await page.waitForTimeout(1500);
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Create job flow -- clicking "New Job" navigates to the form
  // -------------------------------------------------------------------------
  test("clicking New Job navigates to job creation form", async ({ page }) => {
    // The "New Job" button is a Link wrapped in a Button (asChild).
    // Use Promise.all to wait for navigation after click.
    const newJobLink = page.getByRole("link", { name: /new job/i });
    await expect(newJobLink).toBeVisible({ timeout: 5000 });
    await newJobLink.click();
    await expect(page).toHaveURL(/\/jobs\/new/, { timeout: 30000 });

    // Verify the page heading for the new job form
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: "New Job", level: 1 })
    ).toBeVisible({ timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
// Job Detail Page
// ---------------------------------------------------------------------------
test.describe("V2 Job Detail", () => {
  test("job detail page shows key sections", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/jobs");

    // Wait for the list to load
    await expect(
      page.getByRole("main").locator("h1", { hasText: "Jobs" })
    ).toBeVisible({ timeout: 10000 });

    // We need at least one job row to click. Try to find a row in the table.
    // Check across tabs to find one with data.
    let foundRow = false;

    for (const tabName of ALL_TABS) {
      const tab = page.getByRole("tab", { name: new RegExp(tabName) });
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true", {
        timeout: 5000,
      });

      // Wait for any pending transition to finish
      await page.waitForTimeout(1000);

      const rows = page.locator("tbody tr");
      const count = await rows.count();

      if (count > 0) {
        // Click the first row to navigate to job detail
        await rows.first().click();
        foundRow = true;
        break;
      }
    }

    if (!foundRow) {
      // If no jobs exist at all, skip the detail assertions.
      // This is acceptable -- the test documents the expected behavior
      // but cannot verify it without data.
      test.skip(true, "No jobs found in any tab to test detail page");
      return;
    }

    // Should navigate to a job detail page (/jobs/<id>)
    await expect(page).toHaveURL(/\/jobs\/[a-zA-Z0-9-]+$/, {
      timeout: 15000,
    });

    // 1. Job number displayed (font-mono span in the header)
    await expect(page.locator("span.font-mono").first()).toBeVisible({
      timeout: 10000,
    });

    // 2. Customer name is visible and is a clickable link
    const customerLink = page.locator(
      'a[href^="/customers/"]'
    ).first();
    await expect(customerLink).toBeVisible({ timeout: 5000 });

    // 3. Visits section exists (card with "Visits" heading)
    await expect(page.getByText(/Visits \(/).first()).toBeVisible({
      timeout: 5000,
    });

    // 4. Activity feed section exists
    await expect(
      page.getByText("Activity").first()
    ).toBeVisible({ timeout: 10000 });

    // 5. "Add Visit" button exists
    await expect(
      page.getByRole("button", { name: /add visit/i })
    ).toBeVisible({ timeout: 5000 });
  });
});
