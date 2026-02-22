import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Database Persistence Verification Tests
// ---------------------------------------------------------------------------
// These tests verify that CRUD operations actually persist data to the
// database. Each test creates data via the UI, navigates away, comes back,
// and verifies the data survived the round-trip.
//
// Uses the demo account (with seed data) to avoid registration flakiness.
// All tests are in one serial block so they build on each other.
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "demo@jobstream.app";
const DEMO_PASSWORD = "password123";

/** Unique suffix to make test data identifiable across runs. */
const TS = Date.now();
const RAND = Math.floor(Math.random() * 10000);

/** Customer identifiers. Using a first name that won't appear in the email. */
const CUST_FIRST = `Zara`;
const CUST_LAST = `Persist${RAND}`;
const CUST_FULL = `${CUST_FIRST} ${CUST_LAST}`;

/** Job title (unique per run). */
const JOB_TITLE = `Persist Job ${TS}`;

/** Captured URLs for later tests. */
let quoteDetailUrl: string;
let jobDetailUrl: string;
let invoiceDetailUrl: string;

// -- Helpers -----------------------------------------------------------------

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

/**
 * Select a customer in a combobox dropdown. Handles both cmdk-based
 * (quotes, jobs) and popover-based (invoices) comboboxes.
 */
async function selectCustomerCombobox(page: Page) {
  const combobox = page.getByRole("combobox").first();
  await combobox.click();

  // Wait for either cmdk-list or role=option to appear
  const cmdkList = page.locator("[cmdk-list]");
  const searchInput = page.getByPlaceholder(/search customers/i);

  // Give the dropdown time to load customer data
  await page.waitForTimeout(1000);

  if (await cmdkList.isVisible().catch(() => false)) {
    // cmdk-based combobox (quotes/new, jobs/new)
    const item = page.locator("[cmdk-item]").first();
    await expect(item).toBeVisible({ timeout: 10000 });
    await item.click();
  } else if (await searchInput.isVisible().catch(() => false)) {
    // Popover with search (invoices/new)
    const option = page.locator('[role="option"]').first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
  } else {
    // Fallback: look for any option
    const option = page.locator('[role="option"]').first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
  }

  await page.waitForTimeout(500);
}

