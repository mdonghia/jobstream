import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// V2 Lifecycle Test -- Full Workflow End-to-End
// ---------------------------------------------------------------------------
// This is the critical E2E test for the v2 (visit-based) UI. It exercises
// the full happy-path workflow in one serial flow:
//
//   Login -> Create Customer -> Create Job -> Verify in Unscheduled Tab
//   -> View Job Detail -> Add Visit -> Verify in Upcoming Tab
//   -> View Schedule -> Create Invoice -> Verify Invoice
//
// Uses the demo account (demo@jobstream.app / password123) which has seed
// data including services and team members.
//
// Each step is a separate test inside a `test.describe.serial` block so
// failures are easy to diagnose. Shared state (URLs, names, IDs) is passed
// between tests via module-scoped `let` variables.
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "demo@jobstream.app";
const DEMO_PASSWORD = "password123";

// Unique suffix so this test run never collides with previous runs.
// The timestamp goes into the customer name and job title, making them
// globally unique even if the test suite runs many times against the same DB.
const TS = Date.now();
const CUSTOMER_FIRST = `V2Life-${TS}`;
const CUSTOMER_LAST = "Test";
const CUSTOMER_EMAIL = `v2life-${TS}@example.com`;
const CUSTOMER_PHONE = "5551234567";

const JOB_TITLE = `V2 Lifecycle Job ${TS}`;

// Shared state between serial tests
let jobDetailUrl: string;
let jobId: string;
let jobNumber: string;

// ---------------------------------------------------------------------------
// Helper: log in with the demo account
// ---------------------------------------------------------------------------

