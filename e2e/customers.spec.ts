import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 3 -- Customer Management Tests
// ---------------------------------------------------------------------------
// These tests exercise the customer CRUD lifecycle: empty state, creation,
// search, detail view with tabs, editing, archiving, and notes.
// A fresh user is registered in beforeAll so the org starts with zero
// customers.
// ---------------------------------------------------------------------------

/** Credentials for the test user registered once in beforeAll. */
let TEST_EMAIL: string;
const TEST_PASSWORD = "CustTestPassword123!";
const TEST_FIRST = "Cust";
const TEST_LAST = "Tester";
const TEST_BUSINESS = "Cust Test Business";

/** Timestamp suffix used to make customer data unique per run.
 *  Computed once in beforeAll so all tests in the suite share the same value.
 */
let TS: number;

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
// One-time setup: register a fresh user so the org has no customers.
// ---------------------------------------------------------------------------
test.beforeAll(async ({ browser }) => {
  TS = Date.now();
  TEST_EMAIL = `cust-test-${TS}-${Math.floor(Math.random() * 10000)}@example.com`;

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
// Empty State
// ---------------------------------------------------------------------------
test.describe("Customer empty state", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("shows empty state when no customers exist", async ({ page }) => {
    await page.goto("/customers");

    // The empty state shows "No customers yet" heading and an "Add Customer" button
    await expect(
      page.getByRole("heading", { name: /no customers yet/i })
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText(/add your first customer/i)
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: /add customer/i })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Customer CRUD
// ---------------------------------------------------------------------------
test.describe("Customer CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
  });

  test("can add a customer with name, email, phone, and a property", async ({
    page,
  }) => {
    await page.goto("/customers");

    // Click "Add Customer" -- could be the empty state button or the header button
    await page.getByRole("button", { name: /add customer/i }).click();

    // The side sheet opens -- verify via the sheet heading (not the trigger button)
    await expect(
      page.getByRole("heading", { name: "Add Customer" })
    ).toBeVisible({ timeout: 5000 });

    // Fill contact information via label-based IDs
    await page.locator("#firstName").fill(`TestFirst-${TS}`);
    await page.locator("#lastName").fill(`TestLast-${TS}`);
    await page.locator("#email").fill(`customer-${TS}@example.com`);
    await page.locator("#phone").fill("5551234567");

    // Fill the service address (property) -- the first property form is
    // pre-expanded by default. The first address input has placeholder
    // "Street address".
    await page
      .locator('input[placeholder="Street address"]')
      .fill("123 Test Street");
    // City, State, ZIP -- the labels within the property section
    // City input is inside the property card
    const propertyCard = page.locator(".rounded-lg.border").filter({
      has: page.locator('input[placeholder="Street address"]'),
    });

    // Fill city -- the first input after the address fields within the card
    // Inputs inside property card: 0=addressLine1, 1=addressLine2, 2=city, 3=zip, 4=notes
    const cityInput = propertyCard
      .locator("input")
      .nth(2);
    await cityInput.fill("Testville");

    // State -- it's a Select component, click the trigger then pick a state
    await propertyCard.locator("button").filter({ hasText: "State" }).click();
    await page.getByRole("option", { name: "FL" }).click();

    // ZIP -- index 3 (not .last() which is the property notes input)
    const zipInput = propertyCard.locator("input").nth(3);
    await zipInput.fill("33101");

    // Submit the form
    await page.getByRole("button", { name: /save customer/i }).click();

    // Wait for the success toast
    await expect(page.getByText("Customer created")).toBeVisible({
      timeout: 10000,
    });
  });

  test("customer appears in the customer list after creation", async ({
    page,
  }) => {
    await page.goto("/customers");

    // The customer list should now show at least one customer.
    // The customer we just created should be visible.
    await expect(
      page.getByText(`TestFirst-${TS} TestLast-${TS}`)
    ).toBeVisible({ timeout: 10000 });

    // The total count text should show "1 total" (or more if other tests ran)
    await expect(page.getByText(/total/)).toBeVisible();
  });

  test("can search customers by name", async ({ page }) => {
    await page.goto("/customers");

    // Wait for the list to load
    await expect(
      page.getByText(`TestFirst-${TS}`)
    ).toBeVisible({ timeout: 10000 });

    // Type a search query that matches the created customer
    const searchInput = page.getByPlaceholder(
      /search customers by name, email, or phone/i
    );
    await searchInput.fill(`TestFirst-${TS}`);

    // Wait for debounced search -- the matching customer should still be visible
    await expect(
      page.getByText(`TestFirst-${TS} TestLast-${TS}`)
    ).toBeVisible({ timeout: 10000 });

    // Now search for something that does not match
    await searchInput.clear();
    await searchInput.fill("ZZZNonExistentCustomer");

    // Should show "No customers match your filters."
    await expect(
      page.getByText(/no customers match your filters/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("can open customer detail page by clicking customer name", async ({
    page,
  }) => {
    await page.goto("/customers");

    // Wait for the customer to appear
    const customerLink = page.getByRole("link", {
      name: `TestFirst-${TS} TestLast-${TS}`,
    });
    await expect(customerLink).toBeVisible({ timeout: 10000 });

    // Click the customer name link
    await customerLink.click();

    // The URL should change to /customers/<uuid>
    await expect(page).toHaveURL(/\/customers\/[a-z0-9-]+/, {
      timeout: 10000,
    });

    // The detail page should show the customer's full name as an h1 in the main content
    await expect(
      page.getByRole("main").locator("h1").filter({ hasText: `TestFirst-${TS} TestLast-${TS}` })
    ).toBeVisible({ timeout: 10000 });
  });

  test("customer detail page shows all tabs", async ({ page }) => {
    await page.goto("/customers");

    // Navigate to customer detail
    const customerLink = page.getByRole("link", {
      name: `TestFirst-${TS} TestLast-${TS}`,
    });
    await expect(customerLink).toBeVisible({ timeout: 10000 });
    await customerLink.click();
    await expect(page).toHaveURL(/\/customers\/[a-z0-9-]+/, {
      timeout: 10000,
    });

    // Verify all expected tabs are visible
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
  });

  test("can edit a customer", async ({ page }) => {
    await page.goto("/customers");

    // Wait for customer to load
    await expect(
      page.getByText(`TestFirst-${TS}`)
    ).toBeVisible({ timeout: 10000 });

    // Open the row actions dropdown -- the MoreHorizontal button in the
    // customer's row. We find the row, then click the actions button.
    const customerRow = page.locator("tr").filter({
      hasText: `TestFirst-${TS}`,
    });
    await customerRow.locator("button").last().click();

    // Click "Edit" from the dropdown
    await page.getByRole("menuitem", { name: /edit/i }).click();

    // The edit sheet should open with the title "Edit Customer"
    await expect(page.getByRole("heading", { name: "Edit Customer" })).toBeVisible({
      timeout: 5000,
    });

    // Change the company field
    await page.locator("#company").fill(`EditedCompany-${TS}`);

    // Submit the edit form
    await page.getByRole("button", { name: /update customer/i }).click();

    // Wait for success toast
    await expect(page.getByText("Customer updated")).toBeVisible({
      timeout: 10000,
    });
  });

  test("can archive a customer", async ({ page }) => {
    await page.goto("/customers");

    // Wait for customer to load
    await expect(
      page.getByText(`TestFirst-${TS}`)
    ).toBeVisible({ timeout: 10000 });

    // Open the row actions dropdown
    const customerRow = page.locator("tr").filter({
      hasText: `TestFirst-${TS}`,
    });
    await customerRow.locator("button").last().click();

    // Click "Archive" from the dropdown
    await page.getByRole("menuitem", { name: /archive/i }).click();

    // Wait for success toast
    await expect(page.getByText("Customer archived")).toBeVisible({
      timeout: 10000,
    });

    // The customer should disappear from the active list (default filter is active)
    await expect(
      page.getByText(`TestFirst-${TS} TestLast-${TS}`)
    ).not.toBeVisible({ timeout: 5000 });
  });

  test("can add a note to a customer", async ({ page }) => {
    // First, unarchive -- navigate directly to the archived filter via URL
    await page.goto("/customers?status=archived");

    // Wait for archived customer to appear
    await expect(
      page.getByText(`TestFirst-${TS}`)
    ).toBeVisible({ timeout: 10000 });

    // Click the customer name to go to detail page
    const customerLink = page.getByRole("link", {
      name: `TestFirst-${TS} TestLast-${TS}`,
    });
    await customerLink.click();
    await expect(page).toHaveURL(/\/customers\/[a-z0-9-]+/, {
      timeout: 10000,
    });

    // Unarchive via the dropdown menu on the detail page
    // The DropdownMenuTrigger is a small icon-only button (h-8 w-8) with MoreHorizontal icon
    // Find it by looking for a button with the lucide-ellipsis SVG class
    const moreMenuButton = page.locator('button:has(svg.lucide-ellipsis)').first();
    await expect(moreMenuButton).toBeVisible({ timeout: 5000 });
    await moreMenuButton.click();
    // Wait for dropdown to appear
    await expect(page.getByRole("menuitem", { name: /unarchive/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("menuitem", { name: /unarchive/i }).click();
    await expect(page.getByText("Customer restored")).toBeVisible({
      timeout: 10000,
    });

    // Now switch to the Notes tab
    await page.getByRole("tab", { name: "Notes" }).click();

    // The note input should be visible
    const noteInput = page.getByPlaceholder(/add a note/i);
    await expect(noteInput).toBeVisible({ timeout: 5000 });

    // Type a note and submit
    const noteText = `Test note at ${TS}`;
    await noteInput.fill(noteText);
    await page.getByRole("button", { name: /save/i }).click();

    // Wait for success toast
    await expect(page.getByText("Note added")).toBeVisible({
      timeout: 10000,
    });
  });
});
