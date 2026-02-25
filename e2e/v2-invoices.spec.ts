import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// V2 Invoice List Page Tests
// ---------------------------------------------------------------------------
// These tests exercise the v2 tabbed invoice list at /invoices:
//   1. Page loads with heading, "New Invoice" button, search bar, 6 filter tabs
//   2. Clicking each filter tab does not crash
//   3. Table has expected columns (Invoice #, Customer, Job #, Amount, etc.)
//   4. Search bar filters the list
//   5. Clicking an invoice row navigates to its detail page
//
// Uses the demo account (demo@jobstream.app / password123) which has seed
// data including invoices in various statuses.
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "demo@jobstream.app";
const DEMO_PASSWORD = "password123";

/** Log in with the shared demo account. */
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
// V2 Invoice List
// ---------------------------------------------------------------------------
test.describe("V2 Invoice List", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/invoices");
    await page.waitForURL("/invoices");
    // Wait for either the "Invoices" heading (has data) or "No invoices yet"
    // empty state to confirm the page has loaded
    await expect(
      page.locator("main").locator("h1, h2").first()
    ).toBeVisible({ timeout: 15000 });
  });

  // -----------------------------------------------------------------------
  // 1. Invoice list loads with heading, New Invoice button, search, 6 tabs
  // -----------------------------------------------------------------------
  test("Invoice list page loads with heading, button, search, and filter tabs", async ({
    page,
  }) => {
    // Check if we have the full list view or the empty state
    const hasH1 = await page
      .locator("main h1")
      .filter({ hasText: "Invoices" })
      .isVisible()
      .catch(() => false);

    if (hasH1) {
      // ---- Heading ----
      await expect(
        page.getByRole("main").locator("h1", { hasText: "Invoices" })
      ).toBeVisible();

      // ---- "New Invoice" button ----
      await expect(
        page.getByRole("button", { name: /new invoice/i })
      ).toBeVisible();

      // ---- Search bar ----
      await expect(
        page.getByPlaceholder(/search by invoice number or customer name/i)
      ).toBeVisible();

      // ---- 6 filter tabs ----
      const tabNames = [
        "Draft",
        "Sent",
        "Overdue",
        "Partially Paid",
        "Paid",
        "Cancelled",
      ];
      for (const tabName of tabNames) {
        const tab = page.getByRole("tab", { name: new RegExp(tabName, "i") });
        await expect(tab).toBeVisible({ timeout: 10000 });
      }
    } else {
      // Empty state -- verify the fallback "No invoices yet" heading and
      // the "New Invoice" button in the empty state
      await expect(page.getByText("No invoices yet")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /new invoice/i })
      ).toBeVisible();
    }
  });

  // -----------------------------------------------------------------------
  // 2. Filter tabs work -- clicking each does not crash
  // -----------------------------------------------------------------------
  test("Clicking each filter tab does not crash", async ({ page }) => {
    // This test only applies when invoices exist (tabs are rendered)
    const hasH1 = await page
      .locator("main h1")
      .filter({ hasText: "Invoices" })
      .isVisible()
      .catch(() => false);

    if (!hasH1) {
      // Empty state -- no tabs to click. Just verify the page is stable.
      await expect(page.getByText("No invoices yet")).toBeVisible();
      return;
    }

    const tabNames = [
      "Draft",
      "Sent",
      "Overdue",
      "Partially Paid",
      "Paid",
      "Cancelled",
    ];

    for (const tabName of tabNames) {
      const tab = page.getByRole("tab", { name: new RegExp(tabName, "i") });
      await tab.click();

      // After clicking, wait for the loading to settle. The table may show
      // results or an empty category message. Either is fine -- we just
      // verify no crash occurred by checking the heading is still visible.
      await expect(
        page.getByRole("main").locator("h1", { hasText: "Invoices" })
      ).toBeVisible({ timeout: 10000 });

      // Also verify the tab is now active (aria-selected="true" or
      // data-state="active" depending on the Radix implementation)
      await expect(tab).toHaveAttribute("data-state", "active", {
        timeout: 5000,
      });
    }
  });

  // -----------------------------------------------------------------------
  // 3. Table has expected column headers
  // -----------------------------------------------------------------------
  test("Table has expected column headers", async ({ page }) => {
    const hasH1 = await page
      .locator("main h1")
      .filter({ hasText: "Invoices" })
      .isVisible()
      .catch(() => false);

    if (!hasH1) {
      // Empty state -- no table rendered
      await expect(page.getByText("No invoices yet")).toBeVisible();
      return;
    }

    // The table header columns are rendered as <th> elements with uppercase
    // text. Verify each expected column header exists.
    const expectedColumns = [
      "Invoice #",
      "Customer",
      "Job #",
      "Amount",
      "Due Date",
      "Status",
      "Paid / Due",
    ];

    for (const col of expectedColumns) {
      const header = page.locator("th", { hasText: col });
      await expect(header).toBeVisible({ timeout: 10000 });
    }
  });

  // -----------------------------------------------------------------------
  // 4. Search bar filters the invoice list
  // -----------------------------------------------------------------------
  test("Search bar filters the invoice list", async ({ page }) => {
    const hasH1 = await page
      .locator("main h1")
      .filter({ hasText: "Invoices" })
      .isVisible()
      .catch(() => false);

    if (!hasH1) {
      // Empty state -- no search to test
      await expect(page.getByText("No invoices yet")).toBeVisible();
      return;
    }

    const searchInput = page.getByPlaceholder(
      /search by invoice number or customer name/i
    );
    await expect(searchInput).toBeVisible();

    // Type a nonsense search string that should return no results
    await searchInput.fill("zzzznonexistent99999");

    // Wait for the debounced search to fire (300ms) and results to update.
    // We should see either an empty table message or no invoice rows.
    await page.waitForTimeout(500);

    // The "No invoices match your search." message should appear, or the
    // table body should be empty.
    const noMatchMsg = page.getByText("No invoices match your search.");
    const noCategoryMsg = page.getByText("No invoices in this category.");

    const hasNoMatch = await noMatchMsg
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasNoCategory = await noCategoryMsg
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    // At least one empty-state message should be shown for a nonsense query
    expect(hasNoMatch || hasNoCategory).toBeTruthy();

    // Clear the search to restore the full list
    await searchInput.clear();
    await page.waitForTimeout(500);

    // After clearing, the heading should still be visible (page didn't crash)
    await expect(
      page.getByRole("main").locator("h1", { hasText: "Invoices" })
    ).toBeVisible({ timeout: 10000 });
  });

  // -----------------------------------------------------------------------
  // 5. Clicking an invoice row navigates to its detail page
  // -----------------------------------------------------------------------
  test("Clicking an invoice row navigates to detail page", async ({
    page,
  }) => {
    const hasH1 = await page
      .locator("main h1")
      .filter({ hasText: "Invoices" })
      .isVisible()
      .catch(() => false);

    if (!hasH1) {
      // Empty state -- no invoices to click
      await expect(page.getByText("No invoices yet")).toBeVisible();
      return;
    }

    // First, find a tab that has invoices. We'll try all tabs and pick the
    // first one with a non-zero count.
    const tabNames = [
      "Draft",
      "Sent",
      "Overdue",
      "Partially Paid",
      "Paid",
      "Cancelled",
    ];

    let foundInvoiceRow = false;

    for (const tabName of tabNames) {
      const tab = page.getByRole("tab", { name: new RegExp(tabName, "i") });
      await tab.click();

      // Wait for the tab to become active and data to load
      await expect(tab).toHaveAttribute("data-state", "active", {
        timeout: 5000,
      });
      await page.waitForTimeout(500);

      // Check if there are any invoice rows in the table body.
      // Invoice rows are <tr> elements inside <tbody> that have onClick.
      // Each row has a link with the invoice number.
      const invoiceLinks = page.locator(
        "tbody tr td a[href^='/invoices/']"
      );
      const linkCount = await invoiceLinks.count();

      if (linkCount > 0) {
        // Click the first invoice row (the <tr> itself, not the link, since
        // the row has an onClick handler)
        const firstRow = page.locator("tbody tr").first();
        await firstRow.click();

        // Should navigate to the invoice detail page
        await expect(page).toHaveURL(/\/invoices\/[a-zA-Z0-9-]+$/, {
          timeout: 10000,
        });

        foundInvoiceRow = true;
        break;
      }
    }

    if (!foundInvoiceRow) {
      // All tabs are empty -- this is a valid state for a fresh demo account.
      // Verify the page is still stable.
      await expect(
        page.getByRole("main").locator("h1, h2").first()
      ).toBeVisible();
    }
  });
});
