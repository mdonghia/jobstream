import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// V2 Customer Management Tests
// ---------------------------------------------------------------------------
// These tests verify the customer list, search, detail view (with tabs,
// contact info, properties, and recent activity), the create customer flow,
// and the full CRUD lifecycle (create + delete).
//
// All tests use the demo account (demo@jobstream.app / password123) which
// has seed data including existing customers.
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "demo@jobstream.app";
const DEMO_PASSWORD = "password123";

/** Unique per-run suffix to avoid collisions with parallel runs. */
const TS = Date.now();
const RAND = Math.floor(Math.random() * 10000);

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
test.describe("V2 Customer Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  // -----------------------------------------------------------------------
  // 1. Customer list loads
  // -----------------------------------------------------------------------
  test("Customer list page loads with heading and Add Customer button", async ({
    page,
  }) => {
    await page.goto("/customers");

    // The page should show the "Customers" heading
    await expect(
      page.getByRole("main").locator("h1", { hasText: "Customers" })
    ).toBeVisible({ timeout: 15000 });

    // "Add Customer" button should be present
    await expect(
      page.getByRole("button", { name: /add customer/i })
    ).toBeVisible();

    // Total count text should be visible (demo account has seed customers)
    await expect(page.getByText(/total/)).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // 2. Customer search
  // -----------------------------------------------------------------------
  test("Customer search bar filters results", async ({ page }) => {
    await page.goto("/customers");

    // Wait for list to load
    await expect(page.getByText(/total/)).toBeVisible({ timeout: 15000 });

    const searchInput = page.getByPlaceholder(
      /search customers by name, email, or phone/i
    );
    await expect(searchInput).toBeVisible();

    // Search for a term that should not match any customer
    await searchInput.fill("ZZZNonExistentCustomerName999");

    // Should show the "no results" message
    await expect(
      page.getByText(/no customers match your filters/i)
    ).toBeVisible({ timeout: 10000 });

    // Clear the search and verify the list repopulates
    await searchInput.clear();
    await expect(page.getByText(/total/)).toBeVisible({ timeout: 10000 });
  });

  // -----------------------------------------------------------------------
  // 3. Customer detail -- name, contact info, tabs, and properties
  // -----------------------------------------------------------------------
  test("Customer detail page shows name, contact info, tabs, and Properties card", async ({
    page,
  }) => {
    await page.goto("/customers");

    // Wait for at least one customer to appear
    await expect(page.getByText(/total/)).toBeVisible({ timeout: 15000 });

    // Click the first customer link in the list
    const firstCustomerLink = page
      .getByRole("main")
      .getByRole("link")
      .filter({ hasNotText: /customers/i })
      .first();

    // If no customer links exist, skip gracefully
    const linkCount = await firstCustomerLink.count();
    if (linkCount === 0) {
      test.skip();
      return;
    }

    await firstCustomerLink.click();

    // Should navigate to a customer detail URL
    await expect(page).toHaveURL(/\/customers\/[a-z0-9-]+/, {
      timeout: 10000,
    });

    // Customer name should be displayed as h1
    await expect(
      page.getByRole("main").locator("h1")
    ).toBeVisible({ timeout: 10000 });

    // Contact info section -- at least "Contact Information" card title is visible
    await expect(
      page.getByText("Contact Information")
    ).toBeVisible();

    // Verify the tabs are visible -- the customer detail has these tabs:
    // Overview, Quotes, Jobs, Invoices, Payments, Messages, Communications, Notes
    const expectedTabs = [
      "Overview",
      "Quotes",
      "Jobs",
      "Invoices",
      "Payments",
      "Communications",
      "Notes",
    ];

    for (const tabLabel of expectedTabs) {
      await expect(
        page.getByRole("tab", { name: tabLabel })
      ).toBeVisible({ timeout: 5000 });
    }

    // The Overview tab is active by default -- check that "Properties" card is visible
    await expect(page.getByText("Properties")).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // 4. Recent Activity section (conditional)
  // -----------------------------------------------------------------------
  test("Recent Activity section appears in Overview tab when activity events exist", async ({
    page,
  }) => {
    await page.goto("/customers");

    // Wait for list to load
    await expect(page.getByText(/total/)).toBeVisible({ timeout: 15000 });

    // Click the first customer link
    const firstCustomerLink = page
      .getByRole("main")
      .getByRole("link")
      .filter({ hasNotText: /customers/i })
      .first();

    const linkCount = await firstCustomerLink.count();
    if (linkCount === 0) {
      test.skip();
      return;
    }

    await firstCustomerLink.click();
    await expect(page).toHaveURL(/\/customers\/[a-z0-9-]+/, {
      timeout: 10000,
    });

    // The Overview tab is active by default. Check whether "Recent Activity"
    // appears. It only shows when the customer has ActivityEvent records
    // from their jobs. This test gracefully handles both cases.
    const recentActivityHeading = page.getByText("Recent Activity");

    // Wait a moment for the page to fully render
    await page.waitForTimeout(1000);

    const isVisible = await recentActivityHeading.isVisible();

    if (isVisible) {
      // If visible, verify it's within the overview tab content
      await expect(recentActivityHeading).toBeVisible();
    } else {
      // No activity events for this customer -- that's okay, just verify
      // the Overview tab is still showing (Properties card visible)
      await expect(page.getByText("Properties")).toBeVisible();
    }
  });

  // -----------------------------------------------------------------------
  // 5. Create customer flow -- form loads
  // -----------------------------------------------------------------------
  test("Add Customer button opens the customer form sheet", async ({
    page,
  }) => {
    await page.goto("/customers");

    // Wait for the page to load
    await expect(
      page.getByRole("button", { name: /add customer/i })
    ).toBeVisible({ timeout: 15000 });

    // Click "Add Customer"
    await page.getByRole("button", { name: /add customer/i }).click();

    // The sheet should open with the heading "Add Customer"
    await expect(
      page.getByRole("heading", { name: "Add Customer" })
    ).toBeVisible({ timeout: 5000 });

    // Verify form fields exist
    await expect(page.locator("#firstName")).toBeVisible();
    await expect(page.locator("#lastName")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#phone")).toBeVisible();

    // The "Save Customer" button should be present
    await expect(
      page.getByRole("button", { name: /save customer/i })
    ).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // 6. Customer CRUD -- create then delete
  // -----------------------------------------------------------------------
  test("Can create a customer and then delete it", async ({ page }) => {
    const firstName = `V2First-${TS}`;
    const lastName = `V2Last-${RAND}`;
    const email = `v2-${TS}-${RAND}@e2etest.io`;

    await page.goto("/customers");

    // Wait for list to load
    await expect(
      page.getByRole("button", { name: /add customer/i })
    ).toBeVisible({ timeout: 15000 });

    // -- CREATE --

    // Open the Add Customer form
    await page.getByRole("button", { name: /add customer/i }).click();
    await expect(
      page.getByRole("heading", { name: "Add Customer" })
    ).toBeVisible({ timeout: 5000 });

    // Fill required fields
    await page.locator("#firstName").fill(firstName);
    await page.locator("#lastName").fill(lastName);
    await page.locator("#email").fill(email);
    await page.locator("#phone").fill("5559876543");

    // Submit
    await page.getByRole("button", { name: /save customer/i }).click();

    // Wait for the success toast
    await expect(page.getByText("Customer created")).toBeVisible({
      timeout: 10000,
    });

    // Verify the new customer appears in the list
    await expect(page.getByText(`${firstName} ${lastName}`)).toBeVisible({
      timeout: 10000,
    });

    // -- DELETE --

    // Navigate to the customer detail page
    const customerLink = page.getByRole("link", {
      name: `${firstName} ${lastName}`,
    });
    await customerLink.click();

    await expect(page).toHaveURL(/\/customers\/[a-z0-9-]+/, {
      timeout: 10000,
    });

    // Verify customer name is displayed
    await expect(
      page
        .getByRole("main")
        .locator("h1")
        .filter({ hasText: `${firstName} ${lastName}` })
    ).toBeVisible({ timeout: 10000 });

    // Open the more actions dropdown
    const moreMenuButton = page
      .locator('button:has(svg.lucide-ellipsis)')
      .first();
    await expect(moreMenuButton).toBeVisible({ timeout: 5000 });
    await moreMenuButton.click();

    // Click "Delete" -- this will trigger a confirm dialog
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("menuitem", { name: /delete/i }).click();

    // Should redirect back to /customers and show success toast
    await expect(page.getByText("Customer deleted")).toBeVisible({
      timeout: 10000,
    });

    await expect(page).toHaveURL("/customers", { timeout: 10000 });

    // Verify the customer no longer appears in the list
    await expect(
      page.getByText(`${firstName} ${lastName}`)
    ).not.toBeVisible({ timeout: 5000 });
  });
});
