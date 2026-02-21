import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 13 -- Communications Page Tests
// ---------------------------------------------------------------------------
// These tests verify the communications log page at /communications.
// The page requires authentication and displays SMS/email communication
// history with filter controls and an expandable table.
//
// Source: src/components/communications/communications-page.tsx
//         src/app/(dashboard)/communications/page.tsx
//
// DOM structure:
//   - Page heading: <h1>Communications</h1>
//   - Subtitle: "SMS and email communication history"
//   - Filter bar with:
//     * Search input (placeholder "Search by customer name...")
//     * Type Select (All Types, SMS, Email)
//     * Direction Select (All, Sent, Received)
//     * Status Select (All Statuses, Delivered, Sent, Queued, Failed, Bounced)
//     * Two date inputs (from/to)
//   - Table with <th> columns: Date / Time, Customer, Type, Dir,
//     Content Preview, Status, (expand toggle)
//   - Empty state with MessageSquare icon
// ---------------------------------------------------------------------------

/** Log in using the demo account credentials. */
async function loginViaForm(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("demo@jobstream.app");
  await page.getByLabel(/password/i).fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"));
}

test.describe("Communications page", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("communications page loads when logged in", async ({ page }) => {
    await page.goto("/communications");

    // The page heading should be visible
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Communications", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The subtitle should be present
    await expect(
      page.getByText("SMS and email communication history")
    ).toBeVisible();

    // URL should be /communications
    await expect(page).toHaveURL(/\/communications/);
  });

  test("filter dropdowns are visible (Type, Direction, Status)", async ({
    page,
  }) => {
    await page.goto("/communications");

    // Wait for page load
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Communications", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The filter bar is inside a div with border and padding at the top.
    // It contains a search input and three Select dropdowns.

    // 1. Search input with placeholder "Search by customer name..."
    const searchInput = page.locator(
      'input[placeholder="Search by customer name..."]'
    );
    await expect(searchInput).toBeVisible();

    // 2. Type filter -- SelectTrigger with data-slot="select-trigger"
    //    The triggers show their current value text. By default they show:
    //    "All Types", "All", "All Statuses"
    //
    //    The Select component uses Radix with data-slot="select-trigger".
    const selectTriggers = page.locator('[data-slot="select-trigger"]');

    // There should be at least 3 select triggers (Type, Direction, Status)
    await expect(selectTriggers).toHaveCount(3, { timeout: 5000 });

    // Verify default values are visible in the triggers.
    // Type filter shows "All Types" by default
    await expect(
      page.locator('[data-slot="select-trigger"]', { hasText: "All Types" })
    ).toBeVisible();

    // Direction filter shows "All" by default
    // (Need to be specific since "All" could match other triggers)
    const directionTrigger = selectTriggers.nth(1);
    await expect(directionTrigger).toBeVisible();
    await expect(directionTrigger).toContainText("All");

    // Status filter shows "All Statuses" by default
    await expect(
      page.locator('[data-slot="select-trigger"]', {
        hasText: "All Statuses",
      })
    ).toBeVisible();

    // 3. Date filter inputs (two date inputs for from/to range)
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);
  });

  test("communications table shows correct columns when data exists", async ({
    page,
  }) => {
    await page.goto("/communications");

    // Wait for load
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Communications", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The table headers are: Date / Time, Customer, Type, Dir,
    // Content Preview, Status (plus an empty header for expand toggle)
    const expectedHeaders = [
      "Date / Time",
      "Customer",
      "Type",
      "Dir",
      "Content Preview",
      "Status",
    ];

    // Check if a table exists or empty state is shown
    const tableVisible = await page
      .locator("table")
      .isVisible()
      .catch(() => false);

    if (tableVisible) {
      // Verify all expected column headers are present
      for (const header of expectedHeaders) {
        await expect(
          page.locator("th", { hasText: header })
        ).toBeVisible();
      }
    } else {
      // Empty state should be shown
      await expect(
        page.getByText("No communications found")
      ).toBeVisible();
      await expect(
        page.getByText(
          "SMS and email communications with your customers will appear here."
        )
      ).toBeVisible();
    }
  });

  test("can open Type filter and see SMS and Email options", async ({
    page,
  }) => {
    await page.goto("/communications");

    // Wait for load
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Communications", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Click the Type filter dropdown (shows "All Types" by default)
    const typeFilterTrigger = page.locator('[data-slot="select-trigger"]', {
      hasText: "All Types",
    });
    await typeFilterTrigger.click();

    // The SelectContent portal should now be visible with the options.
    // SelectItem uses data-slot="select-item".
    const selectContent = page.locator('[data-slot="select-content"]');
    await expect(selectContent).toBeVisible({ timeout: 5000 });

    // Verify the filter options: All Types, SMS, Email
    await expect(
      page.locator('[data-slot="select-item"]', { hasText: "All Types" })
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="select-item"]', { hasText: "SMS" })
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="select-item"]', { hasText: "Email" })
    ).toBeVisible();
  });

  test("can open Direction filter and see Sent and Received options", async ({
    page,
  }) => {
    await page.goto("/communications");

    // Wait for load
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Communications", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The Direction filter is the second SelectTrigger. It shows "All" by default.
    // We need to target it specifically. It has width w-[120px].
    const selectTriggers = page.locator('[data-slot="select-trigger"]');
    const directionTrigger = selectTriggers.nth(1);
    await directionTrigger.click();

    // Verify the direction options: All, Sent, Received
    const selectContent = page.locator('[data-slot="select-content"]');
    await expect(selectContent).toBeVisible({ timeout: 5000 });

    await expect(
      page.locator('[data-slot="select-item"]', { hasText: "Sent" })
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="select-item"]', { hasText: "Received" })
    ).toBeVisible();
  });

  test("can open Status filter and see all status options", async ({
    page,
  }) => {
    await page.goto("/communications");

    // Wait for load
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Communications", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The Status filter shows "All Statuses" by default
    const statusTrigger = page.locator('[data-slot="select-trigger"]', {
      hasText: "All Statuses",
    });
    await statusTrigger.click();

    // Verify the status options
    const selectContent = page.locator('[data-slot="select-content"]');
    await expect(selectContent).toBeVisible({ timeout: 5000 });

    const expectedStatuses = [
      "All Statuses",
      "Delivered",
      "Sent",
      "Queued",
      "Failed",
      "Bounced",
    ];

    for (const status of expectedStatuses) {
      await expect(
        page.locator('[data-slot="select-item"]', { hasText: status })
      ).toBeVisible();
    }
  });

  test("selecting SMS from Type filter updates the trigger text", async ({
    page,
  }) => {
    await page.goto("/communications");

    // Wait for load
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Communications", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Open the Type filter
    const typeFilterTrigger = page.locator('[data-slot="select-trigger"]', {
      hasText: "All Types",
    });
    await typeFilterTrigger.click();

    // Select "SMS"
    await page
      .locator('[data-slot="select-item"]', { hasText: "SMS" })
      .click();

    // The trigger should now show "SMS" instead of "All Types"
    await expect(
      page.locator('[data-slot="select-trigger"]').first()
    ).toContainText("SMS");
  });

  test("search input accepts text for filtering", async ({ page }) => {
    await page.goto("/communications");

    // Wait for load
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Communications", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Type into the search input
    const searchInput = page.locator(
      'input[placeholder="Search by customer name..."]'
    );
    await searchInput.fill("John Doe");

    // Verify the input accepted the text
    await expect(searchInput).toHaveValue("John Doe");

    // The component uses a 300ms debounce before fetching, so the UI
    // should still be responsive. Either the table updates or the empty
    // state changes to "Try adjusting your filters."
    await page.waitForTimeout(500);

    // If no results match, the empty state message should change
    const noResultsMessage = page.getByText("Try adjusting your filters.");
    const hasNoResults = await noResultsMessage.isVisible().catch(() => false);

    // Either we see filtered results in the table or the "no results" message.
    // Both states are valid depending on the data.
    if (hasNoResults) {
      await expect(noResultsMessage).toBeVisible();
    }
  });
});
