import { test, expect, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 9 -- Payments Page Tests
// ---------------------------------------------------------------------------
// These tests cover the payments module: page load, summary cards, table
// columns, method filtering, and customer search.
// ---------------------------------------------------------------------------

/** Log in via the /login form using the demo account credentials. */
async function loginViaForm(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("demo@jobstream.app");
  await page.getByLabel(/password/i).fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();
  // Wait for the topbar heading to confirm we landed on the dashboard
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Payments Page
// ---------------------------------------------------------------------------
test.describe("Payments Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
    await page.goto("/payments");
    await page.waitForURL("/payments");
    // Wait for the Payments h1 within main content
    await expect(
      page.locator("main").locator("h1", { hasText: "Payments" })
    ).toBeVisible({ timeout: 15000 });
  });

  test("payments page loads with summary cards", async ({ page }) => {
    // The page renders four summary cards.
    // Looking at payments-page.tsx, the card labels (uppercase CSS) are:
    // "Received This Month", "Received Last Month", "Outstanding", "Overdue"
    await expect(page.getByText("Received This Month")).toBeVisible();
    await expect(page.getByText("Received Last Month")).toBeVisible();
    // "Outstanding" also appears in the subtitle text, so use exact match
    await expect(
      page.getByText("Outstanding", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Overdue", { exact: true })
    ).toBeVisible();
  });

  test("payments table shows correct columns", async ({ page }) => {
    // The table has these column headers (rendered as <th> elements):
    // Date, Customer, Invoice #, Amount, Method, Status
    // These may appear in the table header or as part of an empty state.
    // We check for the table header row specifically.
    const tableHeaders = page.locator("table thead th");

    // Wait for either the table or the empty state to appear
    const hasTable = await page.locator("table").isVisible().catch(() => false);

    if (hasTable) {
      // Table is visible -- verify column headers
      await expect(page.locator("th", { hasText: "Date" })).toBeVisible();
      await expect(page.locator("th", { hasText: "Customer" })).toBeVisible();
      await expect(
        page.locator("th", { hasText: /invoice\s*#/i })
      ).toBeVisible();
      await expect(page.locator("th", { hasText: "Amount" })).toBeVisible();
      await expect(page.locator("th", { hasText: "Method" })).toBeVisible();
      await expect(page.locator("th", { hasText: "Status" })).toBeVisible();
    } else {
      // Empty state -- should show "No payments found" with relevant message
      await expect(page.getByText("No payments found")).toBeVisible();
    }
  });

  test("can filter by method", async ({ page }) => {
    // The method filter is a Select component with trigger text "All Methods"
    // or showing the currently selected value.
    // Find the method filter select trigger by looking for a button/trigger
    // that contains "All Methods" text.
    const methodSelect = page.locator("button", {
      hasText: /all methods/i,
    });
    await expect(methodSelect).toBeVisible();

    // Open the method filter dropdown
    await methodSelect.click();

    // The dropdown should show payment method options
    await expect(
      page.getByRole("option", { name: "Card" })
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("option", { name: "ACH" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Cash" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Check" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Other" })).toBeVisible();

    // Select "Cash" to filter
    await page.getByRole("option", { name: "Cash" }).click();

    // Allow time for the debounced fetch to complete
    await page.waitForTimeout(500);

    // The filter should now show "Cash" as the selected value
    // The page should still be functional (either showing filtered results
    // or a "No payments found" message)
    const hasPayments = await page.locator("table tbody tr").count();
    if (hasPayments > 0) {
      // All visible method badges should be "Cash"
      const methodBadges = page.locator("table tbody td:nth-child(5)");
      const count = await methodBadges.count();
      for (let i = 0; i < count; i++) {
        await expect(methodBadges.nth(i)).toContainText("Cash");
      }
    }
  });

  test("can search by customer name", async ({ page }) => {
    // The search input has placeholder text about searching by customer name
    const searchInput = page.getByPlaceholder(
      /search by customer name or invoice number/i
    );
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill("demo");

    // Allow time for the debounced search (300ms) to complete
    await page.waitForTimeout(500);

    // The page should react to the search -- either showing filtered results
    // or the "No payments found" empty state. Either way the page should
    // not be in an error state.
    const pageContent = page.locator("body");
    await expect(pageContent).not.toContainText("Something went wrong");

    // Clear the search
    await searchInput.clear();
    await page.waitForTimeout(500);
  });
});
