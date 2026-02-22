import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Phase 7 -- Jobs Tests
// ---------------------------------------------------------------------------
// Tests exercise the jobs workflow: list page, creation flow (via JobBuilder),
// detail page, and status transitions (start, complete).
// Uses the demo account which has seed data with customers, services, and
// team members.
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
// Job List
// ---------------------------------------------------------------------------
test.describe("Job List", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/jobs");
    // Wait for the Jobs heading to appear
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Jobs", level: 1 })
    ).toBeVisible({ timeout: 10000 });
  });

  test("job list page loads with correct columns", async ({ page }) => {
    // The table header should contain the expected columns
    const headerRow = page.locator("thead tr");
    await expect(headerRow).toBeVisible();

    // Verify column headers
    await expect(headerRow.getByText("Job #")).toBeVisible();
    await expect(headerRow.getByText("Customer")).toBeVisible();
    await expect(headerRow.getByText("Title")).toBeVisible();
    await expect(headerRow.getByText("Assigned")).toBeVisible();
    await expect(headerRow.getByText("Scheduled")).toBeVisible();
    await expect(headerRow.getByText("Priority")).toBeVisible();
    await expect(headerRow.getByText("Status")).toBeVisible();
  });

  test("can navigate to create job page", async ({ page }) => {
    // Click the "New Job" button (link)
    await page.getByRole("link", { name: /new job/i }).click();

    // Should navigate to /jobs/new
    await expect(page).toHaveURL(/\/jobs\/new/);

    // Verify the page heading is visible
    await expect(
      page.getByRole("main").getByRole("heading", { name: "New Job", level: 1 })
    ).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Create Job
// ---------------------------------------------------------------------------
test.describe("Create Job", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/jobs/new");
    await expect(
      page.getByRole("main").getByRole("heading", { name: "New Job", level: 1 })
    ).toBeVisible({ timeout: 10000 });
  });

  test("create job page has all required sections", async ({ page }) => {
    // Section 1: Customer & Property
    await expect(page.getByText("Customer & Property")).toBeVisible();
    const customerCombobox = page.getByRole("combobox").first();
    await expect(customerCombobox).toBeVisible();

    // Section 2: Job Details
    await expect(page.getByText("Job Details")).toBeVisible();
    await expect(page.locator('input[placeholder="e.g., Weekly lawn mowing"]')).toBeVisible();

    // Section 3: Services & Line Items
    await expect(page.getByText("Services & Line Items")).toBeVisible();

    // Section 4: Schedule
    await expect(page.getByText("Schedule").first()).toBeVisible();
    // Start Date, Start Time, Duration labels
    await expect(page.getByText("Start Date *")).toBeVisible();
    await expect(page.getByText("Start Time *")).toBeVisible();
    await expect(page.getByText("Duration")).toBeVisible();

    // Section 5: Assign Team Members
    await expect(page.getByText("Assign Team Members")).toBeVisible();

    // Section 6: Recurring Job
    await expect(page.getByText("Recurring Job")).toBeVisible();

    // Section 7: Checklist
    await expect(page.getByText("Checklist")).toBeVisible();

    // Section 8: Internal Notes
    await expect(page.getByText("Internal Notes")).toBeVisible();

    // Right sidebar: Job Summary
    await expect(page.getByText("Job Summary")).toBeVisible();

    // Create Job button
    await expect(
      page.getByRole("button", { name: /create job/i })
    ).toBeVisible();
  });

  test("can create a job", async ({ page }) => {
    // Step 1: Select a customer
    const customerCombobox = page.getByRole("combobox").first();
    await customerCombobox.click();
    await expect(page.locator("[cmdk-list]")).toBeVisible({ timeout: 5000 });
    const firstCustomerOption = page.locator("[cmdk-item]").first();
    await expect(firstCustomerOption).toBeVisible();
    await firstCustomerOption.click();

    // Step 2: Set job title
    await page
      .locator('input[placeholder="e.g., Weekly lawn mowing"]')
      .fill("E2E Test Job");

    // Step 3: Set the start date -- click the "Pick a date" button to open calendar
    const dateButton = page.getByRole("button", { name: /pick a date/i });
    await dateButton.click();

    // Wait for the calendar popover
    const calendarPopover = page.locator("[data-radix-popper-content-wrapper]");
    await expect(calendarPopover).toBeVisible({ timeout: 3000 });

    // Click today's date (or any available date) in the calendar
    // The calendar uses a grid; click on a day button that is not disabled
    const availableDay = calendarPopover.locator("button[name='day']").first();
    if (await availableDay.isVisible().catch(() => false)) {
      await availableDay.click();
    } else {
      // Alternative: click any clickable day in the calendar grid
      const dayButtons = calendarPopover.locator("td button:not([disabled])");
      const count = await dayButtons.count();
      if (count > 0) {
        // Pick a day near the middle of the visible days
        await dayButtons.nth(Math.min(15, count - 1)).click();
      }
    }

    // Wait for the calendar to close
    await page.waitForTimeout(500);

    // Step 4: Click "Create Job"
    await page.getByRole("button", { name: /create job/i }).click();

    // Should redirect to the job detail page
    await expect(page).toHaveURL(/\/jobs\/[a-zA-Z0-9-]+$/, { timeout: 15000 });

    // The toast should show success
    await expect(page.getByText(/job created successfully/i)).toBeVisible({
      timeout: 5000,
    });
  });
});