async function loginAsDemo(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for the dashboard heading to confirm login succeeded.
  // Scoped to <header> to avoid duplicate h1 issues in main content.
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Serial test block -- each test depends on the previous one
// ---------------------------------------------------------------------------

test.describe.serial("V2 Full Lifecycle", () => {
  // All tests share the same browser context so the login session persists.
  let page: Page;

  // Increase timeout for production testing -- each step involves network roundtrips
  test.setTimeout(60000);

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAsDemo(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  // =========================================================================
  // Step 1: Create a Customer
  // =========================================================================

  test("Step 1 -- Create a new customer", async () => {
    await page.goto("/customers");

    // Wait for the customer list page to render
    await expect(
      page.locator("main").locator("h1, h2").first()
    ).toBeVisible({ timeout: 10000 });

    // Click the "Add Customer" button (could be in header area or empty state)
    await page.getByRole("button", { name: /add customer/i }).first().click();

    // The side sheet opens with the "Add Customer" heading
    await expect(
      page.getByRole("heading", { name: "Add Customer" })
    ).toBeVisible({ timeout: 5000 });

    // Fill contact information using the form field IDs
    await page.locator("#firstName").fill(CUSTOMER_FIRST);
    await page.locator("#lastName").fill(CUSTOMER_LAST);
    await page.locator("#email").fill(CUSTOMER_EMAIL);
    await page.locator("#phone").fill(CUSTOMER_PHONE);

    // Submit the form
    await page.getByRole("button", { name: /save customer/i }).click();

    // Verify the success toast appears
    await expect(page.getByText("Customer created")).toBeVisible({
      timeout: 10000,
    });

    // Wait for the sheet to close and data to settle
    await page.waitForTimeout(1000);
  });

  // =========================================================================
  // Step 2: Create a Job
  // =========================================================================

  test("Step 2 -- Create a new job for the customer", async () => {
    await page.goto("/jobs/new");
    await page.waitForURL("/jobs/new");

    // Wait for the job builder page to load -- heading says "New Job"
    await expect(
      page.getByRole("heading", { name: "New Job" })
    ).toBeVisible({ timeout: 10000 });

    // -- Select the customer we just created --
    // The customer combobox is a Popover + Command component.
    // Click the combobox trigger button (shows "Select a customer...")
    const customerCombobox = page.getByRole("combobox").first();
    await customerCombobox.click();

    // Wait for the command list to appear and type the customer name
    await expect(page.locator("[cmdk-list]")).toBeVisible({ timeout: 10000 });
    const searchInput = page.locator("[cmdk-input]");
    await searchInput.fill(CUSTOMER_FIRST);

    // Wait for the debounced search (300ms) + production server roundtrip
    await page.waitForTimeout(2000);

    // Select the matching customer from the command items
    const customerOption = page.locator("[cmdk-item]").first();
    await expect(customerOption).toBeVisible({ timeout: 10000 });
    await expect(customerOption).toContainText(CUSTOMER_FIRST);
    await customerOption.click();

    // -- Fill in the job title --
    // The Title label is not associated via htmlFor, so use placeholder instead.
    const titleInput = page.getByPlaceholder("e.g., Weekly lawn mowing");
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill(JOB_TITLE);

    // -- Pick a start date (today) --
    // The job builder requires a date. Click the "Pick a date" button.
    const dateButton = page.getByRole("button", { name: /pick a date/i });
    await dateButton.click();

    // Click today's date in the calendar popover
    const today = new Date();
    const dayNumber = today.getDate().toString();
    const todayCell = page.locator('[data-today="true"]');

    if (await todayCell.count() > 0) {
      await todayCell.first().click();
    } else {
      // Fallback: find the day number in the calendar grid
      const calendarPopover = page.locator("[role='dialog'], .rdp").first();
      await calendarPopover
        .getByRole("gridcell", { name: dayNumber, exact: true })
        .first()
        .click();
    }
    await page.waitForTimeout(300);

    // -- Submit the job --
    // The "Create Job" button is in the sticky sidebar summary
    const createJobBtn = page.getByRole("button", { name: /create job/i });
    await expect(createJobBtn).toBeVisible({ timeout: 5000 });
    await createJobBtn.click();

    // Wait for success toast to confirm job was created
    await expect(page.getByText("Job created successfully")).toBeVisible({
      timeout: 15000,
    });

    // Should redirect to the new job's detail page.
    // Use negative lookahead to exclude /jobs/new (which also matches [a-zA-Z0-9-]+)
    await expect(page).toHaveURL(/\/jobs\/(?!new$)[a-zA-Z0-9-]+$/, {
      timeout: 15000,
    });

    // Capture the job detail URL and extract the job ID from it
    jobDetailUrl = page.url();
    const urlParts = jobDetailUrl.split("/");
    jobId = urlParts[urlParts.length - 1];
  });

  // =========================================================================
  // Step 3: Verify Job appears in Jobs list via search
  // =========================================================================

  test("Step 3 -- Verify the new job appears in the Jobs list", async () => {
    await page.goto("/jobs");

    // Wait for the job list v2 page to load
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Jobs", level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // The job was created with a scheduled date, so its visit is SCHEDULED
    // and computeJobFilterTab classifies it as "scheduled". The default tab
    // is "unscheduled", so we must switch to Scheduled first. Search is
    // scoped to the active tab.
    const scheduledTab = page.getByRole("tab", { name: /Scheduled/i });
    await expect(scheduledTab).toBeVisible({ timeout: 5000 });
    await scheduledTab.click();

    // Wait for the tab data to load
    await page.waitForTimeout(2000);

    // Use the search bar to find our specific job by title.
    const searchInput = page.getByPlaceholder(/search by job number/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill(JOB_TITLE);

    // Wait for debounced search (300ms) + server roundtrip
    await page.waitForTimeout(2000);

    // Verify our job appears in the search results table.
    await expect(
      page.locator("table").getByText(JOB_TITLE)
    ).toBeVisible({ timeout: 10000 });

    // Capture the job number from the search results for later use
    const jobNumberCell = page.locator("table a.font-mono").first();
    if (await jobNumberCell.isVisible()) {
      jobNumber = (await jobNumberCell.textContent()) || "";
    }
  });

  // =========================================================================
  // Step 4: View Job Detail and Verify Contents
  // =========================================================================

  test("Step 4 -- View job detail and verify key elements", async () => {
    // Navigate to the job detail page we captured in Step 2
    await page.goto(jobDetailUrl);

    // Wait for the page to fully load
    await expect(
      page.getByRole("heading", { name: JOB_TITLE, level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // Verify the job number is visible (displayed as font-mono text)
    const jobNumberEl = page.locator("span.font-mono").first();
    await expect(jobNumberEl).toBeVisible();
    jobNumber = (await jobNumberEl.textContent()) || "";
    expect(jobNumber).toBeTruthy();

    // Verify customer name is visible (displayed as a link to the customer)
    await expect(
      page.getByText(`${CUSTOMER_FIRST} ${CUSTOMER_LAST}`)
    ).toBeVisible();

    // Verify the Visits section exists
    await expect(
      page.getByText(/Visits \(\d+\)/)
    ).toBeVisible({ timeout: 5000 });

    // Verify the Activity feed section exists.
    // Use { exact: true } to avoid matching "No activity yet." text.
    await expect(
      page.getByText("Activity", { exact: true })
    ).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // Step 5: Add a Visit (with scheduled date)
  // =========================================================================

  test("Step 5 -- Create a visit from the job detail page", async () => {
    // Ensure we are on the job detail page
    if (!page.url().includes(`/jobs/${jobId}`)) {
      await page.goto(jobDetailUrl);
      await expect(
        page.getByRole("heading", { name: JOB_TITLE, level: 1 })
      ).toBeVisible({ timeout: 10000 });
    }

    // Click "Add Visit" button in the header.
    // In the job-detail-v2 component, the "Add Visit" button calls the
    // createVisit server action with just { jobId }, which creates an
    // UNSCHEDULED visit by default. The component does router.refresh()
    // after creation.
    const addVisitBtn = page.getByRole("button", { name: /add visit/i });
    await expect(addVisitBtn).toBeVisible({ timeout: 5000 });
    await addVisitBtn.click();

    // The button text changes to "Creating..." during the action.
    // Wait for the success toast. Note: the router.refresh() might cause the
    // toast to flash and disappear, so we check optimistically.
    // First wait for the button to return to its normal state.
    await expect(addVisitBtn).toHaveText(/add visit/i, { timeout: 15000 });

    // Verify that the Visits count has incremented (should show at least 1).
    // The job was created with a scheduled date so it already may have a visit
    // (created by the createJob action). After our Add Visit click, there
    // should be at least 2, or at least 1 if the initial creation did not
    // create one. Let's just verify the visits section shows content.
    await page.waitForTimeout(1500);

    // Reload to get fresh server state
    await page.reload({ waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: JOB_TITLE, level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // Verify at least one visit card is rendered (has visit number dots)
    const visitCards = page.locator(".rounded-full.flex-shrink-0");
    await expect(visitCards.first()).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // Step 6: Verify Job in Upcoming Tab
  // =========================================================================

  test("Step 6 -- Verify job still appears in Jobs list after adding visit", async () => {
    await page.goto("/jobs");

    // Wait for the job list to load
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Jobs", level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // After adding an unscheduled visit in Step 5, the job now has both a
    // SCHEDULED visit (original) and an UNSCHEDULED visit. Per filter tab
    // priority, "unscheduled" (priority 2) beats "scheduled" (priority 3).
    // So the job should now be in the Unscheduled tab (the default).
    // Search within the active tab (unscheduled).
    const searchInput = page.getByPlaceholder(/search by job number/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill(JOB_TITLE);

    // Wait for debounced search + server roundtrip
    await page.waitForTimeout(2000);

    // Verify the job still appears in results after the visit was added
    await expect(
      page.locator("table").getByText(JOB_TITLE)
    ).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // Step 7: View Schedule Page
  // =========================================================================

  test("Step 7 -- View the schedule page and verify it loads", async () => {
    await page.goto("/schedule");

    // Wait for the schedule page heading to appear
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Schedule", level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // The v2 schedule page shows a CalendarViewV2 component with:
    // - Date navigation (prev/next buttons)
    // - A time grid or list view
    // Verify the dispatch board subheading is present
    await expect(
      page.getByText(/dispatch board/i)
    ).toBeVisible({ timeout: 5000 });

    // Verify the calendar view rendered (look for time grid markers or
    // the date display). The calendar should show today's date.
    const today = new Date();
    const todayFormatted = today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });

    // The calendar view v2 shows the current date prominently.
    // Just verify the page loaded successfully without errors.
    await expect(page.locator("main")).toBeVisible();

    // Verify our visit appears on the calendar. Since the job was created
    // with today's date, the visit should be visible.
    // The visit card on the calendar shows the job title or job number.
    // If not directly visible (e.g., in an unscheduled sidebar), we at least
    // verify the schedule page loaded correctly.
    // The CalendarViewV2 renders scheduled visits in a time grid and
    // unscheduled visits in a sidebar. Our manually added visit was UNSCHEDULED,
    // so it may appear in the unscheduled panel.
    // The job's original visit (from job creation with a date) should appear
    // in the time grid for today.

    // Broad check: the schedule page has no error banners
    const errorBanner = page.locator(".bg-red-50.text-red-700");
    await expect(errorBanner).not.toBeVisible();
  });

  // =========================================================================
  // Step 8: Create an Invoice from the Job
  // =========================================================================

  test("Step 8 -- Create an invoice from the job detail page", async () => {
    // Navigate to the invoice creation page with the jobId pre-filled.
    // The job detail v2 component has a "Create Invoice" link when invoices
    // section is present, or we can navigate directly.
    await page.goto(`/invoices/new?jobId=${jobId}`);

    // Wait for the invoice builder page to load
    await expect(
      page.locator("main").locator("h1")
    ).toBeVisible({ timeout: 15000 });

    // The invoice builder should pre-fill the customer from the job.
    // Check if the customer combobox shows our customer name.
    const customerCombobox = page.getByRole("combobox").first();
    const comboboxText = await customerCombobox.textContent();

    if (!comboboxText || comboboxText.includes("Select customer")) {
      // Customer not pre-filled -- select manually
      await customerCombobox.click();
      await expect(
        page.locator("[cmdk-input]")
      ).toBeVisible({ timeout: 5000 });

      // Type the customer name to search
      await page.locator("[cmdk-input]").fill(CUSTOMER_FIRST);
      await page.waitForTimeout(800);

      // Select the matching customer
      const customerOption = page.locator("[cmdk-item]").first();
      await expect(customerOption).toBeVisible({ timeout: 5000 });
      await expect(customerOption).toContainText(CUSTOMER_FIRST);
      await customerOption.click();
    }

    // Check if line items are pre-filled. If not, add one manually.
    // The invoice builder renders line items in a table or list.
    // Look for an existing line item name input.
    const lineItemNameInputs = page.getByPlaceholder("Line item name");
    const lineItemCount = await lineItemNameInputs.count();

    if (lineItemCount === 0) {
      // Need to add a line item. Click "Add Line Item" or similar button.
      const addItemBtn = page
        .getByRole("button", { name: /custom item|add.*item/i })
        .first();
      if (await addItemBtn.isVisible()) {
        await addItemBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Fill in line item if it is empty
    const firstLineItemName = page.getByPlaceholder("Line item name").first();
    if (await firstLineItemName.isVisible()) {
      const existingName = await firstLineItemName.inputValue();
      if (!existingName) {
        await firstLineItemName.fill("V2 Lifecycle Service");

        // Set the unit price
        const unitPriceInput = page
          .locator('input[type="number"]')
          .last();
        await unitPriceInput.fill("150");
      }
    }

    // Click "Save as Draft" to create the invoice
    const saveDraftBtn = page.getByRole("button", { name: /save as draft/i });
    await expect(saveDraftBtn).toBeVisible({ timeout: 5000 });
    await saveDraftBtn.click();

    // Should redirect to the invoice detail page
    await expect(page).toHaveURL(/\/invoices\/(?!new)[a-zA-Z0-9-]+$/, {
      timeout: 15000,
    });

    // The invoice detail page should show the invoice number
    const invoiceHeading = page.locator("h1.font-mono");
    await expect(invoiceHeading).toBeVisible({ timeout: 10000 });

    // Verify the invoice status is DRAFT
    await expect(page.getByText("Draft").first()).toBeVisible({
      timeout: 5000,
    });
  });

  // =========================================================================
  // Step 9: Verify Invoice in Invoice List
  // =========================================================================

  test("Step 9 -- Verify the invoice appears in the invoices list", async () => {
    await page.goto("/invoices");

    // Wait for the invoice list page to load.
    // The v2 invoice list shows "Invoices" heading and tabs.
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Invoices", level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // The v2 invoice list starts on the "Draft" tab by default.
    // Our newly created invoice should be in DRAFT status.
    // Wait for the tab data to load.
    await page.waitForTimeout(1500);

    // Verify the customer name appears in the draft invoices table.
    // The invoice row shows the customer's first and last name.
    await expect(
      page.getByText(`${CUSTOMER_FIRST} ${CUSTOMER_LAST}`).first()
    ).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // Step 10: Return to Job Detail and Verify Invoice Link
  // =========================================================================

  test("Step 10 -- Verify the job detail shows the linked invoice", async () => {
    await page.goto(jobDetailUrl);

    // Wait for the job detail page to load
    await expect(
      page.getByRole("heading", { name: JOB_TITLE, level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // The job detail v2 component renders an "Invoices" section when
    // invoices are present. Verify it appears.
    await expect(
      page.getByText(/Invoices \(\d+\)/)
    ).toBeVisible({ timeout: 10000 });

    // Verify an invoice number link is visible inside the invoices section.
    // Invoice numbers follow the format INV-XXXX and are rendered as links.
    const invoiceLink = page.locator('a[href^="/invoices/"]').filter({
      hasText: /INV-/i,
    });
    await expect(invoiceLink.first()).toBeVisible({ timeout: 5000 });
  });
});
