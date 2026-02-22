import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 5 -- Quotes Tests
// ---------------------------------------------------------------------------
// Tests exercise the quotes workflow: list page, creation flow (via the
// QuoteBuilder), detail page with status-based actions, and status tabs.
// All tests use the demo account which has seed data (customers + services).
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
// Quote List
// ---------------------------------------------------------------------------
test.describe("Quote List", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/quotes");
    await page.waitForURL("/quotes");
    // Wait for either the quotes heading (when quotes exist) or the empty state
    await expect(
      page.locator("main").locator("h1, h2").first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("quote list page loads with correct columns or empty state", async ({ page }) => {
    // With no seed quotes, the page may show empty state or a table
    const hasTable = await page.locator("thead tr").isVisible().catch(() => false);

    if (hasTable) {
      const headerRow = page.locator("thead tr");
      await expect(headerRow.getByText("Quote #")).toBeVisible();
      await expect(headerRow.getByText("Customer")).toBeVisible();
      await expect(headerRow.getByText("Amount")).toBeVisible();
      await expect(headerRow.getByText("Status")).toBeVisible();
      await expect(headerRow.getByText("Created")).toBeVisible();
      await expect(headerRow.getByText("Valid Until")).toBeVisible();
    } else {
      // Empty state: "No quotes yet" heading
      await expect(page.getByText("No quotes yet")).toBeVisible();
    }
  });

  test("can navigate to create quote page", async ({ page }) => {
    // Click the "New Quote" button -- could be a link or button depending on state
    const newQuoteLink = page.getByRole("link", { name: /new quote/i });
    const newQuoteButton = page.getByRole("button", { name: /new quote|create.*first.*quote/i });

    if (await newQuoteLink.isVisible().catch(() => false)) {
      await newQuoteLink.click();
    } else {
      // Empty state may show a different button
      await newQuoteButton.first().click();
    }

    // Should navigate to /quotes/new
    await expect(page).toHaveURL(/\/quotes\/new/);

    // Verify the page heading is visible
    await expect(
      page.locator("main").locator("h1")
    ).toBeVisible({ timeout: 10000 });
  });

  test("status tabs show on the quote list", async ({ page }) => {
    // Tabs only render when quotes exist (not in empty state)
    const hasTable = await page.locator("thead tr").isVisible().catch(() => false);

    if (hasTable) {
      const expectedTabs = ["All", "Draft", "Sent", "Approved", "Declined", "Expired"];
      for (const tabLabel of expectedTabs) {
        await expect(page.getByRole("tab", { name: new RegExp(tabLabel, "i") })).toBeVisible();
      }
    } else {
      // Empty state -- tabs are not shown, just verify page loaded
      await expect(page.getByText("No quotes yet")).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Create Quote
// ---------------------------------------------------------------------------
test.describe("Create Quote", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/quotes/new");
    await page.waitForURL("/quotes/new");
    await expect(
      page.locator("main").locator("h1")
    ).toBeVisible({ timeout: 10000 });
  });

  test("create quote page has customer selector, line items, and summary panel", async ({
    page,
  }) => {
    // Customer selector -- the combobox trigger button with placeholder text "Select a customer..."
    const customerCombobox = page.getByRole("combobox").filter({ hasText: /select a customer/i });
    await expect(customerCombobox).toBeVisible();

    // Line Items section -- check the label
    await expect(page.getByText("Line Items")).toBeVisible();

    // Line items table headers (scope to main to avoid sidebar "Demo Service Co" matching "Service")
    await expect(page.getByRole("columnheader", { name: "Service" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Description" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Qty" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Unit Price" })).toBeVisible();

    // Summary panel on the right
    await expect(page.getByText("Summary")).toBeVisible();
    await expect(page.getByText("Subtotal")).toBeVisible();
    await expect(page.getByText(/Tax/)).toBeVisible();
    await expect(page.getByText("Total", { exact: true }).first()).toBeVisible();

    // Save as Draft button
    await expect(
      page.getByRole("button", { name: /save as draft/i })
    ).toBeVisible();

    // Send Quote button
    await expect(
      page.getByRole("button", { name: /send quote/i })
    ).toBeVisible();
  });

  test("can create a draft quote", async ({ page }) => {
    // Step 1: Select a customer using the combobox trigger button (first combobox on the page)
    const customerCombobox = page.getByRole("combobox").first();
    await customerCombobox.click();

    // Wait for the popover dropdown to appear with customer options
    await expect(page.locator("[cmdk-list]")).toBeVisible({ timeout: 5000 });

    // Select the first customer from the list
    const firstCustomerOption = page.locator("[cmdk-item]").first();
    await expect(firstCustomerOption).toBeVisible();
    const customerName = await firstCustomerOption.locator("p.text-sm.font-medium").textContent();
    await firstCustomerOption.click();

    // Verify customer is selected (button now shows the customer name)
    if (customerName) {
      await expect(customerCombobox).toContainText(customerName.trim());
    }

    // Step 2: Select a service for the first line item
    // The line items table has a Select with "Custom Item" as the default
    const serviceSelect = page.locator("table tbody tr").first().locator("button[role='combobox']").first();
    await serviceSelect.click();

    // Pick the second option (first service, not "Custom Item")
    const serviceOptions = page.locator("[role='option']");
    const optionCount = await serviceOptions.count();
    if (optionCount > 1) {
      // Select a real service (not "Custom Item")
      await serviceOptions.nth(1).click();
    } else {
      // Only "Custom Item" available, select it and fill manually
      await serviceOptions.first().click();
    }

    // Wait a moment for the form to update
    await page.waitForTimeout(500);

    // If we got a custom item, fill in the name and price
    const nameInput = page.locator('input[placeholder="Item name"]').first();
    const nameValue = await nameInput.inputValue();
    if (!nameValue) {
      await nameInput.fill("Test Service");
    }

    // Ensure unit price is set
    const priceInputs = page.locator("table tbody tr").first().locator('input[type="number"]');
    const priceInput = priceInputs.last(); // The unit price field is the last number input in the row
    const priceValue = await priceInput.inputValue();
    if (!priceValue || priceValue === "0") {
      await priceInput.fill("150");
    }

    // Step 3: Save as Draft
    await page.getByRole("button", { name: /save as draft/i }).click();

    // Should redirect to the quote detail page (not /quotes/new)
    await expect(page).toHaveURL(/\/quotes\/(?!new)[a-zA-Z0-9-]+$/, { timeout: 15000 });

    // The toast should show success
    await expect(page.getByText(/quote saved as draft/i)).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Draft Quote in List & Detail Page
// ---------------------------------------------------------------------------
test.describe("Quote Detail", () => {
  let quoteDetailUrl: string;

  test.beforeAll(async ({ browser }) => {
    // Create a draft quote that subsequent tests will use
    const page = await browser.newPage();
    await loginAsDemo(page);
    await page.goto("/quotes/new");
    await page.waitForURL("/quotes/new");
    await expect(
      page.locator("main").locator("h1")
    ).toBeVisible({ timeout: 10000 });

    // Select customer using the combobox trigger button (first combobox on the page)
    const customerCombobox = page.getByRole("combobox").first();
    await customerCombobox.click();
    await expect(page.locator("[cmdk-list]")).toBeVisible({ timeout: 5000 });
    await page.locator("[cmdk-item]").first().click();

    // Fill in a line item manually -- the item name input
    const nameInput = page.locator('input[placeholder="Item name"]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill("E2E Test Service");
    }
    // Ensure unit price is set
    const priceInputs = page.locator("table tbody tr").first().locator('input[type="number"]');
    const priceCount = await priceInputs.count();
    if (priceCount > 0) {
      await priceInputs.last().fill("200");
    }

    // Save as draft
    await page.getByRole("button", { name: /save as draft/i }).click();
    // Wait for redirect to quote detail page (UUID format, not /quotes/new)
    await expect(page).toHaveURL(/\/quotes\/(?!new)[a-zA-Z0-9-]+$/, { timeout: 15000 });

    // Capture the URL
    quoteDetailUrl = page.url();
    await page.close();
  });

  test("draft quote appears in the list", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/quotes");
    await page.waitForURL("/quotes");
    // After creating a quote in beforeAll, the h1 "Quotes" should now be visible
    await expect(
      page.locator("main").locator("h1, h2").first()
    ).toBeVisible({ timeout: 10000 });

    // Click on the "Draft" tab to filter
    const draftTab = page.getByRole("tab", { name: /draft/i });
    if (await draftTab.isVisible().catch(() => false)) {
      await draftTab.click();
      // Wait for the list to update
      await page.waitForTimeout(1000);
    }

    // The table body should have at least one row
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    // At least one row should contain "Draft" status badge
    await expect(page.locator("tbody").getByText("Draft").first()).toBeVisible();
  });

  test("can open quote detail page", async ({ page }) => {
    await loginAsDemo(page);

    // Navigate to the quote detail page
    await page.goto(quoteDetailUrl);

    // Should see the quote number (e.g., Q-XXXX) in a mono font heading
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 10000 });

    // Should see the status badge
    await expect(
      page.locator("span.inline-flex.items-center.rounded-full").first()
    ).toBeVisible();

    // Customer card should be visible
    await expect(page.getByText("Customer").first()).toBeVisible();

    // Line Items section should be visible
    await expect(page.getByText("Line Items").first()).toBeVisible();

    // Timeline section should be visible
    await expect(page.getByText("Timeline").first()).toBeVisible();
  });

  test("quote detail shows correct status buttons for DRAFT", async ({
    page,
  }) => {
    await loginAsDemo(page);
    await page.goto(quoteDetailUrl);

    // Wait for the page to load
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 10000 });

    // DRAFT status should show: Edit, Send Quote, Delete
    await expect(
      page.getByRole("link", { name: /edit/i })
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: /send quote/i })
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: /delete/i })
    ).toBeVisible();
  });
});
