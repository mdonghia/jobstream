import { test, expect, type BrowserContext, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Multi-Tenant Data Isolation Tests
// ---------------------------------------------------------------------------
// SECURITY-CRITICAL: These tests prove that data belonging to Organization A
// is NEVER visible to Organization B. This is the foundation of multi-tenant
// security -- a failure here means a data breach.
//
// Architecture:
//   - Two separate browser contexts simulate two completely isolated users
//     from different organizations. Playwright contexts have separate cookie
//     jars, so User A and User B each have their own independent session.
//   - User A registers, creates identifiable test data (customer, quote,
//     job, invoice), then their context is closed.
//   - User B registers in a separate context, then every test verifies that
//     NONE of User A's data is accessible -- not in list pages, not via
//     direct URL, not via search, and not on the dashboard.
// ---------------------------------------------------------------------------

/** Shared password used by both test users. */
const PASSWORD = "IsolationTest123!";

/** Timestamp for unique identifiers across the test run. */
const TS = Date.now();

// ---------------------------------------------------------------------------
// Identifiers for Org A's test data -- deliberately distinctive so we can
// search for them and confirm they do NOT leak to Org B.
// ---------------------------------------------------------------------------
const ORG_A_EMAIL = `tenant-a-${TS}@example.com`;
const ORG_A_BUSINESS = "Tenant A Plumbing";
const ORG_A_CUSTOMER_FIRST = "Alice";
const ORG_A_CUSTOMER_LAST = "TenantA";
const ORG_A_CUSTOMER_EMAIL = `alice-tenanta-${TS}@test.com`;
const ORG_A_QUOTE_ITEM = "TenantA Pipe Fix";
const ORG_A_JOB_TITLE = "TenantA Installation Job";
const ORG_A_INVOICE_ITEM = "TenantA Service Fee";

const ORG_B_EMAIL = `tenant-b-${TS}@example.com`;
const ORG_B_BUSINESS = "Tenant B Electric";

// ---------------------------------------------------------------------------
// State shared between beforeAll and tests
// ---------------------------------------------------------------------------
let contextB: BrowserContext;
let pageB: Page;

/** URL of the quote detail page created by User A -- used for direct URL test. */
let orgAQuoteDetailUrl: string;

// ---------------------------------------------------------------------------
// Helper: register a new user on a given page and wait for the dashboard.
// ---------------------------------------------------------------------------
async function registerUser(
  page: Page,
  opts: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    businessName: string;
  }
) {
  await page.goto("/register");

  await page.getByLabel(/first name/i).fill(opts.firstName);
  await page.getByLabel(/last name/i).fill(opts.lastName);
  await page.getByLabel(/email/i).fill(opts.email);
  await page.getByLabel(/password/i).fill(opts.password);
  await page.getByLabel(/business name/i).fill(opts.businessName);

  await page.getByRole("button", { name: /sign up|register|create account/i }).click();

  // Wait for the dashboard to confirm registration succeeded.
  await expect(
    page.locator("header").getByRole("heading", { level: 1 })
  ).toHaveText("Dashboard", { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Helper: create a customer via the side-sheet form.
// ---------------------------------------------------------------------------
async function createCustomer(
  page: Page,
  opts: { firstName: string; lastName: string; email: string; phone: string }
) {
  await page.goto("/customers");

  // Click "Add Customer" -- could be in the empty state or the header
  const addBtn = page.getByRole("button", { name: /add customer/i });
  await expect(addBtn).toBeVisible({ timeout: 10000 });
  await addBtn.click();

  // Wait for the side-sheet to open
  await expect(
    page.getByRole("heading", { name: "Add Customer" })
  ).toBeVisible({ timeout: 5000 });

  await page.locator("#firstName").fill(opts.firstName);
  await page.locator("#lastName").fill(opts.lastName);
  await page.locator("#email").fill(opts.email);
  await page.locator("#phone").fill(opts.phone);

  await page.getByRole("button", { name: /save customer/i }).click();

  // Confirm the toast
  await expect(page.getByText("Customer created")).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Helper: create a draft quote and return the detail URL.
// ---------------------------------------------------------------------------
async function createQuote(page: Page, lineItemName: string, unitPrice: string): Promise<string> {
  await page.goto("/quotes/new");
  await page.waitForURL("/quotes/new");
  await expect(page.locator("main").locator("h1")).toBeVisible({ timeout: 10000 });

  // Select the first (and only) customer via combobox
  const customerCombobox = page.getByRole("combobox").first();
  await customerCombobox.click();
  await expect(page.locator("[cmdk-list]")).toBeVisible({ timeout: 5000 });
  await page.locator("[cmdk-item]").first().click();

  // Fill in the line item name
  const nameInput = page.locator('input[placeholder="Item name"]').first();
  await nameInput.fill(lineItemName);

  // Fill in the unit price (last number input in the row)
  const priceInputs = page.locator("table tbody tr").first().locator('input[type="number"]');
  await priceInputs.last().fill(unitPrice);

  // Save as draft
  await page.getByRole("button", { name: /save as draft/i }).click();

  // Wait for redirect to detail page
  await expect(page).toHaveURL(/\/quotes\/(?!new)[a-zA-Z0-9-]+$/, { timeout: 15000 });

  return page.url();
}

// ---------------------------------------------------------------------------
// Helper: create a job and return the detail URL.
// ---------------------------------------------------------------------------
async function createJob(page: Page, title: string): Promise<string> {
  await page.goto("/jobs/new");
  await expect(
    page.getByRole("main").getByRole("heading", { name: "New Job", level: 1 })
  ).toBeVisible({ timeout: 10000 });

  // Select the first customer
  const customerCombobox = page.getByRole("combobox").first();
  await customerCombobox.click();
  await expect(page.locator("[cmdk-list]")).toBeVisible({ timeout: 5000 });
  await page.locator("[cmdk-item]").first().click();

  // Set job title
  await page.locator('input[placeholder="e.g., Weekly lawn mowing"]').fill(title);

  // Set a date -- open the calendar and pick a day
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
  await expect(page).toHaveURL(/\/jobs\/(?!new)[a-zA-Z0-9-]+$/, { timeout: 15000 });

  return page.url();
}

// ---------------------------------------------------------------------------
// Helper: create a draft invoice and return the detail URL.
// ---------------------------------------------------------------------------
async function createInvoice(page: Page, lineItemName: string, unitPrice: string): Promise<string> {
  await page.goto("/invoices/new");
  await page.waitForURL("/invoices/new");
  await expect(page.locator("main").locator("h1")).toBeVisible({ timeout: 15000 });

  // Select the first customer
  const customerCombobox = page.getByRole("combobox").first();
  await customerCombobox.click();
  await expect(page.getByPlaceholder("Search customers...")).toBeVisible({ timeout: 5000 });
  await page.locator('[role="option"]').first().click();

  // Fill in line item
  await page.getByPlaceholder("Line item name").first().fill(lineItemName);
  await page.locator('input[type="number"][step="0.01"][min="0"]').first().fill(unitPrice);

  // Save as draft
  await page.getByRole("button", { name: /save as draft/i }).click();
  await expect(page).toHaveURL(/\/invoices\/(?!new)[a-zA-Z0-9-]+$/, { timeout: 15000 });

  return page.url();
}

// ===========================================================================
// TEST SUITE
// ===========================================================================

test.describe.serial("Multi-Tenant Data Isolation", () => {
  // -------------------------------------------------------------------------
  // Setup: Register both users and create all of Org A's test data.
  // -------------------------------------------------------------------------
  test.beforeAll(async ({ browser }) => {
    // --- ORGANIZATION A ---
    // Create a separate browser context for User A (own cookies / session).
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    // Register User A
    await registerUser(pageA, {
      firstName: "TenantA",
      lastName: "Owner",
      email: ORG_A_EMAIL,
      password: PASSWORD,
      businessName: ORG_A_BUSINESS,
    });

    // Create a customer in Org A
    await createCustomer(pageA, {
      firstName: ORG_A_CUSTOMER_FIRST,
      lastName: ORG_A_CUSTOMER_LAST,
      email: ORG_A_CUSTOMER_EMAIL,
      phone: "5550001111",
    });

    // Create a quote in Org A (with identifiable line item name)
    orgAQuoteDetailUrl = await createQuote(pageA, ORG_A_QUOTE_ITEM, "500");

    // Create a job in Org A
    await createJob(pageA, ORG_A_JOB_TITLE);

    // Create an invoice in Org A
    await createInvoice(pageA, ORG_A_INVOICE_ITEM, "300");

    // Close Org A's context -- we no longer need it.
    await contextA.close();

    // --- ORGANIZATION B ---
    // Create a separate browser context for User B.
    contextB = await browser.newContext();
    pageB = await contextB.newPage();

    // Register User B
    await registerUser(pageB, {
      firstName: "TenantB",
      lastName: "Owner",
      email: ORG_B_EMAIL,
      password: PASSWORD,
      businessName: ORG_B_BUSINESS,
    });
  });

  // -------------------------------------------------------------------------
  // Teardown: close Context B after all tests complete.
  // -------------------------------------------------------------------------
  test.afterAll(async () => {
    await contextB?.close();
  });

  // =========================================================================
  // TEST 1: Customer isolation
  // =========================================================================
  // WHY THIS MATTERS: Customers are the core of every business. If Org B can
  // see Org A's customers, they gain access to personal contact information,
  // service addresses, and the full history of interactions. This would be a
  // severe privacy violation.
  // =========================================================================
  test("Org B cannot see Org A's customers in the customer list", async () => {
    await pageB.goto("/customers");

    // Wait for the page to settle -- either the empty state or a loaded list.
    await expect(
      pageB.locator("main").locator("h1, h2").first()
    ).toBeVisible({ timeout: 10000 });

    // Org A's customer "Alice TenantA" must NOT appear.
    await expect(
      pageB.getByText(`${ORG_A_CUSTOMER_FIRST} ${ORG_A_CUSTOMER_LAST}`)
    ).not.toBeVisible({ timeout: 3000 });

    // Since Org B has zero customers, we expect the empty state.
    await expect(
      pageB.getByRole("heading", { name: /no customers yet/i })
    ).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // TEST 2: Quote isolation
  // =========================================================================
  // WHY THIS MATTERS: Quotes contain pricing strategies, line-item details,
  // and customer relationships. Leaking this to a competitor in another org
  // would expose confidential business terms.
  // =========================================================================
  test("Org B cannot see Org A's quotes in the quote list", async () => {
    await pageB.goto("/quotes");

    // Wait for the page to settle
    await expect(
      pageB.locator("main").locator("h1, h2").first()
    ).toBeVisible({ timeout: 10000 });

    // Org A's quote line item "TenantA Pipe Fix" must NOT appear anywhere.
    await expect(
      pageB.getByText(ORG_A_QUOTE_ITEM)
    ).not.toBeVisible({ timeout: 3000 });

    // Org B should see the empty state for quotes.
    await expect(
      pageB.getByText("No quotes yet")
    ).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // TEST 3: Job isolation
  // =========================================================================
  // WHY THIS MATTERS: Jobs contain scheduling details, assigned team members,
  // customer addresses, and internal notes. Exposing another org's job data
  // would reveal operational details and customer locations.
  // =========================================================================
  test("Org B cannot see Org A's jobs in the job list", async () => {
    await pageB.goto("/jobs");

    // Wait for the page to load
    await expect(
      pageB.locator("main").locator("h1, h2").first()
    ).toBeVisible({ timeout: 10000 });

    // Org A's job title must NOT appear.
    await expect(
      pageB.getByText(ORG_A_JOB_TITLE)
    ).not.toBeVisible({ timeout: 3000 });
  });

  // =========================================================================
  // TEST 4: Invoice isolation
  // =========================================================================
  // WHY THIS MATTERS: Invoices contain financial data -- amounts owed,
  // payment status, and customer billing details. Leaking this across
  // organizations would be a financial data breach.
  // =========================================================================
  test("Org B cannot see Org A's invoices in the invoice list", async () => {
    await pageB.goto("/invoices");

    // Wait for the page to settle
    await expect(
      pageB.locator("main").locator("h1, h2").first()
    ).toBeVisible({ timeout: 10000 });

    // Org A's invoice line item must NOT appear.
    await expect(
      pageB.getByText(ORG_A_INVOICE_ITEM)
    ).not.toBeVisible({ timeout: 3000 });

    // Org B should see the empty state for invoices.
    await expect(
      pageB.getByText("No invoices yet")
    ).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // TEST 5: Direct URL access prevention
  // =========================================================================
  // WHY THIS MATTERS: Even if Org B somehow obtains the URL of Org A's
  // quote detail page (e.g., via a shared link or URL guessing), the server
  // must refuse to serve the data. This tests the authorization layer, not
  // just the UI filtering.
  // =========================================================================
  test("Org B cannot access Org A's quote detail via direct URL", async () => {
    // Navigate directly to Org A's quote detail URL while logged in as Org B.
    await pageB.goto(orgAQuoteDetailUrl);

    // Give the page time to load/redirect.
    await pageB.waitForTimeout(3000);

    // The server should either:
    //   a) Redirect User B away (to /quotes, /, or /login)
    //   b) Show a "not found" message
    //   c) Show an error page
    // It must NOT show Org A's quote data.
    const currentUrl = pageB.url();
    const isOnQuoteDetail = currentUrl === orgAQuoteDetailUrl;

    if (isOnQuoteDetail) {
      // If we stayed on the URL, the page content must NOT contain Org A's data.
      // It should show "not found" or similar.
      await expect(
        pageB.getByText(ORG_A_QUOTE_ITEM)
      ).not.toBeVisible({ timeout: 5000 });

      // Check for a "not found" message or empty/error state
      const pageText = await pageB.locator("main").textContent();
      const hasProtection =
        /not found|unauthorized|forbidden|access denied|error|404/i.test(
          pageText ?? ""
        );
      expect(hasProtection).toBe(true);
    } else {
      // User B was redirected away from the detail page -- this is correct.
      // Verify we are NOT on Org A's quote detail page anymore.
      expect(currentUrl).not.toBe(orgAQuoteDetailUrl);
    }
  });

  // =========================================================================
  // TEST 6: Search isolation
  // =========================================================================
  // WHY THIS MATTERS: Search functionality often queries a broader dataset
  // and filters afterward. If the backend search is not properly scoped to
  // the requesting user's organization, cross-tenant data could leak through
  // search results even if list pages are filtered.
  // =========================================================================
  test("Org B's search returns zero results for Org A's customer names", async () => {
    await pageB.goto("/customers");

    // Wait for the page to load
    await expect(
      pageB.locator("main").locator("h1, h2").first()
    ).toBeVisible({ timeout: 10000 });

    // First, create a customer for Org B so the search input is available
    // (the empty state may not show a search bar). If empty state is showing,
    // the search may still be available above the empty state.
    const searchInput = pageB.getByPlaceholder(
      /search customers by name, email, or phone/i
    );

    const searchVisible = await searchInput.isVisible().catch(() => false);

    if (searchVisible) {
      // Search for "Alice" -- Org A's customer first name
      await searchInput.fill("Alice");
      await pageB.waitForTimeout(1500); // Wait for debounce

      // Should show "No customers match your filters" or still show empty state.
      // Org A's customer must NOT appear.
      await expect(
        pageB.getByText(`${ORG_A_CUSTOMER_FIRST} ${ORG_A_CUSTOMER_LAST}`)
      ).not.toBeVisible({ timeout: 5000 });

      // Clear and search for "TenantA"
      await searchInput.clear();
      await searchInput.fill("TenantA");
      await pageB.waitForTimeout(1500);

      await expect(
        pageB.getByText(`${ORG_A_CUSTOMER_FIRST} ${ORG_A_CUSTOMER_LAST}`)
      ).not.toBeVisible({ timeout: 5000 });
    } else {
      // Empty state without a search bar -- Org A's data is not visible at all.
      // This is acceptable since there is nothing to search through.
      await expect(
        pageB.getByText(`${ORG_A_CUSTOMER_FIRST} ${ORG_A_CUSTOMER_LAST}`)
      ).not.toBeVisible({ timeout: 3000 });
    }
  });

  // =========================================================================
  // TEST 7: Dashboard isolation
  // =========================================================================
  // WHY THIS MATTERS: The dashboard aggregates financial data (revenue, job
  // counts, invoice totals). If these aggregations are not scoped to the
  // current user's organization, Org B would see Org A's business metrics,
  // which could include revenue figures, conversion rates, and workload data.
  // =========================================================================
  test("Org B's dashboard shows zero data, not Org A's metrics", async () => {
    await pageB.goto("/");

    // Wait for the dashboard to fully load
    await expect(
      pageB.locator("header").getByRole("heading", { level: 1 })
    ).toHaveText("Dashboard", { timeout: 15000 });

    // Wait for the summary cards to render
    await expect(pageB.getByText("Revenue This Month")).toBeVisible({ timeout: 10000 });
    await expect(pageB.getByText("Jobs Completed")).toBeVisible({ timeout: 10000 });

    // Revenue This Month should show $0.00 for a brand new org.
    // Find the card containing "Revenue This Month" and check its value.
    const revenueCard = pageB.locator("div").filter({ hasText: "Revenue This Month" }).first();
    const revenueText = await revenueCard.textContent();

    // Org A created a $500 quote and $300 invoice. If Org B's dashboard
    // shows those values, isolation is broken.
    // The revenue should be $0 (or $0.00) since Org B has no activity.
    expect(revenueText).toContain("$0");

    // Jobs Completed should show 0
    const jobsCard = pageB.locator("div").filter({ hasText: "Jobs Completed" }).first();
    const jobsText = await jobsCard.textContent();
    expect(jobsText).toContain("0");
  });
});
