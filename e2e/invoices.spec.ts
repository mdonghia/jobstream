import { test, expect, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 8 -- Invoice Tests
// ---------------------------------------------------------------------------
// These tests cover the invoices module: list page, summary cards, status tabs,
// create invoice page, draft creation, detail page, action buttons, and
// recording manual payments.
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
// Invoice List Page
// ---------------------------------------------------------------------------
test.describe("Invoice List", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
    await page.goto("/invoices");
    await page.waitForURL("/invoices");
    // Wait for either the invoices heading (when invoices exist) or the empty state
    await expect(
      page.locator("main").locator("h1, h2").first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("invoice list page loads with summary cards or empty state", async ({ page }) => {
    // With no seed invoices, the component shows empty state instead of summary cards
    const hasH1 = await page.locator("main h1").isVisible().catch(() => false);

    if (hasH1) {
      // Full page with summary cards (use .first() to avoid matching tab buttons too)
      await expect(page.getByText("Outstanding", { exact: false }).first()).toBeVisible();
      await expect(page.getByText("Overdue", { exact: false }).first()).toBeVisible();
      await expect(page.getByText("Paid This Month")).toBeVisible();
      await expect(page.getByText("Avg Days to Pay")).toBeVisible();
    } else {
      // Empty state
      await expect(page.getByText("No invoices yet")).toBeVisible();
    }
  });

  test("invoice list has status tabs or empty state", async ({
    page,
  }) => {
    // Tabs only render when invoices exist
    const hasH1 = await page.locator("main h1").isVisible().catch(() => false);

    if (hasH1) {
      const expectedTabs = ["All", "Draft", "Sent", "Overdue", "Paid", "Void"];
      for (const tabName of expectedTabs) {
        const tab = page.getByRole("tab", { name: new RegExp(tabName, "i") });
        await expect(tab).toBeVisible();
      }
    } else {
      await expect(page.getByText("No invoices yet")).toBeVisible();
    }
  });

  test("can navigate to create invoice page", async ({ page }) => {
    // Click the "New Invoice" button -- could be a button or link depending on state
    const newInvoiceBtn = page.getByRole("button", { name: /new invoice/i });
    const newInvoiceLink = page.getByRole("link", { name: /new invoice|create.*first.*invoice/i });

    if (await newInvoiceBtn.isVisible().catch(() => false)) {
      await newInvoiceBtn.click();
    } else if (await newInvoiceLink.isVisible().catch(() => false)) {
      await newInvoiceLink.click();
    } else {
      // Empty state might have a different button
      await page.getByRole("button").filter({ hasText: /invoice/i }).first().click();
    }

    // Should navigate to /invoices/new
    await expect(page).toHaveURL(/\/invoices\/new/, { timeout: 10000 });

    // The page heading should say "New Invoice"
    await expect(
      page.locator("main").locator("h1")
    ).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Create Invoice Page
// ---------------------------------------------------------------------------
test.describe("Create Invoice", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaForm(page);
    await page.goto("/invoices/new");
    await page.waitForURL("/invoices/new");
    await expect(
      page.locator("main").locator("h1")
    ).toBeVisible({ timeout: 15000 });
  });

  test("create invoice page has customer selector, line items, discount toggle, summary panel", async ({
    page,
  }) => {
    // Customer selector -- rendered as a combobox button with "Select customer..." text
    const customerCombobox = page.getByRole("combobox").filter({ hasText: /select customer/i });
    await expect(customerCombobox).toBeVisible();

    // Line Items section -- identified by label text
    await expect(page.getByText("Line Items")).toBeVisible();

    // Discount section -- has a label "Discount" and a switch toggle
    await expect(
      page.locator("label", { hasText: "Discount" })
    ).toBeVisible();
    await expect(page.locator('[role="switch"]')).toBeVisible();

    // Summary panel -- right column with heading "Summary"
    await expect(
      page.getByRole("heading", { name: "Summary" })
    ).toBeVisible();

    // Summary panel includes Subtotal and Total
    await expect(page.getByText("Subtotal")).toBeVisible();
    await expect(page.getByText("Total", { exact: true }).first()).toBeVisible();

    // Action buttons: "Send Invoice" and "Save as Draft"
    await expect(
      page.getByRole("button", { name: /send invoice/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save as draft/i })
    ).toBeVisible();
  });

  test("can create a draft invoice", async ({ page }) => {
    // Step 1: Select a customer
    const customerCombobox = page.getByRole("combobox").first();
    await customerCombobox.click();

    // Wait for the popover with customer list to appear
    await expect(page.getByPlaceholder("Search customers...")).toBeVisible({
      timeout: 5000,
    });

    // Select the first customer in the list
    const firstCustomerOption = page.locator('[role="option"]').first();
    await expect(firstCustomerOption).toBeVisible({ timeout: 5000 });
    await firstCustomerOption.click();

    // Step 2: Fill in line item details
    // The first line item row is already present. Fill in the "Name" field.
    const nameInput = page.getByPlaceholder("Line item name").first();
    await nameInput.fill("Test Service");

    // Fill unit price
    const unitPriceInput = page
      .locator('input[type="number"][step="0.01"][min="0"]')
      .first();
    await unitPriceInput.fill("100");

    // Step 3: Save as Draft
    await page.getByRole("button", { name: /save as draft/i }).click();

    // Should redirect to the invoice detail page (not the list page)
    await expect(page).toHaveURL(/\/invoices\/(?!new)[a-zA-Z0-9-]+$/, { timeout: 15000 });

    // A toast message should appear confirming save
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Invoice Detail Page
// ---------------------------------------------------------------------------
test.describe("Invoice Detail", () => {
  test("can open invoice detail page", async ({ page }) => {
    await loginViaForm(page);

    // First create a draft invoice since seed data has no invoices
    await page.goto("/invoices/new");
    await page.waitForURL("/invoices/new");
    await expect(page.locator("main").locator("h1")).toBeVisible({ timeout: 15000 });

    // Select a customer
    const customerCombobox = page.getByRole("combobox").first();
    await customerCombobox.click();
    await expect(page.getByPlaceholder("Search customers...")).toBeVisible({ timeout: 5000 });
    await page.locator('[role="option"]').first().click();

    // Fill in a line item
    await page.getByPlaceholder("Line item name").first().fill("Detail Test");
    await page.locator('input[type="number"][step="0.01"][min="0"]').first().fill("75");

    // Save as draft -- redirects to detail page
    await page.getByRole("button", { name: /save as draft/i }).click();
    await expect(page).toHaveURL(/\/invoices\/[a-zA-Z0-9-]+$/, { timeout: 15000 });

    // The detail page should display the invoice number as a heading (h1 with font-mono)
    const invoiceHeading = page.locator("h1.font-mono");
    await expect(invoiceHeading).toBeVisible({ timeout: 10000 });

    // Should show the "Details" card on the right side
    await expect(page.getByText("Details")).toBeVisible();

    // Should show the "Line Items" card
    await expect(page.getByText("Line Items")).toBeVisible();

    // Should show the "Customer" card (exact: true to avoid matching "Customers" in sidebar)
    await expect(page.getByText("Customer", { exact: true })).toBeVisible();
  });

  test("invoice detail shows correct action buttons for DRAFT status", async ({
    page,
  }) => {
    await loginViaForm(page);

    // First create a draft invoice so we have one to test against
    await page.goto("/invoices/new");
    await page.waitForURL("/invoices/new");
    await expect(page.locator("main").locator("h1")).toBeVisible({ timeout: 15000 });

    // Select a customer
    const customerCombobox = page.getByRole("combobox").first();
    await customerCombobox.click();
    await expect(page.getByPlaceholder("Search customers...")).toBeVisible({
      timeout: 5000,
    });
    const firstCustomerOption = page.locator('[role="option"]').first();
    await expect(firstCustomerOption).toBeVisible({ timeout: 5000 });
    await firstCustomerOption.click();

    // Fill in a line item
    await page.getByPlaceholder("Line item name").first().fill("Draft Test");
    await page
      .locator('input[type="number"][step="0.01"][min="0"]')
      .first()
      .fill("50");

    // Save as draft
    await page.getByRole("button", { name: /save as draft/i }).click();
    await expect(page).toHaveURL(/\/invoices\/[a-zA-Z0-9-]+$/, {
      timeout: 15000,
    });

    // On a DRAFT invoice, the action buttons should include "Edit" and "Send Invoice"
    await expect(
      page.getByRole("button", { name: /edit/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /send invoice/i })
    ).toBeVisible();

    // A DRAFT invoice should NOT have "Record Payment" or "Void" buttons
    await expect(
      page.getByRole("button", { name: /record payment/i })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /^void$/i })
    ).not.toBeVisible();
  });

  test("can record a manual payment on an invoice", async ({ page }) => {
    await loginViaForm(page);

    // Create an invoice and send it so it becomes SENT status
    // (Record Payment is available on SENT, VIEWED, OVERDUE, PARTIALLY_PAID)
    await page.goto("/invoices/new");
    await page.waitForURL("/invoices/new");
    await expect(page.locator("main").locator("h1")).toBeVisible({ timeout: 15000 });

    // Select a customer
    const customerCombobox = page.getByRole("combobox").first();
    await customerCombobox.click();
    await expect(page.getByPlaceholder("Search customers...")).toBeVisible({
      timeout: 5000,
    });
    const firstCustomerOption = page.locator('[role="option"]').first();
    await expect(firstCustomerOption).toBeVisible({ timeout: 5000 });
    await firstCustomerOption.click();

    // Fill in a line item
    await page.getByPlaceholder("Line item name").first().fill("Payment Test");
    await page
      .locator('input[type="number"][step="0.01"][min="0"]')
      .first()
      .fill("200");

    // Click "Send Invoice" to create and send in one action
    await page.getByRole("button", { name: /send invoice/i }).click();
    await expect(page).toHaveURL(/\/invoices\/[a-zA-Z0-9-]+$/, {
      timeout: 15000,
    });

    // Wait for the detail page to load -- it should now be in SENT status
    // and have a "Record Payment" button
    await expect(
      page.getByRole("button", { name: /record payment/i })
    ).toBeVisible({ timeout: 10000 });

    // Click "Record Payment" to open the modal
    await page.getByRole("button", { name: /record payment/i }).click();

    // The modal dialog should appear with title "Record Payment"
    await expect(
      page.getByRole("heading", { name: "Record Payment" })
    ).toBeVisible({ timeout: 5000 });

    // The modal should show the amount field, method select, and submit button
    await expect(page.locator("#payment-amount")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /record payment/i }).last()
    ).toBeVisible();

    // The amount field should be pre-filled with the remaining balance
    // Submit the payment form
    await page
      .getByRole("button", { name: /record payment/i })
      .last()
      .click();

    // After successful payment, the page reloads and should reflect the payment
    // Wait for the page to reload and settle
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // The status should update to PAID (since we paid the full amount)
    await expect(page.getByText("Paid").first()).toBeVisible({ timeout: 10000 });
  });
});