// ---------------------------------------------------------------------------
// Job Detail & Status Transitions
// ---------------------------------------------------------------------------
test.describe("Job Detail & Status Transitions", () => {
  let jobDetailUrl: string;
  const UNIQUE_JOB_TITLE = `Status Test Job ${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    // Create a job that subsequent tests will use
    const page = await browser.newPage();
    await loginAsDemo(page);
    await page.goto("/jobs/new");
    await expect(
      page.getByRole("main").getByRole("heading", { name: "New Job", level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // Select customer
    const customerCombobox = page.getByRole("combobox").first();
    await customerCombobox.click();
    await expect(page.locator("[cmdk-list]")).toBeVisible({ timeout: 5000 });
    await page.locator("[cmdk-item]").first().click();

    // Set title with unique name
    await page
      .locator('input[placeholder="e.g., Weekly lawn mowing"]')
      .fill(UNIQUE_JOB_TITLE);

    // Set date
    const dateButton = page.getByRole("button", { name: /pick a date/i });
    await dateButton.click();
    const calendarPopover = page.locator("[data-radix-popper-content-wrapper]");
    await expect(calendarPopover).toBeVisible({ timeout: 3000 });
    const dayButtons = calendarPopover.locator("td button:not([disabled])");
    const count = await dayButtons.count();
    if (count > 0) {
      await dayButtons.nth(Math.min(15, count - 1)).click();
    }
    await page.waitForTimeout(500);

    // Create the job
    await page.getByRole("button", { name: /create job/i }).click();
    // Wait for redirect to job detail page (UUID format, not /jobs/new)
    await expect(page).toHaveURL(/\/jobs\/(?!new)[a-zA-Z0-9-]+$/, { timeout: 15000 });

    jobDetailUrl = page.url();
    await page.close();
  });

  test("job appears in the list", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/jobs");
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Jobs", level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // Search for our test job
    const searchInput = page.locator(
      'input[placeholder="Search by customer name, job number, or title..."]'
    );
    await searchInput.fill(UNIQUE_JOB_TITLE);

    // Wait for the search debounce and results to update
    await page.waitForTimeout(1000);

    // The table should show our job
    await expect(
      page.locator("tbody").getByText(UNIQUE_JOB_TITLE).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can open job detail", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto(jobDetailUrl);

    // The job title should be in the heading
    await expect(
      page.getByRole("heading", { name: UNIQUE_JOB_TITLE })
    ).toBeVisible({ timeout: 10000 });

    // The job number should be visible (font-mono style)
    await expect(page.locator("p.font-mono")).toBeVisible();

    // Status badge should be visible
    await expect(
      page.locator("span.inline-flex.items-center.rounded-full").first()
    ).toBeVisible();

    // Customer info section
    await expect(page.getByText("Customer").first()).toBeVisible();

    // Scheduled section
    await expect(page.getByText("Scheduled").first()).toBeVisible();

    // Activity timeline
    await expect(page.getByText("Activity")).toBeVisible();
  });

  test("can start a job (change status to IN_PROGRESS)", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto(jobDetailUrl);

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: UNIQUE_JOB_TITLE })
    ).toBeVisible({ timeout: 10000 });

    // The "Start Job" button should be visible for a SCHEDULED job
    const startButton = page.getByRole("button", { name: /start job/i });
    await expect(startButton).toBeVisible();

    // Click "Start Job"
    await startButton.click();

    // Wait for the status to update (use .first() as text appears in both activity timeline and toast)
    await expect(page.getByText(/job started/i).first()).toBeVisible({ timeout: 5000 });

    // The status badge should now show "In Progress"
    await expect(page.getByText("In Progress").first()).toBeVisible({
      timeout: 5000,
    });

    // The "Start Job" button should no longer be visible
    await expect(startButton).not.toBeVisible();

    // Instead, the "Complete Job" button should appear
    await expect(
      page.getByRole("button", { name: /complete job/i })
    ).toBeVisible();
  });

  test("can complete a job", async ({ page }) => {
    await loginAsDemo(page);
    await page.goto(jobDetailUrl);

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: UNIQUE_JOB_TITLE })
    ).toBeVisible({ timeout: 10000 });

    // The job should now be IN_PROGRESS (from the previous test)
    // The "Complete Job" button should be visible
    const completeButton = page.getByRole("button", { name: /complete job/i });
    await expect(completeButton).toBeVisible({ timeout: 5000 });

    // Click "Complete Job" to open the modal
    await completeButton.click();

    // The Complete Job modal dialog should appear
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // The modal should show "Complete Job" as the title
    await expect(dialog.getByText("Complete Job").first()).toBeVisible();

    // Optionally add completion notes
    const notesTextarea = dialog.locator("textarea");
    if (await notesTextarea.isVisible()) {
      await notesTextarea.fill("E2E test completion notes");
    }

    // Click the "Complete Job" button inside the modal (green button)
    const confirmCompleteButton = dialog.getByRole("button", {
      name: /complete job/i,
    });
    await confirmCompleteButton.click();

    // Wait for success toast (use .first() in case it appears in both toast and timeline)
    await expect(page.getByText(/job completed successfully/i).first()).toBeVisible({
      timeout: 10000,
    });

    // After completing, the modal should show the invoice prompt
    // with "Job Completed" title and "Not Now" / "Create Invoice" buttons
    await expect(dialog.getByText("Job Completed")).toBeVisible({
      timeout: 5000,
    });

    // Dismiss the invoice prompt by clicking "Not Now"
    await dialog.getByRole("button", { name: /not now/i }).click();

    // Wait for the dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Reload the page to pick up the new status from the server
    // (router.refresh() may not reliably complete in time)
    await page.reload({ waitUntil: "networkidle" });

    // Wait for the page to fully load
    await expect(
      page.getByRole("heading", { name: UNIQUE_JOB_TITLE })
    ).toBeVisible({ timeout: 10000 });

    // The status badge should now show "Completed"
    await expect(page.getByText("Completed").first()).toBeVisible({
      timeout: 5000,
    });

    // The "Complete Job" button should no longer be visible
    await expect(completeButton).not.toBeVisible();

    // Instead, we should see the "Create Invoice" link/button
    await expect(
      page.getByRole("link", { name: /create invoice/i })
    ).toBeVisible();
  });
});
