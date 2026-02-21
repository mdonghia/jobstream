import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 12 -- Bookings Page Tests
// ---------------------------------------------------------------------------
// These tests verify the bookings management page at /bookings.
// The page requires authentication and displays booking requests organized
// by status tabs (Pending, Confirmed, Declined).
//
// Source: src/components/bookings/booking-page.tsx
//         src/app/(dashboard)/bookings/page.tsx
//
// DOM structure:
//   - Page heading: <h1>Bookings</h1>
//   - Tabs component (Radix TabsPrimitive) with data-slot="tabs-trigger"
//     for Pending, Confirmed, Declined
//   - Table with <th> columns: Date Requested, Customer Name, Service,
//     Preferred Date, Status, Actions
//   - Empty state with CalendarPlus icon and contextual message per tab
// ---------------------------------------------------------------------------

/** Log in using the demo account credentials. */
async function loginViaForm(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("demo@jobstream.app");
  await page.getByLabel(/password/i).fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"));
}

test.describe("Bookings page", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("bookings page loads when logged in", async ({ page }) => {
    await page.goto("/bookings");

    // The page heading should be visible
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Bookings", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The subtitle text should be present
    await expect(
      page.getByText("Manage online booking requests from customers")
    ).toBeVisible();

    // The URL should be /bookings
    await expect(page).toHaveURL(/\/bookings/);
  });

  test("bookings page shows status tabs (Pending, Confirmed, Declined)", async ({
    page,
  }) => {
    await page.goto("/bookings");

    // Wait for the page heading to confirm load
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Bookings", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The Tabs component uses Radix TabsPrimitive with data-slot="tabs-trigger".
    // Each tab trigger contains the status text.
    const tabsList = page.locator('[data-slot="tabs-list"]');
    await expect(tabsList).toBeVisible();

    // Check for all three tab triggers
    const pendingTab = page.locator('[data-slot="tabs-trigger"]', {
      hasText: "Pending",
    });
    const confirmedTab = page.locator('[data-slot="tabs-trigger"]', {
      hasText: "Confirmed",
    });
    const declinedTab = page.locator('[data-slot="tabs-trigger"]', {
      hasText: "Declined",
    });

    await expect(pendingTab).toBeVisible();
    await expect(confirmedTab).toBeVisible();
    await expect(declinedTab).toBeVisible();

    // The Pending tab should be active by default (since activeTab starts as "PENDING")
    await expect(pendingTab).toHaveAttribute("data-state", "active");
  });

  test("bookings table shows correct columns when data exists", async ({
    page,
  }) => {
    await page.goto("/bookings");

    // Wait for the page to load
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Bookings", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // The table is rendered inside a TabsContent. It may show the table
    // with data or an empty state. Either way, we can check for the table
    // structure or the empty state message.
    //
    // The table headers are: Date Requested, Customer Name, Service,
    // Preferred Date, Status, Actions
    const expectedHeaders = [
      "Date Requested",
      "Customer Name",
      "Service",
      "Preferred Date",
      "Status",
      "Actions",
    ];

    // Check if a table exists (data loaded) or empty state is shown
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
      // Empty state should show contextual message for Pending tab
      await expect(
        page.getByText("No booking requests yet")
      ).toBeVisible();
      await expect(
        page.getByText(
          "When customers submit booking requests, they will appear here."
        )
      ).toBeVisible();
    }
  });

  test("clicking tabs switches between booking statuses", async ({
    page,
  }) => {
    await page.goto("/bookings");

    // Wait for load
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Bookings", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Click the Confirmed tab
    const confirmedTab = page.locator('[data-slot="tabs-trigger"]', {
      hasText: "Confirmed",
    });
    await confirmedTab.click();
    await expect(confirmedTab).toHaveAttribute("data-state", "active");

    // The content area should update. If empty, it shows the confirmed
    // empty state message.
    const confirmedContent = page.locator('[data-slot="tabs-content"]').filter({
      has: page.locator(':scope:not([hidden])'),
    });

    // Check for either table data or the confirmed empty state
    const hasConfirmedTable = await page
      .locator("table")
      .isVisible()
      .catch(() => false);
    if (!hasConfirmedTable) {
      await expect(
        page.getByText(/No booking requests confirmed/i)
      ).toBeVisible();
    }

    // Click the Declined tab
    const declinedTab = page.locator('[data-slot="tabs-trigger"]', {
      hasText: "Declined",
    });
    await declinedTab.click();
    await expect(declinedTab).toHaveAttribute("data-state", "active");

    // Check for declined empty state if no data
    const hasDeclinedTable = await page
      .locator("table")
      .isVisible()
      .catch(() => false);
    if (!hasDeclinedTable) {
      await expect(
        page.getByText(/No booking requests declined/i)
      ).toBeVisible();
    }

    // Switch back to Pending tab
    const pendingTab = page.locator('[data-slot="tabs-trigger"]', {
      hasText: "Pending",
    });
    await pendingTab.click();
    await expect(pendingTab).toHaveAttribute("data-state", "active");
  });
});
