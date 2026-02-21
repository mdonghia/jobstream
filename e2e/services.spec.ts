import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 3 -- Services Management Tests
// ---------------------------------------------------------------------------
// These tests exercise the service catalog CRUD within Settings > Services:
// navigation, empty state, creation with name/price/category, list presence,
// editing, and deactivation.
// A fresh user is registered in beforeAll so the org starts with zero services.
// ---------------------------------------------------------------------------

/** Credentials for the test user registered once in beforeAll. */
let TEST_EMAIL: string;
const TEST_PASSWORD = "SvcTestPassword123!";
const TEST_FIRST = "Svc";
const TEST_LAST = "Tester";
const TEST_BUSINESS = "Svc Test Business";

/** Timestamp suffix used to make service data unique per run. */
const TS = Date.now();

/** Helper: fill the login form and wait for the dashboard. */
async function loginViaForm(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Scope to header to avoid the duplicate h1 in main content
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// One-time setup: register a fresh user so the org has no services.
// ---------------------------------------------------------------------------
test.beforeAll(async ({ browser }) => {
  TEST_EMAIL = `svc-test-${TS}-${Math.floor(Math.random() * 10000)}@example.com`;

  const page = await browser.newPage();
  await page.goto("/register");
  await page.getByLabel(/first name/i).fill(TEST_FIRST);
  await page.getByLabel(/last name/i).fill(TEST_LAST);
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByLabel(/business name/i).fill(TEST_BUSINESS);
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });

  await page.close();
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
test.describe("Services navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("can navigate to Settings > Services", async ({ page }) => {
    // Click Settings in the sidebar
    const sidebar = page.locator("aside");
    await sidebar.getByRole("link", { name: "Settings", exact: true }).click();

    // Settings should redirect to /settings/general by default
    await expect(page).toHaveURL(/\/settings\/general/, { timeout: 10000 });

    // Click "Services" in the settings sub-nav
    await page.getByRole("link", { name: "Services", exact: true }).click();

    await expect(page).toHaveURL(/\/settings\/services/, { timeout: 10000 });

    // The Services heading should be visible
    await expect(
      page.getByRole("heading", { name: "Services" })
    ).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Empty State & CRUD
// ---------------------------------------------------------------------------
test.describe("Services CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("empty state shows when no services exist", async ({ page }) => {
    await page.goto("/settings/services");

    // The empty state shows "No services yet" heading
    await expect(
      page.getByRole("heading", { name: /no services yet/i })
    ).toBeVisible({ timeout: 10000 });

    // There should be descriptive text
    await expect(
      page.getByText(/add the services you offer/i)
    ).toBeVisible();

    // And an "Add Service" button
    await expect(
      page.getByRole("button", { name: /add service/i })
    ).toBeVisible();
  });

  test("can add a service with name, price, and category", async ({
    page,
  }) => {
    await page.goto("/settings/services");

    // Click "Add Service" button
    await page.getByRole("button", { name: /add service/i }).click();

    // The dialog should open with "Add Service" title
    await expect(
      page.getByRole("heading", { name: "Add Service" })
    ).toBeVisible({ timeout: 5000 });

    // Fill in service name
    await page
      .getByPlaceholder("e.g. Lawn Mowing")
      .fill(`Test Service-${TS}`);

    // Fill in category
    await page
      .getByPlaceholder("Type or select a category...")
      .fill(`TestCategory-${TS}`);

    // Fill in price -- the price input has placeholder "0.00" and is inside
    // a container with a "$" prefix
    await page.getByPlaceholder("0.00").fill("150");

    // Submit
    await page.getByRole("button", { name: "Add Service" }).click();

    // Wait for success toast
    await expect(page.getByText("Service created")).toBeVisible({
      timeout: 10000,
    });
  });

  test("service appears in the list after creation", async ({ page }) => {
    await page.goto("/settings/services");

    // The service we just created should be visible in the table
    await expect(
      page.getByText(`Test Service-${TS}`)
    ).toBeVisible({ timeout: 10000 });

    // The category badge should be visible
    await expect(
      page.getByText(`TestCategory-${TS}`)
    ).toBeVisible();

    // The count text should show "1 service" (or similar)
    await expect(
      page.getByText(/service.*in your catalog/i)
    ).toBeVisible();
  });

  test("can edit a service", async ({ page }) => {
    await page.goto("/settings/services");

    // Wait for the service to appear
    await expect(
      page.getByText(`Test Service-${TS}`)
    ).toBeVisible({ timeout: 10000 });

    // Open the actions dropdown for this service row
    const serviceRow = page.locator("tr").filter({
      hasText: `Test Service-${TS}`,
    });
    await serviceRow.locator("button").last().click();

    // Click "Edit" in the dropdown
    await page.getByRole("menuitem", { name: /edit/i }).click();

    // The edit dialog should open with "Edit Service" title
    await expect(
      page.getByRole("heading", { name: "Edit Service" })
    ).toBeVisible({ timeout: 5000 });

    // Update the description
    await page
      .getByPlaceholder("Brief description of the service...")
      .fill(`Edited description at ${TS}`);

    // Submit
    await page.getByRole("button", { name: /save changes/i }).click();

    // Wait for success toast
    await expect(page.getByText("Service updated")).toBeVisible({
      timeout: 10000,
    });
  });

  test("can deactivate a service", async ({ page }) => {
    await page.goto("/settings/services");

    // Wait for the service to appear
    await expect(
      page.getByText(`Test Service-${TS}`)
    ).toBeVisible({ timeout: 10000 });

    // Open the actions dropdown for this service row
    const serviceRow = page.locator("tr").filter({
      hasText: `Test Service-${TS}`,
    });
    await serviceRow.locator("button").last().click();

    // Click "Deactivate" in the dropdown
    await page.getByRole("menuitem", { name: /deactivate/i }).click();

    // Wait for success toast
    await expect(page.getByText("Service deactivated")).toBeVisible({
      timeout: 10000,
    });

    // The status badge should now show "Inactive"
    const updatedRow = page.locator("tr").filter({
      hasText: `Test Service-${TS}`,
    });
    await expect(updatedRow.getByText("Inactive")).toBeVisible({
      timeout: 5000,
    });
  });
});
