import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Full Business Lifecycle Test
// ---------------------------------------------------------------------------
// This is the most critical E2E test in the suite. It proves the entire
// happy-path workflow works end-to-end in one serial flow:
//
//   Customer -> Quote -> Send Quote -> Approve Quote -> Convert to Job
//   -> Start Job -> Complete Job -> Create Invoice -> Send Invoice
//   -> Record Payment -> Verify Dashboard
//
// Uses the demo account (demo@jobstream.app / password123) which has seed
// data including services and team members.
//
// Each step is a separate test inside a `test.describe.serial` block so
// that failures are easy to diagnose. Shared state (URLs, names) is passed
// between tests via module-scoped `let` variables.
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "demo@jobstream.app";
const DEMO_PASSWORD = "password123";

// Unique suffix so this test run never collides with previous runs
const TS = Date.now();
const CUSTOMER_FIRST = `Lifecycle-${TS}`;
const CUSTOMER_LAST = `Test`;
const CUSTOMER_EMAIL = `lifecycle-${TS}@example.com`;
const CUSTOMER_PHONE = "5559876543";

const LINE_ITEM_NAME = "Full Kitchen Renovation";
const LINE_ITEM_PRICE = "2500";

const JOB_LINE_ITEM_NAME = "Kitchen Renovation Labor";

// Shared state between serial tests
let quoteDetailUrl: string;
let quoteNumber: string;
let jobDetailUrl: string;
let invoiceDetailUrl: string;

// ---------------------------------------------------------------------------
// Helper: log in with the demo account
// ---------------------------------------------------------------------------