async function pickDate(page: Page) {
  const dateButton = page.getByRole("button", { name: /pick a date/i });
  await dateButton.click();

  const popover = page.locator("[data-radix-popper-content-wrapper]");
  await expect(popover).toBeVisible({ timeout: 5000 });

  const dayButtons = popover.locator("td button:not([disabled])");
  const count = await dayButtons.count();
  if (count > 0) {
    await dayButtons.nth(Math.min(15, count - 1)).click();
  }
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// All tests in one serial block to avoid cross-block retry issues.
// Tests run with the demo account which already has customers + services.
// ---------------------------------------------------------------------------

test.describe.serial("Database persistence verification", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // =========================================================================
  // 1. CUSTOMER PERSISTENCE
  // =========================================================================

  test("create a customer, navigate away, come back -- customer persists", async ({
    page,
  }) => {
    await page.goto("/customers");
    await expect(
      page.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Customers", { timeout: 10000 });

    // Click "Add Customer"
    await page.getByRole("button", { name: /add customer/i }).click();
    await expect(
      page.getByRole("heading", { name: "Add Customer" })
    ).toBeVisible({ timeout: 10000 });

    // Fill the form with a unique name
    await page.locator("#firstName").fill(CUST_FIRST);
    await page.locator("#lastName").fill(CUST_LAST);
    await page.locator("#email").fill(`zara-persist-${RAND}@test.io`);
    await page.locator("#phone").fill("5551112222");

    await page.getByRole("button", { name: /save customer/i }).click();
    await expect(page.getByText("Customer created")).toBeVisible({
      timeout: 10000,
    });

    // Navigate AWAY
    await page.goto("/jobs");
    await expect(
      page.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Jobs", { timeout: 10000 });

    // Navigate BACK
    await page.goto("/customers");
    await expect(
      page.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Customers", { timeout: 10000 });

    // Customer should be in the list (proves DB persistence)
    await expect(
      page.getByRole("link", { name: new RegExp(CUST_FULL) })
    ).toBeVisible({ timeout: 15000 });
  });

  test("edit customer name, hard reload -- updated name persists", async ({
    page,
  }) => {
    await page.goto("/customers");
    await expect(
      page.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Customers", { timeout: 10000 });

    // Find our customer row and open its actions menu
    const row = page.locator("tr").filter({ hasText: CUST_FULL });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.locator("button").last().click();

    // Click Edit
    await page.getByRole("menuitem", { name: /edit/i }).click();
    await expect(
      page.getByRole("heading", { name: "Edit Customer" })
    ).toBeVisible({ timeout: 10000 });

    // Change last name
    const newLast = `Edited${RAND}`;
    await page.locator("#lastName").clear();
    await page.locator("#lastName").fill(newLast);
    await page.getByRole("button", { name: /update customer/i }).click();
    await expect(page.getByText("Customer updated")).toBeVisible({
      timeout: 10000,
    });

    // Hard reload
    await page.reload({ waitUntil: "networkidle" });

    // Verify the updated name persists
    await expect(
      page.getByRole("link", { name: new RegExp(`${CUST_FIRST} ${newLast}`) })
    ).toBeVisible({ timeout: 15000 });
  });

  test("archive customer, verify in archived list, then restore", async ({
    page,
  }) => {
    await page.goto("/customers");
    await expect(
      page.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Customers", { timeout: 10000 });

    // Find our customer row (with the edited name)
    const editedLast = `Edited${RAND}`;
    const editedFull = `${CUST_FIRST} ${editedLast}`;
    const row = page.locator("tr").filter({ hasText: editedFull });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.locator("button").last().click();

    // Click Archive
    await page.getByRole("menuitem", { name: /archive/i }).click();
    await expect(page.getByText("Customer archived")).toBeVisible({
      timeout: 10000,
    });

    // Customer should no longer appear in active list
    await expect(
      page.getByRole("link", { name: new RegExp(editedFull) })
    ).not.toBeVisible({ timeout: 5000 });

    // Check archived view
    await page.goto("/customers?status=archived");
    await expect(
      page.getByRole("link", { name: new RegExp(editedFull) })
    ).toBeVisible({ timeout: 15000 });

    // Restore -- click customer name to go to detail page
    await page
      .getByRole("link", { name: new RegExp(editedFull) })
      .first()
      .click();
    await expect(page).toHaveURL(/\/customers\/[a-z0-9-]+/, {
      timeout: 10000,
    });

    // Open more menu and unarchive
    const moreButton = page
      .locator("button:has(svg.lucide-ellipsis)")
      .first();
    await expect(moreButton).toBeVisible({ timeout: 5000 });
    await moreButton.click();
    await page.getByRole("menuitem", { name: /unarchive/i }).click();
    await expect(page.getByText("Customer restored")).toBeVisible({
      timeout: 10000,
    });
  });

  // =========================================================================
  // 2. QUOTE PERSISTENCE
  // =========================================================================

  test("create a draft quote, navigate away, come back -- quote persists", async ({
    page,
  }) => {
    await page.goto("/quotes/new");
    await expect(
      page.locator("main").locator("h1")
    ).toBeVisible({ timeout: 15000 });

    // Select a customer (demo account has seed customers)
    await selectCustomerCombobox(page);

    // Fill in a line item
    const nameInput = page.locator('input[placeholder="Item name"]').first();
    const currentName = await nameInput.inputValue();
    if (!currentName) {
      await nameInput.fill(`Pipe Fix ${TS}`);
    }

    // Set unit price
    const priceInputs = page
      .locator("table tbody tr")
      .first()
      .locator('input[type="number"]');
    const priceInput = priceInputs.last();
    const currentPrice = await priceInput.inputValue();
    if (!currentPrice || currentPrice === "0") {
      await priceInput.fill("250");
    }

    // Save as Draft
    await page.getByRole("button", { name: /save as draft/i }).click();
    await expect(page).toHaveURL(/\/quotes\/(?!new)[a-zA-Z0-9-]+$/, {
      timeout: 15000,
    });
    quoteDetailUrl = page.url();

    // Navigate AWAY
    await page.goto("/customers");
    await expect(
      page.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Customers", { timeout: 10000 });

    // Navigate BACK to quotes
    await page.goto("/quotes");
    await expect(
      page.locator("main").locator("h1, h2").first()
    ).toBeVisible({ timeout: 15000 });

    // Click Draft tab if available
    const draftTab = page.getByRole("tab", { name: /draft/i });
    if (await draftTab.isVisible().catch(() => false)) {
      await draftTab.click();
      await page.waitForTimeout(1000);
    }

    // Verify a draft row exists
    await expect(
      page.locator("tbody").getByText("Draft").first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("quote detail shows correct data after navigation", async ({
    page,
  }) => {
    await page.goto(quoteDetailUrl);
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 15000 });

    // Status should be Draft
    await expect(page.getByText("Draft").first()).toBeVisible({
      timeout: 5000,
    });

    // Line items section visible
    await expect(page.getByText("Line Items").first()).toBeVisible();

    // Line item name matches
    await expect(
      page.getByText(`Pipe Fix ${TS}`).first()
    ).toBeVisible({ timeout: 10000 });

    // Amount visible
    await expect(page.getByText("$250.00").first()).toBeVisible({
      timeout: 5000,
    });
  });

  // =========================================================================
  // 3. JOB PERSISTENCE
  // =========================================================================

  test("create a job, navigate away, come back -- job persists in list", async ({
    page,
  }) => {
    await page.goto("/jobs/new");
    await expect(
      page.getByRole("main").getByRole("heading", { name: "New Job", level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Select customer
    await selectCustomerCombobox(page);

    // Set title
    await page
      .locator('input[placeholder="e.g., Weekly lawn mowing"]')
      .fill(JOB_TITLE);

    // Pick a date
    await pickDate(page);

    // Create job
    await page.getByRole("button", { name: /create job/i }).click();
    await expect(page).toHaveURL(/\/jobs\/(?!new)[a-zA-Z0-9-]+$/, {
      timeout: 15000,
    });
    jobDetailUrl = page.url();

    // Navigate AWAY
    await page.goto("/customers");
    await expect(
      page.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Customers", { timeout: 10000 });

    // Navigate BACK to jobs
    await page.goto("/jobs");
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Jobs", level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // Search for the job
    const searchInput = page.locator(
      'input[placeholder="Search by customer name, job number, or title..."]'
    );
    await searchInput.fill(JOB_TITLE);
    await page.waitForTimeout(1500);

    // Job should appear
    await expect(
      page.locator("tbody").getByText(JOB_TITLE).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("start job, reload -- IN_PROGRESS status persists", async ({
    page,
  }) => {
    await page.goto(jobDetailUrl);
    await expect(
      page.getByRole("heading", { name: JOB_TITLE })
    ).toBeVisible({ timeout: 15000 });

    // Start the job
    const startBtn = page.getByRole("button", { name: /start job/i });
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();
    await expect(page.getByText(/job started/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Hard reload
    await page.reload({ waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: JOB_TITLE })
    ).toBeVisible({ timeout: 15000 });

    // Status should still be "In Progress"
    await expect(page.getByText("In Progress").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("complete job, reload -- Completed status persists", async ({
    page,
  }) => {
    await page.goto(jobDetailUrl);
    await expect(
      page.getByRole("heading", { name: JOB_TITLE })
    ).toBeVisible({ timeout: 15000 });

    // Complete the job
    const completeBtn = page.getByRole("button", { name: /complete job/i });
    await expect(completeBtn).toBeVisible({ timeout: 10000 });
    await completeBtn.click();

    // Dialog appears
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Optional notes
    const textarea = dialog.locator("textarea");
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill("DB verify completion");
    }

    // Confirm
    dialog.getByRole("button", { name: /complete job/i }).click();
    await expect(
      page.getByText(/job completed successfully/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Dismiss the invoice prompt if it appears
    const notNow = dialog.getByRole("button", { name: /not now/i });
    if (await notNow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await notNow.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }

    // Hard reload
    await page.reload({ waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: JOB_TITLE })
    ).toBeVisible({ timeout: 15000 });

    // Status should be "Completed"
    await expect(page.getByText("Completed").first()).toBeVisible({
      timeout: 10000,
    });
  });

  // =========================================================================
  // 4. INVOICE PERSISTENCE
  // =========================================================================

  test("create draft invoice, navigate away, come back -- invoice persists", async ({
    page,
  }) => {
    await page.goto("/invoices/new");
    await expect(
      page.locator("main").locator("h1")
    ).toBeVisible({ timeout: 15000 });

    // Select customer
    await selectCustomerCombobox(page);

    // Fill line item
    const nameInput = page.getByPlaceholder("Line item name").first();
    await nameInput.fill(`Inspection ${TS}`);

    // Unit price
    const priceInput = page
      .locator('input[type="number"][step="0.01"][min="0"]')
      .first();
    await priceInput.fill("350");

    // Save as Draft
    await page.getByRole("button", { name: /save as draft/i }).click();
    await expect(page).toHaveURL(/\/invoices\/(?!new)[a-zA-Z0-9-]+$/, {
      timeout: 15000,
    });
    invoiceDetailUrl = page.url();

    // Navigate AWAY
    await page.goto("/customers");
    await expect(
      page.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Customers", { timeout: 10000 });

    // Navigate BACK to invoices
    await page.goto("/invoices");
    await expect(
      page.locator("main").locator("h1, h2").first()
    ).toBeVisible({ timeout: 15000 });

    // Click Draft tab if available
    const draftTab = page.getByRole("tab", { name: /draft/i });
    if (await draftTab.isVisible().catch(() => false)) {
      await draftTab.click();
      await page.waitForTimeout(1000);
    }

    // Verify draft row exists
    await expect(
      page.locator("tbody").getByText("Draft").first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("send invoice, reload -- SENT status persists", async ({ page }) => {
    await page.goto(invoiceDetailUrl);
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 15000 });

    // Send the invoice
    const sendBtn = page.getByRole("button", { name: /send invoice/i });
    await expect(sendBtn).toBeVisible({ timeout: 10000 });
    await sendBtn.click();

    // Wait for page reload
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Status should be "Sent"
    await expect(page.getByText("Sent").first()).toBeVisible({
      timeout: 15000,
    });

    // Hard reload to double-check
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Sent").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("record payment, reload -- PAID status and amount persist", async ({
    page,
  }) => {
    await page.goto(invoiceDetailUrl);
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 15000 });

    // Click Record Payment
    const recordBtn = page.getByRole("button", { name: /record payment/i });
    await expect(recordBtn).toBeVisible({ timeout: 10000 });
    await recordBtn.click();

    // Modal appears
    await expect(
      page.getByRole("heading", { name: "Record Payment" })
    ).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#payment-amount")).toBeVisible({
      timeout: 5000,
    });

    // Submit payment (amount pre-filled with remaining balance)
    await page
      .getByRole("button", { name: /record payment/i })
      .last()
      .click();

    // Wait for page reload
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Status should be "Paid"
    await expect(page.getByText("Paid").first()).toBeVisible({
      timeout: 15000,
    });

    // Payment amount should be visible
    await expect(page.getByText("$350.00").first()).toBeVisible({
      timeout: 10000,
    });

    // Hard reload to verify persistence
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("h1.font-mono")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Paid").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("$350.00").first()).toBeVisible({
      timeout: 10000,
    });
  });

  // =========================================================================
  // 5. CROSS-ENTITY: DASHBOARD REFLECTS DATA
  // =========================================================================

  test("dashboard stats reflect created entities", async ({ page }) => {
    // After login, we're on the dashboard
    await expect(page).toHaveURL("/", { timeout: 15000 });

    // The welcome heading
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: /welcome back/i, level: 1 })
    ).toBeVisible({ timeout: 15000 });

    // Jobs Completed card -- should show >= 1
    const jobsCard = page.getByText("Jobs Completed").locator("..");
    await expect(jobsCard).toBeVisible({ timeout: 10000 });
    const jobsCount = jobsCard.locator("p.text-2xl");
    await expect(jobsCount).toBeVisible({ timeout: 10000 });
    const countText = await jobsCount.textContent();
    expect(Number(countText)).toBeGreaterThanOrEqual(1);

    // Revenue This Month card -- should not be $0
    const revenueCard = page.getByText("Revenue This Month").locator("..");
    await expect(revenueCard).toBeVisible({ timeout: 10000 });
    const revenueAmount = revenueCard.locator("p.text-2xl");
    await expect(revenueAmount).toBeVisible({ timeout: 10000 });
    const revenueText = await revenueAmount.textContent();
    expect(revenueText).not.toBe("$0");
    expect(revenueText).not.toBe("$0.00");
  });
});