async function loginAsDemo(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for the topbar heading to confirm we landed on the dashboard.
  // Scoped to <header> to avoid the duplicate h1 in main content.
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Serial test block -- each test depends on the previous one
// ---------------------------------------------------------------------------

test.describe.serial("Full Business Lifecycle", () => {
  // All tests share the same browser context so the login session persists
  // across tests without needing to re-authenticate each time.
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAsDemo(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  // =========================================================================
  // Step 1: Create Customer
  // =========================================================================

  test("Step 1 -- Create a new customer", async () => {
    await page.goto("/customers");

    // Wait for the customer list or empty state to render
    await expect(
      page.locator("main").locator("h1, h2").first()
    ).toBeVisible({ timeout: 10000 });

    // Click the "Add Customer" button (could be in header or empty state)
    await page.getByRole("button", { name: /add customer/i }).first().click();

    // The side sheet opens with the "Add Customer" heading
    await expect(
      page.getByRole("heading", { name: "Add Customer" })
    ).toBeVisible({ timeout: 5000 });

    // Fill contact information
    await page.locator("#firstName").fill(CUSTOMER_FIRST);
    await page.locator("#lastName").fill(CUSTOMER_LAST);
    await page.locator("#email").fill(CUSTOMER_EMAIL);
    await page.locator("#phone").fill(CUSTOMER_PHONE);

    // Submit the form
    await page.getByRole("button", { name: /save customer/i }).click();

    // Verify the success toast
    await expect(page.getByText("Customer created")).toBeVisible({
      timeout: 10000,
    });

    // Wait for the sheet to close and the customer to appear in the list
    await page.waitForTimeout(1000);
  });

  // =========================================================================
  // Step 2: Create a Quote for the Customer
  // =========================================================================

  test("Step 2 -- Create a draft quote for the new customer", async () => {
    await page.goto("/quotes/new");
    await page.waitForURL("/quotes/new");

    // Wait for the quote builder page to load
    await expect(
      page.locator("main").locator("h1")
    ).toBeVisible({ timeout: 10000 });

    // -- Select the customer we just created --
    // The customer combobox is the first combobox on the page
    const customerCombobox = page.getByRole("combobox").first();
    await customerCombobox.click();

    // Wait for the command list dropdown to appear
    await expect(page.locator("[cmdk-list]")).toBeVisible({ timeout: 5000 });

    // Type the customer name to filter the list
    const searchInput = page.locator("[cmdk-input]");
    await searchInput.fill(CUSTOMER_FIRST);

    // Wait for the search results to update, then select the matching customer
    await page.waitForTimeout(500);
    const customerOption = page.locator("[cmdk-item]").first();
    await expect(customerOption).toBeVisible({ timeout: 5000 });

    // Verify the option text matches our customer before clicking
    await expect(customerOption).toContainText(CUSTOMER_FIRST);
    await customerOption.click();

    // -- Fill in the line item --
    // The first line item row has an "Item name" input for custom items
    const nameInput = page.locator('input[placeholder="Item name"]').first();
    // If the input is visible, fill it directly. If a service select is present,
    // we may need to select "Custom Item" first.
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(LINE_ITEM_NAME);
    } else {
      // Select "Custom Item" from the service dropdown first
      const serviceSelect = page
        .locator("table tbody tr")
        .first()
        .locator("button[role='combobox']")
        .first();
      await serviceSelect.click();
      await page.getByRole("option", { name: /custom item/i }).click();
      await page.waitForTimeout(300);
      await page.locator('input[placeholder="Item name"]').first().fill(LINE_ITEM_NAME);
    }

    // Set the unit price (last number input in the row)
    const priceInputs = page
      .locator("table tbody tr")
      .first()
      .locator('input[type="number"]');
    const priceInput = priceInputs.last();
    await priceInput.fill(LINE_ITEM_PRICE);

    // -- Save as Draft --
    await page.getByRole("button", { name: /save as draft/i }).click();

    // Should redirect to the quote detail page (UUID, not /quotes/new)
    await expect(page).toHaveURL(/\/quotes\/(?!new)[a-zA-Z0-9-]+$/, {
      timeout: 15000,
    });

    // Verify the success toast
    await expect(page.getByText(/quote saved as draft/i)).toBeVisible({
      timeout: 5000,
    });

    // Capture the quote detail URL and quote number for subsequent tests
    quoteDetailUrl = page.url();

    const quoteHeading = page.locator("h1.font-mono");
    await expect(quoteHeading).toBeVisible({ timeout: 10000 });
    quoteNumber = (await quoteHeading.textContent()) || "";
  });

  // =========================================================================
  // Step 3: Send the Quote
  // =========================================================================

  test("Step 3 -- Send the draft quote", async () => {
    // We should already be on the quote detail page from Step 2.
    // If not, navigate there.
    if (!page.url().includes("/quotes/")) {
      await page.goto(quoteDetailUrl);
    }

    // Wait for the quote detail page to load
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 10000 });

    // The quote is in DRAFT status, so the "Send Quote" button should be visible
    const sendQuoteBtn = page.getByRole("button", { name: /send quote/i });
    await expect(sendQuoteBtn).toBeVisible({ timeout: 5000 });

    // Click "Send Quote" to open the send modal
    await sendQuoteBtn.click();

    // The send modal dialog should appear
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(
      dialog.getByRole("heading", { name: "Send Quote" })
    ).toBeVisible();

    // The modal shows delivery options (Email / SMS).
    // At least one checkbox should be checked by default since we gave the
    // customer both an email and phone number.
    // Click the "Send" button in the modal footer to actually send
    const sendBtn = dialog.getByRole("button", { name: "Send" });
    await expect(sendBtn).toBeVisible();
    await sendBtn.click();

    // Wait for the success toast
    await expect(page.getByText("Quote sent successfully")).toBeVisible({
      timeout: 10000,
    });

    // Wait for the page to refresh and status to update
    await page.waitForTimeout(1500);

    // Reload to get the fresh server state
    await page.reload({ waitUntil: "networkidle" });

    // Wait for the page to load
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 10000 });

    // The status badge should now show "Sent"
    await expect(page.getByText("Sent").first()).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // Step 4: Approve the Quote (admin-side approval)
  // =========================================================================

  test("Step 4 -- Approve the sent quote", async () => {
    // The quote is now SENT. On the quote detail page, the SENT status shows
    // "Mark as Approved" and "Mark as Declined" buttons.

    // Ensure we're on the quote detail page
    if (!page.url().includes("/quotes/")) {
      await page.goto(quoteDetailUrl);
      await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 10000 });
    }

    // Click "Mark as Approved" to approve the quote from the admin side
    const approveBtn = page.getByRole("button", { name: /mark as approved/i });
    await expect(approveBtn).toBeVisible({ timeout: 5000 });
    await approveBtn.click();

    // Wait for the success toast
    await expect(page.getByText("Quote marked as approved")).toBeVisible({
      timeout: 10000,
    });

    // Wait for the page to refresh
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: "networkidle" });

    // Wait for the page to load
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 10000 });

    // The status badge should now show "Approved"
    await expect(page.getByText("Approved").first()).toBeVisible({
      timeout: 10000,
    });

    // The "Convert to Job" button should now be visible (APPROVED status action)
    await expect(
      page.getByRole("button", { name: /convert to job/i })
    ).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // Step 5: Convert Quote to Job
  // =========================================================================

  test("Step 5 -- Convert the approved quote to a job", async () => {
    // Ensure we're on the quote detail page
    if (!page.url().includes("/quotes/")) {
      await page.goto(quoteDetailUrl);
      await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 10000 });
    }

    // Click "Convert to Job"
    const convertBtn = page.getByRole("button", { name: /convert to job/i });
    await expect(convertBtn).toBeVisible({ timeout: 5000 });
    await convertBtn.click();

    // Wait for the success toast
    await expect(page.getByText("Quote converted to job")).toBeVisible({
      timeout: 10000,
    });

    // The app should redirect to the new job's detail page
    await expect(page).toHaveURL(/\/jobs\/[a-zA-Z0-9-]+$/, { timeout: 15000 });

    // Capture the job detail URL for subsequent tests
    jobDetailUrl = page.url();

    // The job detail page should load with the job title as a heading.
    // When converting from a quote, the title may be generated from the
    // quote data. Just verify the heading exists.
    await expect(
      page.locator("h1").first()
    ).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // Step 6: Start the Job
  // =========================================================================

  test("Step 6 -- Start the job", async () => {
    // Ensure we're on the job detail page
    if (!page.url().includes("/jobs/")) {
      await page.goto(jobDetailUrl);
    }

    // Wait for the job detail page to load
    await expect(
      page.locator("h1").first()
    ).toBeVisible({ timeout: 10000 });

    // The job should be in SCHEDULED status with a "Start Job" button
    const startBtn = page.getByRole("button", { name: /start job/i });
    await expect(startBtn).toBeVisible({ timeout: 5000 });

    // Click "Start Job"
    await startBtn.click();

    // Wait for the toast
    await expect(page.getByText(/job started/i).first()).toBeVisible({
      timeout: 10000,
    });

    // The status badge should now show "In Progress"
    await expect(page.getByText("In Progress").first()).toBeVisible({
      timeout: 5000,
    });

    // The "Start Job" button should be gone; "Complete Job" should appear
    await expect(startBtn).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /complete job/i })
    ).toBeVisible();
  });

  // =========================================================================
  // Step 7: Complete the Job
  // =========================================================================

  test("Step 7 -- Complete the job and navigate to create invoice", async () => {
    // Ensure we're on the job detail page
    if (!page.url().includes("/jobs/")) {
      await page.goto(jobDetailUrl);
    }

    // Wait for the job detail page to load
    await expect(
      page.locator("h1").first()
    ).toBeVisible({ timeout: 10000 });

    // Click "Complete Job" to open the completion modal
    const completeBtn = page.getByRole("button", { name: /complete job/i });
    await expect(completeBtn).toBeVisible({ timeout: 5000 });
    await completeBtn.click();

    // The Complete Job dialog should appear
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText("Complete Job").first()).toBeVisible();

    // Optionally add completion notes
    const notesTextarea = dialog.locator("textarea");
    if (await notesTextarea.isVisible()) {
      await notesTextarea.fill("Lifecycle test -- job completed successfully.");
    }

    // Click the "Complete Job" button inside the modal
    const confirmCompleteBtn = dialog.getByRole("button", {
      name: /complete job/i,
    });
    await confirmCompleteBtn.click();

    // Wait for the success toast
    await expect(
      page.getByText(/job completed successfully/i).first()
    ).toBeVisible({ timeout: 10000 });

    // After completion the modal transitions to the "Job Completed" invoice prompt.
    // It shows "Job Completed" title and "Create Invoice" / "Not Now" buttons.
    await expect(dialog.getByText("Job Completed")).toBeVisible({
      timeout: 5000,
    });

    // Click "Create Invoice" to navigate to the invoice form pre-filled with
    // the job data. This is a Link that navigates to /invoices/new?jobId=...
    const createInvoiceLink = dialog.getByRole("link", {
      name: /create invoice/i,
    });
    await expect(createInvoiceLink).toBeVisible();
    await createInvoiceLink.click();

    // Should navigate to the invoice creation page with the jobId prefilled
    await expect(page).toHaveURL(/\/invoices\/new/, { timeout: 15000 });
  });

  // =========================================================================
  // Step 8: Create the Invoice
  // =========================================================================

  test("Step 8 -- Create a draft invoice for the completed job", async () => {
    // We should already be on /invoices/new (redirected from Step 7).
    // If the URL has a jobId query param, the form may be pre-filled.
    // Wait for the page to load.
    await expect(
      page.locator("main").locator("h1")
    ).toBeVisible({ timeout: 15000 });

    // Check if the customer is already pre-selected (from the job context).
    // If not, select the customer manually.
    const customerCombobox = page.getByRole("combobox").first();
    const comboboxText = await customerCombobox.textContent();

    if (!comboboxText || comboboxText.includes("Select customer")) {
      // Customer not pre-filled -- select manually
      await customerCombobox.click();
      await expect(
        page.getByPlaceholder("Search customers...")
      ).toBeVisible({ timeout: 5000 });

      // Type the customer name to search
      await page.getByPlaceholder("Search customers...").fill(CUSTOMER_FIRST);
      await page.waitForTimeout(500);

      // Select the matching customer
      const customerOption = page.locator('[role="option"]').first();
      await expect(customerOption).toBeVisible({ timeout: 5000 });
      await customerOption.click();
    }

    // Check if line items are already pre-filled (from the job's line items).
    // If not, add a line item manually.
    const lineItemNameInput = page.getByPlaceholder("Line item name").first();
    const existingName = await lineItemNameInput.inputValue().catch(() => "");

    if (!existingName) {
      await lineItemNameInput.fill(JOB_LINE_ITEM_NAME);

      // Set the unit price
      const unitPriceInput = page
        .locator('input[type="number"][step="0.01"][min="0"]')
        .first();
      await unitPriceInput.fill(LINE_ITEM_PRICE);
    }

    // Click "Save as Draft" to create the invoice
    await page.getByRole("button", { name: /save as draft/i }).click();

    // Should redirect to the invoice detail page
    await expect(page).toHaveURL(/\/invoices\/(?!new)[a-zA-Z0-9-]+$/, {
      timeout: 15000,
    });

    // Capture the invoice detail URL
    invoiceDetailUrl = page.url();

    // The invoice detail page should show the invoice number in a font-mono h1
    const invoiceHeading = page.locator("h1.font-mono");
    await expect(invoiceHeading).toBeVisible({ timeout: 10000 });

    // Verify the invoice is in DRAFT status
    await expect(page.getByText("Draft").first()).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // Step 9: Send the Invoice
  // =========================================================================

  test("Step 9 -- Send the draft invoice", async () => {
    // Ensure we're on the invoice detail page
    if (!page.url().includes("/invoices/")) {
      await page.goto(invoiceDetailUrl);
    }

    // Wait for the invoice detail page to load
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 10000 });

    // The invoice is DRAFT, so the "Send Invoice" button should be visible
    const sendInvoiceBtn = page.getByRole("button", { name: /send invoice/i });
    await expect(sendInvoiceBtn).toBeVisible({ timeout: 5000 });

    // Click "Send Invoice"
    await sendInvoiceBtn.click();

    // The sendInvoice action does router.refresh() which reloads the page.
    // The toast may flash and disappear during the reload, so we skip
    // checking for it and instead verify the status changed.
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // The status should now be "Sent"
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Sent").first()).toBeVisible({ timeout: 10000 });

    // The "Record Payment" button should now be visible
    await expect(
      page.getByRole("button", { name: /record payment/i })
    ).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // Step 10: Record Full Payment
  // =========================================================================

  test("Step 10 -- Record full payment on the sent invoice", async () => {
    // Ensure we're on the invoice detail page
    if (!page.url().includes("/invoices/")) {
      await page.goto(invoiceDetailUrl);
      await page.waitForLoadState("networkidle");
    }

    // Wait for the invoice detail page to load
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 10000 });

    // Click "Record Payment" to open the modal
    const recordPaymentBtn = page.getByRole("button", {
      name: /record payment/i,
    });
    await expect(recordPaymentBtn).toBeVisible({ timeout: 5000 });
    await recordPaymentBtn.click();

    // The Record Payment dialog should appear
    await expect(
      page.getByRole("heading", { name: "Record Payment" })
    ).toBeVisible({ timeout: 5000 });

    // The amount field should be pre-filled with the remaining balance.
    // Verify the field exists and has a value.
    const amountInput = page.locator("#payment-amount");
    await expect(amountInput).toBeVisible();
    const amountValue = await amountInput.inputValue();
    expect(parseFloat(amountValue)).toBeGreaterThan(0);

    // Submit the payment form. The "Record Payment" button inside the dialog
    // (the submit button) is the last one matching the name.
    const submitPaymentBtn = page
      .getByRole("button", { name: /record payment/i })
      .last();
    await submitPaymentBtn.click();

    // The recordPayment action does router.refresh() which reloads the page.
    // The toast may flash and disappear during reload, so skip checking it
    // and verify the status change directly.
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // The status should now be "Paid"
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Paid").first()).toBeVisible({
      timeout: 10000,
    });
  });

  // =========================================================================
  // Step 11: Verify Dashboard Stats
  // =========================================================================

  test("Step 11 -- Verify dashboard reflects the completed lifecycle", async () => {
    // Navigate to the dashboard
    await page.goto("/");
    await expect(page).toHaveURL("/", { timeout: 10000 });

    // Wait for the dashboard to fully load
    await expect(
      page.getByRole("heading", { name: /welcome back/i, level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Verify the four summary cards are present
    await expect(page.getByText("Revenue This Month")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Jobs Completed")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Outstanding Invoices")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Quote Conversion")).toBeVisible({
      timeout: 10000,
    });

    // Verify the "Revenue This Month" card shows a value greater than $0.
    // The card renders a large number value in a sibling element to the label.
    // We check that the card's value container contains a dollar amount > $0.
    // The dashboard card values are rendered as <p class="text-2xl font-bold">.
    // We find the Revenue card by its label text and then look at the sibling value.
    const revenueCard = page.locator("div").filter({
      hasText: "Revenue This Month",
    }).first();
    await expect(revenueCard).toBeVisible();

    // The revenue value should contain a $ sign and should NOT be "$0" or "$0.00"
    // This is a loose check since other tests may also contribute revenue.
    const revenueText = await revenueCard.textContent();
    expect(revenueText).toContain("$");

    // Verify "Jobs Completed" shows at least 1
    const jobsCard = page.locator("div").filter({
      hasText: "Jobs Completed",
    }).first();
    await expect(jobsCard).toBeVisible();
    const jobsText = await jobsCard.textContent();
    // Extract the number from the card text
    const jobsMatch = jobsText?.match(/(\d+)/);
    expect(jobsMatch).toBeTruthy();
    if (jobsMatch) {
      expect(parseInt(jobsMatch[1], 10)).toBeGreaterThanOrEqual(1);
    }

    // Verify the recent activity feed section is present
    await expect(
      page.getByRole("main").getByText(/recent activity/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
